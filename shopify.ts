import crypto from "crypto";
import type { ShopifyProduct, ShopifyProductImage, ShopifyProductVariant, ProductJsonLd } from "./src/types";

const ADMIN_API_VERSION = "2026-10";

export const SHOP_SESSION_COOKIE = "shop_session";
export const OAUTH_STATE_COOKIE = "shopify_oauth_state";

// Single-process, single-tenant-at-a-time dev prototype: tokens/products/info
// are kept in memory only, mirroring the existing seeded-data style in
// server.ts. Reset on restart; not a substitute for real persistent storage.
export const shopTokens = new Map<string, string>();
export const shopProducts = new Map<string, ShopifyProduct[]>();
export const shopInfo = new Map<string, { name: string; domain: string }>();

export function isValidShopDomain(shop: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);
}

export function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const found = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!found) return null;
  try {
    return decodeURIComponent(found.slice(name.length + 1));
  } catch {
    return null;
  }
}

export function signShopCookie(shop: string, secret: string): string {
  const sig = crypto.createHmac("sha256", secret).update(shop).digest("hex");
  return `${shop}.${sig}`;
}

export function readShopCookie(cookieHeader: string | undefined, secret: string): string | null {
  const value = readCookie(cookieHeader, SHOP_SESSION_COOKIE);
  if (!value) return null;
  const idx = value.lastIndexOf(".");
  if (idx === -1) return null;
  const shop = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const expected = crypto.createHmac("sha256", secret).update(shop).digest("hex");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  return shop;
}

// Verifies Shopify's HMAC on inbound query params (app-link loads and the
// OAuth callback). https://shopify.dev/docs/apps/auth/oauth/getting-started
export function verifyHmac(query: Record<string, unknown>, secret: string): boolean {
  const { hmac, signature, ...rest } = query as Record<string, string | undefined>;
  if (typeof hmac !== "string" || !hmac) return false;

  const message = Object.keys(rest)
    .filter((k) => typeof rest[k] === "string")
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("&");

  const digest = crypto.createHmac("sha256", secret).update(message).digest("hex");
  const digestBuf = Buffer.from(digest);
  const hmacBuf = Buffer.from(hmac);
  if (digestBuf.length !== hmacBuf.length) return false;
  return crypto.timingSafeEqual(digestBuf, hmacBuf);
}

export async function exchangeCodeForToken(
  shop: string,
  code: string,
  apiKey: string,
  apiSecret: string
): Promise<string> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: apiKey, client_secret: apiSecret, code }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// Exchanges an App Bridge ID token for an Admin API access token, without a
// merchant redirect — how embedded apps authenticate their ongoing API
// calls. https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/token-exchange
export async function exchangeIdTokenForAccessToken(
  shop: string,
  idToken: string,
  apiKey: string,
  apiSecret: string
): Promise<string> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: apiKey,
      client_secret: apiSecret,
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: idToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      requested_token_type: "urn:shopify:params:oauth:token-type:offline-access-token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

// Verifies an App Bridge ID token (session token): HS256 signature using the
// app's client secret, then the aud/exp/nbf/iss/dest claims. Returns the
// shop's myshopify.com hostname on success.
// https://shopify.dev/docs/apps/build/authentication-authorization/id-tokens
export function verifyIdToken(token: string, apiKey: string, apiSecret: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  const expectedSig = crypto
    .createHmac("sha256", apiSecret)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  const actualSig = base64UrlDecode(signatureB64);
  if (actualSig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(actualSig, expectedSig)) return null;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));
  } catch {
    return null;
  }

  const aud = payload.aud;
  const exp = payload.exp;
  const nbf = payload.nbf;
  const iss = payload.iss;
  const dest = payload.dest;
  if (aud !== apiKey) return null;
  if (typeof exp !== "number" || exp <= Date.now() / 1000) return null;
  if (typeof nbf !== "number" || nbf > Date.now() / 1000) return null;
  if (typeof iss !== "string" || typeof dest !== "string") return null;

  try {
    const issHost = new URL(iss).hostname;
    const destHost = new URL(dest).hostname;
    if (issHost !== destHost) return null;
    if (!isValidShopDomain(destHost)) return null;
    return destHost;
  } catch {
    return null;
  }
}

async function shopifyGraphQL(
  shop: string,
  accessToken: string,
  query: string
): Promise<any> {
  const res = await fetch(`https://${shop}/admin/api/${ADMIN_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    throw new Error(`Admin GraphQL request failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`Admin GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

function filenameFromUrl(url: string): string {
  try {
    const base = new URL(url).pathname.split("/").pop() || "image";
    return decodeURIComponent(base);
  } catch {
    return "image";
  }
}

function formatFromFilename(filename: string): string {
  const ext = filename.split(".").pop();
  return ext ? ext.toUpperCase() : "JPEG";
}

function buildFallbackJsonLd(
  product: Pick<ShopifyProduct, "title" | "handle" | "description" | "vendor" | "priceRange" | "images" | "variants">,
  shop: string
): ProductJsonLd {
  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.title,
    description: product.description,
    sku: product.variants[0]?.sku || product.handle,
    mpn: product.variants[0]?.sku || product.handle,
    brand: { "@type": "Brand", name: product.vendor || shop },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: product.priceRange.min,
      availability: "https://schema.org/InStock",
      url: `https://${shop}/products/${product.handle}`,
    },
    image: product.images.map((img) => ({
      "@type": "ImageObject",
      contentUrl: img.url,
      caption: img.altText || product.title,
      encodingFormat: `image/${(img.format || "jpeg").toLowerCase()}`,
      width: img.width || 1800,
      height: img.height || 1800,
      name: img.filename ? img.filename.replace(/\.[^/.]+$/, "") : product.handle,
    })),
  };
}

// Fetches the first page of the shop's products and maps them into this
// app's ShopifyProduct shape. Known limitations: only the first 50
// products / 50 images / 100 variants are fetched (no pagination yet), and
// fileSizeKb is a placeholder since the Admin API doesn't expose it on the
// `images` connection.
export async function fetchShopProducts(shop: string, accessToken: string): Promise<ShopifyProduct[]> {
  const query = `#graphql
    query FetchProducts {
      products(first: 50) {
        edges {
          node {
            id
            title
            handle
            vendor
            productType
            status
            description
            tags
            priceRangeV2 {
              minVariantPrice { amount }
              maxVariantPrice { amount }
            }
            images(first: 50) {
              edges { node { id url altText width height } }
            }
            variants(first: 100) {
              edges {
                node {
                  id
                  title
                  sku
                  price
                  selectedOptions { name value }
                  image { id }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(shop, accessToken, query);
  const edges = data?.products?.edges ?? [];

  return edges.map(({ node }: any): ShopifyProduct => {
    const images: ShopifyProductImage[] = (node.images?.edges ?? []).map(
      ({ node: img }: any, idx: number) => {
        const filename = filenameFromUrl(img.url);
        return {
          id: img.id,
          url: img.url,
          altText: img.altText || "",
          filename,
          width: img.width || 0,
          height: img.height || 0,
          format: formatFromFilename(filename),
          fileSizeKb: 0,
          variantIds: [],
          isHero: idx === 0,
          seoScore: 0,
          geoScore: 0,
          issues: [],
          proposedAltText: "",
          proposedFilename: "",
          translations: { en: img.altText || "" },
          inShopifyFiles: true,
          createdAt: new Date().toISOString(),
        };
      }
    );

    const imageById = new Map(images.map((img) => [img.id, img]));
    const variants: ShopifyProductVariant[] = (node.variants?.edges ?? []).map(({ node: v }: any) => {
      const options: ShopifyProductVariant["options"] = {};
      for (const opt of v.selectedOptions || []) {
        options[opt.name] = opt.value;
      }
      const linkedImage = v.image?.id ? imageById.get(v.image.id) : undefined;
      if (linkedImage) linkedImage.variantIds.push(v.id);
      return {
        id: v.id,
        title: v.title,
        sku: v.sku || "",
        price: v.price,
        options,
        imageId: linkedImage?.id,
      };
    });

    const base = {
      title: node.title as string,
      handle: node.handle as string,
      vendor: (node.vendor || "") as string,
      description: (node.description || "") as string,
      priceRange: {
        min: node.priceRangeV2?.minVariantPrice?.amount || "0.00",
        max: node.priceRangeV2?.maxVariantPrice?.amount || "0.00",
      },
      images,
      variants,
    };

    return {
      id: node.id,
      ...base,
      productType: node.productType || "",
      status: (node.status || "ACTIVE").toLowerCase() as ShopifyProduct["status"],
      overallSeoScore: 0,
      overallGeoScore: 0,
      jsonLd: buildFallbackJsonLd(base, shop),
      lastAuditedAt: new Date().toISOString(),
      tags: node.tags || [],
    };
  });
}

export async function fetchShopInfo(
  shop: string,
  accessToken: string
): Promise<{ name: string; domain: string }> {
  const query = `#graphql
    query FetchShop {
      shop { name myshopifyDomain }
    }
  `;
  const data = await shopifyGraphQL(shop, accessToken, query);
  return {
    name: data?.shop?.name || shop,
    domain: data?.shop?.myshopifyDomain || shop,
  };
}
