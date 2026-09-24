import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import * as shopify from "./shopify";
import * as tokenStore from "./tokenStore";
import type { ShopifyProduct, StoreAuditSummary } from "./src/types";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || "";
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || "";
const SHOPIFY_SCOPES =
  process.env.SCOPES || "read_products,write_files";

// Shopify's limit on media alt text length.
const MAX_ALT_LENGTH = 512;
// Largest number of alt text updates accepted in one save request.
const MAX_ALT_UPDATES = 250;

// Allow Shopify admin to load this app in an iframe (required for an
// embedded app — without this the browser refuses to render us inside
// admin.shopify.com at all).
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors https://*.myshopify.com https://admin.shopify.com;"
  );
  next();
});

// ----------------------------------------------------
// WEBHOOKS
// ----------------------------------------------------
// Registered before the JSON body parser: the HMAC check needs the raw body.
// Subscriptions live in shopify.app.image-alt-fix.toml, including the three
// mandatory privacy compliance topics.
app.post("/api/webhooks", express.raw({ type: "*/*", limit: "5mb" }), (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
  const hmac = req.get("X-Shopify-Hmac-Sha256");
  if (!SHOPIFY_API_SECRET || !shopify.verifyWebhookHmac(rawBody, hmac, SHOPIFY_API_SECRET)) {
    res.status(401).send("Invalid webhook signature.");
    return;
  }

  const topic = req.get("X-Shopify-Topic") || "";
  const shop = req.get("X-Shopify-Shop-Domain") || "";

  switch (topic) {
    case "app/uninstalled":
    case "shop/redact":
      if (shopify.isValidShopDomain(shop)) shopify.forgetShop(shop);
      break;
    case "customers/data_request":
    case "customers/redact":
      // This app stores no customer data, so there is nothing to return or erase.
      break;
    default:
      break;
  }

  res.status(200).send("OK");
});

app.use(express.json({ limit: "1mb" }));

// Resolves the requesting shop from the App Bridge ID token into res.locals
// before any /api/* route runs. Every API route requires it.
app.use("/api", (req, res, next) => {
  const auth = resolveShopForRequest(req);
  if (!auth) {
    res.status(401).json({
      error: "not_authenticated",
      message: "Open this app from your Shopify admin to load your store.",
    });
    return;
  }
  res.locals.shop = auth.shop;
  res.locals.idToken = auth.idToken;
  next();
});

// Verifies the App Bridge ID token (Authorization: Bearer ...). This is the
// app's only way of identifying a shop: it works without third-party cookies
// or local storage, including in incognito windows.
function resolveShopForRequest(req: express.Request): { shop: string; idToken: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ") || !SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) return null;
  const idToken = authHeader.slice("Bearer ".length);
  const shop = shopify.verifyIdToken(idToken, SHOPIFY_API_KEY, SHOPIFY_API_SECRET);
  return shop ? { shop, idToken } : null;
}

// Returns the shop's Admin API access token from the database. When there is
// none, or it lacks a scope the app now requires, the request's ID token is
// exchanged for a fresh one, which also covers reinstalls.
async function getAccessToken(shop: string, idToken: string): Promise<string> {
  const stored = tokenStore.getToken(shop);
  if (stored && tokenStore.hasScopes(stored.scope, SHOPIFY_SCOPES)) return stored.accessToken;

  const { accessToken, scope } = await shopify.exchangeIdTokenForAccessToken(
    shop,
    idToken,
    SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET
  );
  tokenStore.saveToken(shop, accessToken, scope);
  if (!tokenStore.hasScopes(scope, SHOPIFY_SCOPES)) {
    console.warn(
      `Access token for ${shop} grants "${scope}" but SCOPES requires "${SHOPIFY_SCOPES}". ` +
        "Make SCOPES match access_scopes in the app config."
    );
  }
  return accessToken;
}

// Runs an Admin API call for the request's shop. If Shopify rejects the
// stored token (for example after it was revoked), the token is dropped and
// the call is retried once with a freshly exchanged one.
async function withAdmin<T>(
  res: express.Response,
  call: (shop: string, token: string) => Promise<T>
): Promise<T> {
  const shop = res.locals.shop as string;
  const idToken = res.locals.idToken as string;
  const token = await getAccessToken(shop, idToken);
  try {
    return await call(shop, token);
  } catch (err) {
    if (!(err instanceof shopify.ShopifyAuthError)) throw err;
    tokenStore.deleteToken(shop);
    const fresh = await getAccessToken(shop, idToken);
    return call(shop, fresh);
  }
}

function sendApiError(res: express.Response, err: unknown, context: string) {
  console.error(`${context}:`, err);
  if (err instanceof shopify.ShopifyAuthError) {
    res.status(401).json({ error: "not_authenticated", message: err.message });
    return;
  }
  res.status(502).json({
    error: "shopify_error",
    message: "Shopify could not complete the request. Please try again.",
  });
}

// Helper to calculate product and store scores
function computeProductScores(prod: ShopifyProduct) {
  if (prod.images.length === 0) {
    prod.overallSeoScore = 20;
    prod.overallGeoScore = 15;
    return;
  }
  const avgSeo = Math.round(
    prod.images.reduce((acc, img) => acc + img.seoScore, 0) / prod.images.length
  );
  const avgGeo = Math.round(
    prod.images.reduce((acc, img) => acc + img.geoScore, 0) / prod.images.length
  );

  // Variant gap penalty: check if variants have images
  const variantGaps = prod.variants.filter((v) => !v.imageId).length;
  const variantPenalty = Math.min(25, variantGaps * 8);

  prod.overallSeoScore = Math.max(10, Math.min(100, avgSeo - Math.floor(variantPenalty / 2)));
  prod.overallGeoScore = Math.max(10, Math.min(100, avgGeo - Math.floor(variantPenalty / 2)));
}

function computeStoreSummary(productList: ShopifyProduct[]): StoreAuditSummary {
  let totalImages = 0;
  let missingAlt = 0;
  let weakFilename = 0;
  let unassignedVariantGaps = 0;
  let jsonLdIssues = 0;
  let missingTranslations = 0;
  let seoSum = 0;
  let geoSum = 0;

  for (const p of productList) {
    computeProductScores(p);
    seoSum += p.overallSeoScore;
    geoSum += p.overallGeoScore;
    totalImages += p.images.length;

    for (const img of p.images) {
      if (!img.altText || img.altText.trim().length === 0) missingAlt++;
      else if (img.altText.split(" ").length < 3) missingAlt++;

      if (
        img.filename.toLowerCase().startsWith("img_") ||
        img.filename.toLowerCase().startsWith("dsc") ||
        img.filename.toLowerCase().includes("final") ||
        img.filename.toLowerCase().includes("raw")
      ) {
        weakFilename++;
      }

      if (!img.translations.es || !img.translations.fr) {
        missingTranslations++;
      }
    }

    for (const v of p.variants) {
      if (!v.imageId) unassignedVariantGaps++;
    }

    if (!p.jsonLd || p.jsonLd.image.length < p.images.length) {
      jsonLdIssues++;
    }
  }

  const currentSeo = productList.length ? Math.round(seoSum / productList.length) : 0;
  const currentGeo = productList.length ? Math.round(geoSum / productList.length) : 0;

  return {
    totalProducts: productList.length,
    totalImages,
    averageSeoScore: currentSeo,
    averageGeoScore: currentGeo,
    missingAltCount: missingAlt,
    weakFilenameCount: weakFilename,
    unassignedVariantGaps,
    jsonLdIssuesCount: jsonLdIssues,
    missingTranslationsCount: missingTranslations,
    lastStoreAudit: new Date().toISOString(),
  };
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Store products list & store audit summary. Always re-read from Shopify
// so edits made in the Shopify admin show up on the next load.
app.get("/api/products", async (req, res) => {
  try {
    const productList = await withAdmin(res, (shop, token) =>
      shopify.fetchShopProducts(shop, token)
    );
    for (const p of productList) computeProductScores(p);
    shopify.shopProducts.set(res.locals.shop, productList);
    res.json({ products: productList, summary: computeStoreSummary(productList) });
  } catch (err) {
    sendApiError(res, err, "Failed to load products");
  }
});

// 2. Single product details, from the last catalog load
app.get("/api/products/:id", (req, res) => {
  const product = (shopify.shopProducts.get(res.locals.shop) ?? []).find(
    (p) => p.id === req.params.id
  );
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  computeProductScores(product);
  res.json(product);
});

// 3. Save ALT text to Shopify for one or more images. Body:
// { updates: [{ imageId, altText }] }. Responds with the images Shopify
// confirmed and the ones it rejected, so the UI can show both.
app.post("/api/images/alt", async (req, res) => {
  const raw = req.body?.updates;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_ALT_UPDATES) {
    res.status(400).json({
      error: "invalid_request",
      message: `Send between 1 and ${MAX_ALT_UPDATES} updates.`,
    });
    return;
  }

  const updates: { imageId: string; altText: string }[] = [];
  for (const u of raw) {
    if (
      typeof u?.imageId !== "string" ||
      !u.imageId.startsWith("gid://shopify/MediaImage/") ||
      typeof u?.altText !== "string"
    ) {
      res.status(400).json({ error: "invalid_request", message: "Each update needs an image ID and ALT text." });
      return;
    }
    const altText = u.altText.trim();
    if (altText.length > MAX_ALT_LENGTH) {
      res.status(400).json({
        error: "invalid_request",
        message: `ALT text can be at most ${MAX_ALT_LENGTH} characters.`,
      });
      return;
    }
    updates.push({ imageId: u.imageId, altText });
  }

  try {
    const result = await withAdmin(res, (shop, token) =>
      shopify.updateImageAlts(shop, token, updates)
    );

    // Keep the cached catalog in line with what Shopify confirmed.
    const saved = new Map(result.updated.map((u) => [u.imageId, u.altText]));
    for (const product of shopify.shopProducts.get(res.locals.shop) ?? []) {
      for (const img of product.images) {
        if (saved.has(img.id)) {
          img.altText = saved.get(img.id)!;
          img.translations.en = img.altText;
        }
      }
    }

    res.json(result);
  } catch (err) {
    sendApiError(res, err, "Failed to save ALT text");
  }
});

// 4. Dashboard banners, managed by the app owner in banners.json at the
// project root. The file is re-read on every request, so banners can be
// added, changed or removed without restarting. Invalid entries and banners
// outside their startsAt/endsAt window are skipped.
const BANNERS_FILE = path.join(process.cwd(), "banners.json");
const BANNER_TONES = new Set(["info", "success", "warning", "critical", "promo"]);

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

app.get("/api/banners", async (_req, res) => {
  let raw: unknown;
  try {
    raw = JSON.parse(await fs.readFile(BANNERS_FILE, "utf8"));
  } catch (err: any) {
    if (err?.code !== "ENOENT") console.error("Could not read banners.json:", err);
    res.json({ banners: [] });
    return;
  }

  const now = Date.now();
  const banners = (Array.isArray(raw) ? raw : [])
    .filter((b: any) => {
      if (!b || typeof b.id !== "string" || typeof b.title !== "string") return false;
      if (b.startsAt && !(Date.parse(b.startsAt) <= now)) return false;
      if (b.endsAt && !(Date.parse(b.endsAt) > now)) return false;
      return true;
    })
    .map((b: any) => ({
      id: b.id,
      tone: BANNER_TONES.has(b.tone) ? b.tone : "info",
      title: b.title,
      message: typeof b.message === "string" ? b.message : "",
      imageUrl: isHttpsUrl(b.imageUrl) ? b.imageUrl : null,
      action:
        b.action && typeof b.action.label === "string" && isHttpsUrl(b.action.url)
          ? { label: b.action.label, url: b.action.url }
          : null,
      dismissible: b.dismissible !== false,
    }));

  res.json({ banners });
});

// 5. Connected shop info, for nav branding
app.get("/api/shop", async (req, res) => {
  const shop = res.locals.shop as string;
  try {
    let info = shopify.shopInfo.get(shop);
    if (!info) {
      info = await withAdmin(res, (s, token) => shopify.fetchShopInfo(s, token));
      shopify.shopInfo.set(shop, info);
    }
    res.json({ connected: true, shopName: info.name, shopDomain: info.domain });
  } catch (err) {
    sendApiError(res, err, "Failed to load shop info");
  }
});

// Vite middleware / production static handler
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Image Alt Fix server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
