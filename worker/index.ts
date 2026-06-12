import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { calculate } from "../shared/calc";
import type { CalcData } from "../shared/types";
import { hashPassword, verifyPassword, randomHex } from "./auth";

type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  BILDER: R2Bucket;
};

type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: "admin" | "user";
};

type AppContext = {
  Bindings: Env;
  Variables: { user: SessionUser };
};

const SESSION_DAYS = 30;
const COOKIE = "sk_session";

const app = new Hono<AppContext>().basePath("/api");

// ---------- Auth ----------

app.post("/auth/login", async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();
  if (!email || !password) return c.json({ error: "E-Mail und Passwort erforderlich" }, 400);

  const user = await c.env.DB.prepare(
    "SELECT id, email, name, role, password_hash, salt FROM users WHERE lower(email) = lower(?) AND active = 1"
  )
    .bind(email.trim())
    .first<{ id: number; email: string; name: string; role: string; password_hash: string; salt: string }>();

  if (!user || !(await verifyPassword(password, user.salt, user.password_hash))) {
    return c.json({ error: "E-Mail oder Passwort falsch" }, 401);
  }

  const token = randomHex(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await c.env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, user.id, expires.toISOString())
    .run();

  setCookie(c, COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    expires,
  });

  return c.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

app.post("/auth/logout", async (c) => {
  const token = getCookie(c, COOKIE);
  if (token) await c.env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  deleteCookie(c, COOKIE, { path: "/" });
  return c.json({ ok: true });
});

// Produktbilder aus R2 (Bucket "sickinger") – öffentlich, vor der Auth-Middleware.
// Erwartete Dateinamen: laufrad / drueckteile / baugruppe / schallkabine / ventilator + .jpg/.jpeg/.png/.webp
app.get("/typen", async (c) => {
  const list = await c.env.BILDER.list();
  return c.json(list.objects.map((o) => o.key));
});

// Alias-Zuordnung für die hochgeladenen Screenshot-Dateien;
// Dateien mit dem richtigen Typnamen (z. B. laufrad.jpg) haben Vorrang.
const BILD_ALIAS: Record<string, string[]> = {
  ventilator: ["ventilator", "Screenshot_1"],
  baugruppe: ["baugruppe", "Screenshot_2"],
  drueckteile: ["drueckteile", "Screenshot_3"],
  laufrad: ["laufrad", "Screenshot_19"],
  schallkabine: ["schallkabine"],
};

app.get("/typen/:type", async (c) => {
  const t = c.req.param("type").replace(/[^\w-]/g, "");
  for (const name of BILD_ALIAS[t] ?? [t]) {
    for (const ext of ["jpg", "jpeg", "png", "webp"]) {
      const obj = await c.env.BILDER.get(`${name}.${ext}`);
      if (obj) {
        return new Response(obj.body as ReadableStream, {
          headers: {
            "Content-Type": obj.httpMetadata?.contentType ?? (ext === "jpg" ? "image/jpeg" : `image/${ext}`),
            "Cache-Control": "public, max-age=600",
          },
        });
      }
    }
  }
  return c.json({ error: "Nicht gefunden" }, 404);
});

// Auth-Middleware für alles Weitere
app.use("*", async (c, next) => {
  const token = getCookie(c, COOKIE);
  if (!token) return c.json({ error: "Nicht angemeldet" }, 401);
  const row = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.role FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > datetime('now') AND u.active = 1`
  )
    .bind(token)
    .first<SessionUser>();
  if (!row) return c.json({ error: "Sitzung abgelaufen" }, 401);
  c.set("user", row);
  await next();
});

const requireAdmin = async (c: any, next: any) => {
  if (c.get("user").role !== "admin") return c.json({ error: "Nur für Administratoren" }, 403);
  await next();
};

app.get("/auth/me", (c) => c.json(c.get("user")));

app.post("/auth/change-password", async (c) => {
  const { oldPassword, newPassword } = await c.req.json<{ oldPassword: string; newPassword: string }>();
  if (!newPassword || newPassword.length < 8) {
    return c.json({ error: "Neues Passwort muss mindestens 8 Zeichen haben" }, 400);
  }
  const me = c.get("user");
  const row = await c.env.DB.prepare("SELECT password_hash, salt FROM users WHERE id = ?")
    .bind(me.id)
    .first<{ password_hash: string; salt: string }>();
  if (!row || !(await verifyPassword(oldPassword, row.salt, row.password_hash))) {
    return c.json({ error: "Aktuelles Passwort ist falsch" }, 400);
  }
  const salt = randomHex(16);
  const hash = await hashPassword(newPassword, salt);
  await c.env.DB.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?").bind(hash, salt, me.id).run();
  return c.json({ ok: true });
});

// ---------- Benutzer (Admin) ----------

app.get("/users", requireAdmin, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, email, name, role, active, created_at FROM users ORDER BY name"
  ).all();
  return c.json(results);
});

app.post("/users", requireAdmin, async (c) => {
  const { email, name, role, password } = await c.req.json();
  if (!email || !name || !password || password.length < 8) {
    return c.json({ error: "E-Mail, Name und Passwort (min. 8 Zeichen) erforderlich" }, 400);
  }
  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);
  try {
    const res = await c.env.DB.prepare(
      "INSERT INTO users (email, name, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(email.trim().toLowerCase(), name, hash, salt, role === "admin" ? "admin" : "user")
      .run();
    return c.json({ id: res.meta.last_row_id });
  } catch {
    return c.json({ error: "E-Mail existiert bereits" }, 400);
  }
});

app.put("/users/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const { name, role, active, password } = await c.req.json();
  const me = c.get("user");
  if (id === me.id && active === 0) return c.json({ error: "Eigenes Konto kann nicht deaktiviert werden" }, 400);
  await c.env.DB.prepare("UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?")
    .bind(name, role === "admin" ? "admin" : "user", active ? 1 : 0, id)
    .run();
  if (password) {
    if (password.length < 8) return c.json({ error: "Passwort muss mindestens 8 Zeichen haben" }, 400);
    const salt = randomHex(16);
    const hash = await hashPassword(password, salt);
    await c.env.DB.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?").bind(hash, salt, id).run();
    await c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
  }
  return c.json({ ok: true });
});

// ---------- Stammdaten: generische CRUD-Helfer ----------

type ColumnSpec = { name: string; numeric?: boolean };

function crud(table: string, columns: ColumnSpec[], orderBy: string) {
  app.get(`/${table}`, async (c) => {
    const { results } = await c.env.DB.prepare(`SELECT * FROM ${table} ORDER BY ${orderBy}`).all();
    return c.json(results);
  });

  app.post(`/${table}`, async (c) => {
    const body = await c.req.json();
    const names = columns.map((col) => col.name);
    const values = columns.map((col) => (col.numeric ? Number(body[col.name]) || 0 : (body[col.name] ?? "") + ""));
    const res = await c.env.DB.prepare(
      `INSERT INTO ${table} (${names.join(",")}) VALUES (${names.map(() => "?").join(",")})`
    )
      .bind(...values)
      .run();
    return c.json({ id: res.meta.last_row_id });
  });

  app.put(`/${table}/:id`, async (c) => {
    const body = await c.req.json();
    const values = columns.map((col) => (col.numeric ? Number(body[col.name]) || 0 : (body[col.name] ?? "") + ""));
    await c.env.DB.prepare(`UPDATE ${table} SET ${columns.map((col) => `${col.name} = ?`).join(",")} WHERE id = ?`)
      .bind(...values, Number(c.req.param("id")))
      .run();
    return c.json({ ok: true });
  });

  app.delete(`/${table}/:id`, async (c) => {
    await c.env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(Number(c.req.param("id"))).run();
    return c.json({ ok: true });
  });
}

// Materialien: eigene Routen, damit price_updated_at bei Preisänderung
// automatisch gesetzt wird (Grundlage für die Veraltet-Warnung im Editor)
app.get("/materials", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM materials ORDER BY sort, name").all();
  return c.json(results);
});

app.post("/materials", async (c) => {
  const b = await c.req.json();
  const price = Number(b.price_per_kg) || 0;
  const res = await c.env.DB.prepare(
    `INSERT INTO materials (name, price_per_kg, density, color_group, note, sort, active, price_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      (b.name ?? "") + "",
      price,
      Number(b.density) || 0,
      (b.color_group ?? "") + "",
      (b.note ?? "") + "",
      Number(b.sort) || 0,
      b.active === 0 ? 0 : 1,
      price > 0 ? new Date().toISOString() : null
    )
    .run();
  return c.json({ id: res.meta.last_row_id });
});

app.put("/materials/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const b = await c.req.json();
  const price = Number(b.price_per_kg) || 0;
  const old = await c.env.DB.prepare("SELECT price_per_kg, price_updated_at FROM materials WHERE id = ?")
    .bind(id)
    .first<{ price_per_kg: number; price_updated_at: string | null }>();
  const priceChanged = !old || old.price_per_kg !== price;
  const updatedAt = price > 0 ? (priceChanged ? new Date().toISOString() : old?.price_updated_at ?? null) : null;
  await c.env.DB.prepare(
    `UPDATE materials SET name = ?, price_per_kg = ?, density = ?, color_group = ?, note = ?, sort = ?, active = ?,
     price_updated_at = ? WHERE id = ?`
  )
    .bind(
      (b.name ?? "") + "",
      price,
      Number(b.density) || 0,
      (b.color_group ?? "") + "",
      (b.note ?? "") + "",
      Number(b.sort) || 0,
      b.active === 0 ? 0 : 1,
      updatedAt,
      id
    )
    .run();
  return c.json({ ok: true });
});

app.delete("/materials/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM materials WHERE id = ?").bind(Number(c.req.param("id"))).run();
  return c.json({ ok: true });
});

crud(
  "step_templates",
  [
    { name: "calc_type" },
    { name: "pos", numeric: true },
    { name: "name" },
    { name: "rate", numeric: true },
    { name: "setup_min", numeric: true },
    { name: "grp" },
  ],
  "calc_type, pos"
);

crud(
  "material_presets",
  [
    { name: "calc_type" },
    { name: "pos", numeric: true },
    { name: "name" },
    { name: "comment" },
    { name: "supplier" },
    { name: "unit_price", numeric: true },
    { name: "grp" },
  ],
  "calc_type, pos, name"
);

crud(
  "shipping_items",
  [
    { name: "category" },
    { name: "name" },
    { name: "dimensions" },
    { name: "shipping_price", numeric: true },
    { name: "packaging_price", numeric: true },
    { name: "note" },
    { name: "sort", numeric: true },
  ],
  "category, sort"
);

crud(
  "customers",
  [
    { name: "name" },
    { name: "contact" },
    { name: "email" },
    { name: "phone" },
    { name: "special_terms" },
    { name: "notes" },
  ],
  "name"
);

crud(
  "suppliers",
  [{ name: "name" }, { name: "contact" }, { name: "email" }, { name: "phone" }, { name: "notes" }],
  "name"
);

crud("sachbearbeiter", [{ name: "name" }, { name: "kuerzel" }], "name");

// ---------- Kalkulationen ----------

async function loadDensities(db: D1Database): Promise<Record<string, number>> {
  const { results } = await db.prepare("SELECT name, density FROM materials").all<{ name: string; density: number }>();
  const map: Record<string, number> = {};
  for (const r of results) map[r.name] = r.density;
  return map;
}

app.get("/calculations", async (c) => {
  const type = c.req.query("type");
  const status = c.req.query("status");
  const q = c.req.query("q");
  const where: string[] = [];
  const binds: unknown[] = [];
  if (type) {
    where.push("calc_type = ?");
    binds.push(type);
  }
  if (status) {
    where.push("status = ?");
    binds.push(status);
  }
  if (q) {
    where.push("(title LIKE ? OR customer_name LIKE ? OR inquiry_no LIKE ? OR drawing_no LIKE ?)");
    const like = `%${q}%`;
    binds.push(like, like, like, like);
  }
  const sql = `
    SELECT c.id, c.calc_type, c.title, c.version, c.parent_id, c.status, c.customer_name,
           c.inquiry_no, c.drawing_no, c.calc_date, c.sachbearbeiter, c.manufacturing_cost, c.sales_total, c.sales_unit,
           c.updated_at, u.name AS created_by_name
    FROM calculations c LEFT JOIN users u ON u.id = c.created_by
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY c.updated_at DESC LIMIT 500`;
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json(results);
});

app.get("/calculations/:id", async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT c.*, u.name AS created_by_name FROM calculations c
     LEFT JOIN users u ON u.id = c.created_by WHERE c.id = ?`
  )
    .bind(Number(c.req.param("id")))
    .first<Record<string, unknown>>();
  if (!row) return c.json({ error: "Nicht gefunden" }, 404);
  row.data = JSON.parse(row.data as string);
  return c.json(row);
});

type CalcPayload = {
  calc_type: string;
  title: string;
  status: string;
  customer_id: number | null;
  customer_name: string;
  inquiry_no: string;
  drawing_no: string;
  calc_date: string;
  sachbearbeiter: string;
  offer_text: string;
  data: CalcData;
};

async function computeTotals(db: D1Database, data: CalcData) {
  const densities = await loadDensities(db);
  const r = calculate(data, densities);
  return r;
}

app.post("/calculations", async (c) => {
  const p = await c.req.json<CalcPayload>();
  const r = await computeTotals(c.env.DB, p.data);
  const res = await c.env.DB.prepare(
    `INSERT INTO calculations
     (calc_type, title, status, customer_id, customer_name, inquiry_no, drawing_no, calc_date, sachbearbeiter, data, offer_text,
      material_sum, prod_sum, ext_sum, ship_sum, manufacturing_cost, profit, sales_total, sales_unit, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      p.calc_type,
      p.title || "",
      p.status || "entwurf",
      p.customer_id ?? null,
      p.customer_name || "",
      p.inquiry_no || "",
      p.drawing_no || "",
      p.calc_date || new Date().toISOString().slice(0, 10),
      p.sachbearbeiter || "",
      JSON.stringify(p.data),
      p.offer_text || "",
      r.materialSum,
      r.prodSum,
      r.extSum,
      r.shipSum,
      r.manufacturingCost,
      r.profit,
      r.salesTotal,
      r.salesPerUnit,
      c.get("user").id
    )
    .run();
  return c.json({ id: res.meta.last_row_id });
});

app.put("/calculations/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const p = await c.req.json<CalcPayload>();
  const r = await computeTotals(c.env.DB, p.data);
  await c.env.DB.prepare(
    `UPDATE calculations SET
     title = ?, status = ?, customer_id = ?, customer_name = ?, inquiry_no = ?, drawing_no = ?, calc_date = ?,
     sachbearbeiter = ?, data = ?, offer_text = ?, material_sum = ?, prod_sum = ?, ext_sum = ?, ship_sum = ?,
     manufacturing_cost = ?, profit = ?, sales_total = ?, sales_unit = ?, updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(
      p.title || "",
      p.status || "entwurf",
      p.customer_id ?? null,
      p.customer_name || "",
      p.inquiry_no || "",
      p.drawing_no || "",
      p.calc_date || new Date().toISOString().slice(0, 10),
      p.sachbearbeiter || "",
      JSON.stringify(p.data),
      p.offer_text || "",
      r.materialSum,
      r.prodSum,
      r.extSum,
      r.shipSum,
      r.manufacturingCost,
      r.profit,
      r.salesTotal,
      r.salesPerUnit,
      id
    )
    .run();
  return c.json({ ok: true });
});

// Neue Version: Kopie mit version = max + 1 innerhalb der Versionsfamilie
app.post("/calculations/:id/copy", async (c) => {
  const id = Number(c.req.param("id"));
  const orig = await c.env.DB.prepare("SELECT * FROM calculations WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();
  if (!orig) return c.json({ error: "Nicht gefunden" }, 404);
  const rootId = (orig.parent_id as number | null) ?? (orig.id as number);
  const maxRow = await c.env.DB.prepare(
    "SELECT MAX(version) AS v FROM calculations WHERE id = ? OR parent_id = ?"
  )
    .bind(rootId, rootId)
    .first<{ v: number }>();
  const nextVersion = (maxRow?.v ?? 1) + 1;
  const res = await c.env.DB.prepare(
    `INSERT INTO calculations
     (calc_type, title, version, parent_id, status, customer_id, customer_name, inquiry_no, drawing_no, calc_date,
      sachbearbeiter, data, offer_text, material_sum, prod_sum, ext_sum, ship_sum, manufacturing_cost, profit, sales_total, sales_unit, created_by)
     SELECT calc_type, title, ?, ?, 'entwurf', customer_id, customer_name, inquiry_no, drawing_no, date('now'),
      sachbearbeiter, data, offer_text, material_sum, prod_sum, ext_sum, ship_sum, manufacturing_cost, profit, sales_total, sales_unit, ?
     FROM calculations WHERE id = ?`
  )
    .bind(nextVersion, rootId, c.get("user").id, id)
    .run();
  return c.json({ id: res.meta.last_row_id, version: nextVersion });
});

app.delete("/calculations/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const me = c.get("user");
  const row = await c.env.DB.prepare("SELECT created_by FROM calculations WHERE id = ?")
    .bind(id)
    .first<{ created_by: number | null }>();
  if (!row) return c.json({ error: "Nicht gefunden" }, 404);
  if (me.role !== "admin" && row.created_by !== me.id) {
    return c.json({ error: "Nur eigene Kalkulationen können gelöscht werden" }, 403);
  }
  await c.env.DB.prepare("DELETE FROM calculations WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

// Vorlagen für neue Kalkulation
app.get("/templates", async (c) => {
  const type = c.req.query("type") ?? "";
  const { results: steps } = await c.env.DB.prepare(
    "SELECT * FROM step_templates WHERE calc_type = ? ORDER BY pos"
  )
    .bind(type)
    .all();
  let presets: unknown[] = [];
  if (type === "schallkabine" || type === "ventilator") {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM material_presets WHERE calc_type = ? ORDER BY pos"
    )
      .bind(type)
      .all();
    presets = results;
  }
  return c.json({ steps, presets });
});

// ---------- Dashboard ----------

app.get("/dashboard", async (c) => {
  const db = c.env.DB;
  const [byStatus, byType, recent, sums] = await Promise.all([
    db.prepare("SELECT status, COUNT(*) AS count, SUM(sales_total) AS total FROM calculations GROUP BY status").all(),
    db.prepare("SELECT calc_type, COUNT(*) AS count FROM calculations GROUP BY calc_type").all(),
    db
      .prepare(
        `SELECT c.id, c.calc_type, c.title, c.version, c.status, c.customer_name, c.sales_total, c.updated_at,
                u.name AS created_by_name
         FROM calculations c LEFT JOIN users u ON u.id = c.created_by
         ORDER BY c.updated_at DESC LIMIT 8`
      )
      .all(),
    db
      .prepare(
        `SELECT COUNT(*) AS count, COALESCE(SUM(sales_total),0) AS sales, COALESCE(SUM(profit),0) AS profit,
                COALESCE(SUM(manufacturing_cost),0) AS cost
         FROM calculations`
      )
      .first(),
  ]);
  return c.json({
    byStatus: byStatus.results,
    byType: byType.results,
    recent: recent.results,
    sums,
  });
});

// ---------- Einstellungen ----------

app.get("/settings", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>();
  const map: Record<string, string> = {};
  for (const r of results) map[r.key] = r.value;
  return c.json(map);
});

app.put("/settings", requireAdmin, async (c) => {
  const body = await c.req.json<Record<string, string>>();
  const stmts = Object.entries(body).map(([k, v]) =>
    c.env.DB.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).bind(k, v + "")
  );
  if (stmts.length) await c.env.DB.batch(stmts);
  return c.json({ ok: true });
});

app.notFound((c) => c.json({ error: "Nicht gefunden" }, 404));

export default app;
