import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

// Persists each shop's offline Admin API access token in SQLite, so tokens
// survive restarts and deploys. Set DATABASE_PATH to a file on a persistent
// volume in production; the default is ./data/app.sqlite.
//
// A lost token is never fatal: the next request from the embedded app carries
// an ID token and the server exchanges it for a fresh access token.

export interface StoredToken {
  shop: string;
  accessToken: string;
  scope: string;
}

// On Vercel the filesystem is read-only apart from /tmp, which is per-instance
// and short-lived, so there the database only caches tokens between requests.
const DB_PATH =
  process.env.DATABASE_PATH ||
  (process.env.VERCEL ? "/tmp/app.sqlite" : path.join(process.cwd(), "data", "app.sqlite"));
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS shop_tokens (
    shop         TEXT PRIMARY KEY,
    access_token TEXT NOT NULL,
    scope        TEXT NOT NULL DEFAULT '',
    updated_at   TEXT NOT NULL
  );
`);

const selectStmt = db.prepare("SELECT shop, access_token, scope FROM shop_tokens WHERE shop = ?");
const upsertStmt = db.prepare(`
  INSERT INTO shop_tokens (shop, access_token, scope, updated_at) VALUES (?, ?, ?, ?)
  ON CONFLICT(shop) DO UPDATE SET
    access_token = excluded.access_token,
    scope = excluded.scope,
    updated_at = excluded.updated_at
`);
const deleteStmt = db.prepare("DELETE FROM shop_tokens WHERE shop = ?");

export function getToken(shop: string): StoredToken | null {
  const row = selectStmt.get(shop) as { shop: string; access_token: string; scope: string } | undefined;
  return row ? { shop: row.shop, accessToken: row.access_token, scope: row.scope } : null;
}

// Inserts or replaces the shop's token, so reinstalls simply overwrite.
export function saveToken(shop: string, accessToken: string, scope: string): void {
  upsertStmt.run(shop, accessToken, scope, new Date().toISOString());
}

export function deleteToken(shop: string): void {
  deleteStmt.run(shop);
}

// True when the granted scopes cover every required one. A write_ scope also
// grants the matching read_ scope.
export function hasScopes(granted: string, required: string): boolean {
  const have = new Set(granted.split(",").map((s) => s.trim()).filter(Boolean));
  return required
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .every((s) => have.has(s) || (s.startsWith("read_") && have.has(`write_${s.slice(5)}`)));
}
