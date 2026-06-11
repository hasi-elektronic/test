# Sickinger Kalkulationssystem

Modernes Web-Kalkulationssystem für Metallverarbeitung – ersetzt die Excel-Kalkulationen
für **Laufräder, Drückteile, Baugruppen und Schallkabinen**.

Läuft komplett auf **Cloudflare Workers** mit **D1-Datenbank** (SQLite), Deployment per GitHub Actions.

## Funktionen

- 🧮 **4 Kalkulationstypen** mit den Original-Formeln aus den Excel-Dateien:
  - **Laufrad / Drückteile / Baugruppe**: Material nach Kg (Breite × Höhe × Dicke × Dichte),
    Arbeitsgänge mit Rüst- und Fertigungszeit, externe Bearbeitung, Versandkosten, Gewinnzuschlag
  - **Schallkabine**: Zuschlagskalkulation – Material nach m²/Kg mit Verschnitt-Zuschlag,
    stundenbasierte Fertigung, Flächenberechnung
- ⚡ **Live-Berechnung** beim Tippen – Endpreis-Panel immer sichtbar
- 🗂️ **Stammdaten** in der Datenbank: Materialliste (Dichte, Preis/Kg), Arbeitsgänge mit
  Stundensätzen je Kalkulationstyp, Versand- & Verpackungspreise, Kunden (inkl.
  Sondervereinbarungen), Lieferanten
- 📄 **PDF-Angebot** mit anpassbarer Textvorlage (Drucken / Als PDF speichern)
- 📊 **Dashboard** mit Angebotsvolumen, Aufträgen und Gewinnmarge
- ⧉ **Versionierung**: Kalkulation kopieren → V2, V3, … – alte Versionen bleiben erhalten
- 👥 **Mehrbenutzer-Login** mit Rollen (Administrator / Benutzer)

## Erster Login

| | |
|---|---|
| **E-Mail** | `admin@sickinger.de` |
| **Passwort** | `Sickinger2026!` |

> ⚠️ **Nach dem ersten Login sofort das Passwort ändern** (Seitenleiste unten → „Passwort").

## Deployment (GitHub Actions → Cloudflare)

Jeder Push auf `main` deployt automatisch. Einmalige Einrichtung – ein Secret im
GitHub-Repository anlegen (**Settings → Secrets and variables → Actions**):

- **`CLOUDFLARE_API_TOKEN`** – Cloudflare Dashboard → My Profile → API Tokens →
  „Create Token" → Vorlage **„Edit Cloudflare Workers"** (benötigt zusätzlich
  D1-Berechtigung: *Account / D1 / Edit*)

Die App ist danach unter `https://sickinger-kalkulation.<dein-subdomain>.workers.dev` erreichbar.

## Datenbank

Die D1-Datenbank `sickinger-kalkulation` ist bereits angelegt, das Schema inklusive aller
Stammdaten aus den Excel-Dateien ist eingespielt (`migrations/0001_init.sql`).

Neu aufsetzen (falls nötig):

```bash
npx wrangler d1 execute sickinger-kalkulation --remote --file=migrations/0001_init.sql
```

## Lokale Entwicklung

```bash
npm install
npx wrangler d1 execute sickinger-kalkulation --local --file=migrations/0001_init.sql
npm run build && npx wrangler dev   # App auf http://localhost:8787
```

Für Frontend-Entwicklung mit Hot-Reload parallel `npm run dev` (Vite auf :5173, proxied /api auf :8787).

## Technik

| Schicht | Technologie |
|---|---|
| Frontend | React 18 + TypeScript + Tailwind CSS 4 (Vite) |
| API | Hono auf Cloudflare Workers |
| Datenbank | Cloudflare D1 (SQLite) |
| Auth | Session-Cookies (HttpOnly), PBKDF2-Passwort-Hashing |
| Kalkulations-Engine | `shared/calc.ts` – identischer Code im Worker und Frontend |

### Projektstruktur

```
worker/        API (Hono): Auth, Stammdaten-CRUD, Kalkulationen, Dashboard
shared/        Typen + Kalkulations-Engine (Excel-Formeln 1:1)
web/           React-Frontend (Login, Dashboard, Editor, Stammdaten, Angebot)
migrations/    D1-Schema + Stammdaten-Seed aus den Excel-Dateien
```
