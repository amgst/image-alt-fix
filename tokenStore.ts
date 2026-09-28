import fs from "fs";
import path from "path";
import type { DatabaseSync } from "node:sqlite";

// Persists each shop's offline Admin API access token in SQLite, so tokens
// survive restarts and deploys. Set DATABASE_PATH to a file on a persistent
// volume in production; the default is ./data/app.sqlite.
//
// A lost token is never fatal: the next request from the embedded app carries
// an ID token and the server exchanges it for a fresh access token. That is
// why the store falls back to memory when SQLite is unavailable.

export interface StoredToken {
  shop: string;
  accessToken: string;
  scope: string;
  // Epoch milliseconds. Shopify's expiring offline tokens last about an hour;
  // their refresh tokens about 90 days.
  expiresAt: number;
  refreshToken: string;
  refreshExpiresAt: number;
}

interface Backend {
  get(shop: string): StoredToken | null;
  getLegacy(shop: string): LegacyToken | null;
  save(token: StoredToken): void;
  remove(shop: string): void;
  removeLegacy(shop: string): void;
}

export interface LegacyToken {
  shop: string;
  accessToken: string;
  scope: string;
}

// On Vercel the filesystem is read-only apart from /tmp, which is per-instance
// and short-lived, so there the database only caches tokens between requests.
const DB_PATH =
  process.env.DATABASE_PATH ||
  (process.env.VERCEL ? "/tmp/app.sqlite" : path.join(process.cwd(), "data", "app.sqlite"));

function openSqlite(): Backend {
  // getBuiltinModule avoids a hard import, so Node versions without
  // node:sqlite fall back to memory instead of failing to start.
  const sqlite = (process as any).getBuiltinModule?.("node:sqlite") as
    | { DatabaseSync: typeof DatabaseSync }
    | undefined;
  if (!sqlite) throw new Error("node:sqlite is not available in this Node version");

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new sqlite.DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS offline_tokens (
      shop               TEXT PRIMARY KEY,
      access_token       TEXT NOT NULL,
      scope              TEXT NOT NULL DEFAULT '',
      expires_at         INTEGER NOT NULL,
      refresh_token      TEXT NOT NULL DEFAULT '',
      refresh_expires_at INTEGER NOT NULL DEFAULT 0,
      updated_at         TEXT NOT NULL
    );
  `);
  const select = db.prepare(
    "SELECT shop, access_token, scope, expires_at, refresh_token, refresh_expires_at FROM offline_tokens WHERE shop = ?"
  );
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?");
  const upsert = db.prepare(`
    INSERT INTO offline_tokens (shop, access_token, scope, expires_at, refresh_token, refresh_expires_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(shop) DO UPDATE SET
      access_token = excluded.access_token,
      scope = excluded.scope,
      expires_at = excluded.expires_at,
      refresh_token = excluded.refresh_token,
      refresh_expires_at = excluded.refresh_expires_at,
      updated_at = excluded.updated_at
  `);
  const del = db.prepare("DELETE FROM offline_tokens WHERE shop = ?");
  const legacySelectCache = new Map<string, ReturnType<typeof db.prepare> | null>();
  let legacyShopColumn = "shop";

  function legacySelect(): ReturnType<typeof db.prepare> | null {
    if (legacySelectCache.has("shop_tokens")) return legacySelectCache.get("shop_tokens") ?? null;
    if (!tables.get("shop_tokens")) {
      legacySelectCache.set("shop_tokens", null);
      return null;
    }

    const columns = db.prepare("PRAGMA table_info(shop_tokens)").all() as { name: string }[];
    const names = new Set(columns.map((c) => c.name));
    const shopColumn = names.has("shop") ? "shop" : names.has("shop_domain") ? "shop_domain" : "";
    const tokenColumn = names.has("access_token")
      ? "access_token"
      : names.has("accessToken")
        ? "accessToken"
        : "";
    const scopeColumn = names.has("scope") ? "scope" : names.has("scopes") ? "scopes" : "";
    if (!shopColumn || !tokenColumn) {
      legacySelectCache.set("shop_tokens", null);
      return null;
    }
    legacyShopColumn = shopColumn;

    const stmt = db.prepare(
      `SELECT ${shopColumn} AS shop, ${tokenColumn} AS access_token, ${
        scopeColumn ? `${scopeColumn} AS scope` : "'' AS scope"
      } FROM shop_tokens WHERE ${shopColumn} = ?`
    );
    legacySelectCache.set("shop_tokens", stmt);
    return stmt;
  }

  return {
    get(shop) {
      const row = select.get(shop) as
        | {
            shop: string;
            access_token: string;
            scope: string;
            expires_at: number;
            refresh_token: string;
            refresh_expires_at: number;
          }
        | undefined;
      return row
        ? {
            shop: row.shop,
            accessToken: row.access_token,
            scope: row.scope,
            expiresAt: Number(row.expires_at),
            refreshToken: row.refresh_token,
            refreshExpiresAt: Number(row.refresh_expires_at),
          }
        : null;
    },
    getLegacy(shop) {
      const stmt = legacySelect();
      if (!stmt) return null;
      const row = stmt.get(shop) as
        | { shop: string; access_token: string; scope: string }
        | undefined;
      return row
        ? { shop: row.shop, accessToken: row.access_token, scope: row.scope || "" }
        : null;
    },
    save(t) {
      upsert.run(
        t.shop,
        t.accessToken,
        t.scope,
        t.expiresAt,
        t.refreshToken,
        t.refreshExpiresAt,
        new Date().toISOString()
      );
    },
    remove(shop) {
      del.run(shop);
    },
    removeLegacy(shop) {
      if (legacySelect()) db.prepare(`DELETE FROM shop_tokens WHERE ${legacyShopColumn} = ?`).run(shop);
    },
  };
}

function memoryBackend(): Backend {
  const tokens = new Map<string, StoredToken>();
  return {
    get: (shop) => tokens.get(shop) ?? null,
    getLegacy: () => null,
    save: (t) => void tokens.set(t.shop, t),
    remove: (shop) => void tokens.delete(shop),
    removeLegacy: () => undefined,
  };
}

const backend: Backend = (() => {
  try {
    return openSqlite();
  } catch (err) {
    console.warn(`Token store: using memory instead of SQLite (${(err as Error).message}).`);
    return memoryBackend();
  }
})();

export function getToken(shop: string): StoredToken | null {
  return backend.get(shop);
}

export function getLegacyToken(shop: string): LegacyToken | null {
  return backend.getLegacy(shop);
}

// Inserts or replaces the shop's token pair, so reinstalls simply overwrite.
export function saveToken(token: StoredToken): void {
  backend.save(token);
}

export function deleteToken(shop: string): void {
  backend.remove(shop);
  backend.removeLegacy(shop);
}

export function deleteLegacyToken(shop: string): void {
  backend.removeLegacy(shop);
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
