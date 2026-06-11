// Passwort-Hashing (PBKDF2-SHA256) und Session-Verwaltung

const ITERATIONS = 100_000;

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function randomHex(byteLen: number): string {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations: ITERATIONS },
    key,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

export async function verifyPassword(password: string, saltHex: string, expectedHash: string): Promise<boolean> {
  const hash = await hashPassword(password, saltHex);
  return hash === expectedHash;
}
