import crypto from "crypto";
import type { ShopifyProduct, ShopifyProductImage, ShopifyProductVariant, ProductJsonLd } from "./src/types";
import { deleteToken } from "./tokenStore.js";

const ADMIN_API_VERSION = "2026-10";

// The last fetched catalog and shop names are cached in memory. The catalog is
// re-read from Shopify on every page load, so a restart loses nothing. Access
// tokens are persisted separately in tokenStore.ts.
export const shopProducts = new Map<string, ShopifyProduct[]>();
export const shopInfo = new Map<string, { name: string; domain: string }>();

export function isValidShopDomain(shop: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);
}

// Exchanges an App Bridge ID token for an offline Admin API access token,
// without a merchant redirect. This is how embedded apps using Shopify managed
// installation authenticate.
// https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/token-exchange
export async function exchangeIdTokenForAccessToken(
  shop: string,
  idToken: string,
  apiKey: string,
  apiSecret: string
): Promise<{ accessToken: string; scope: string }> {
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
  const data = (await res.json()) as { access_token: string; scope?: string };
  return { accessToken: data.access_token, scope: data.scope ?? "" };
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

// Thrown when Shopify rejects the stored access token (app reinstalled, token
// revoked). Callers drop the token and exchange a fresh one.
export class ShopifyAuthError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_ATTEMPTS = 5;

async function shopifyGraphQL(
  shop: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {},
  attempt = 1
): Promise<any> {
  const res = await fetch(`https://${shop}/admin/api/${ADMIN_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 401) {
    throw new ShopifyAuthError(`Shopify rejected the access token for ${shop}.`);
  }
  if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
    await sleep(1000 * attempt);
    return shopifyGraphQL(shop, accessToken, query, variables, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`Admin GraphQL request failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  if (json.errors) {
    const throttled =
      Array.isArray(json.errors) &&
      json.errors.some((e: any) => e?.extensions?.code === "THROTTLED");
    if (throttled && attempt < MAX_ATTEMPTS) {
      await sleep(1000 * attempt);
      return shopifyGraphQL(shop, accessToken, query, variables, attempt + 1);
    }
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

// Product images are read from the product's `media` connection so each
// image's ID is a MediaImage ID. Those IDs are what `fileUpdate` accepts when
// the alt text is written back. Videos and 3D models are skipped.
const MEDIA_IMAGE_FIELDS = `
  ... on MediaImage {
    id
    alt
    createdAt
    image { url width height }
  }
`;

// 20 products x 40 media keeps each page well under the 1,000-point query
// cost limit. Products with more images are topped up by MORE_MEDIA_QUERY.
const PRODUCTS_QUERY = `#graphql
  query FetchProducts($cursor: String) {
    products(first: 20, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
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
        media(first: 40) {
          pageInfo { hasNextPage endCursor }
          nodes { ${MEDIA_IMAGE_FIELDS} }
        }
      }
    }
  }
`;

const MORE_MEDIA_QUERY = `#graphql
  query FetchMoreMedia($id: ID!, $cursor: String) {
    product(id: $id) {
      media(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes { ${MEDIA_IMAGE_FIELDS} }
      }
    }
  }
`;

function toProductImage(media: any, position: number): ShopifyProductImage | null {
  if (!media?.id || !media?.image?.url) return null;
  const filename = filenameFromUrl(media.image.url);
  const alt = media.alt || "";
  return {
    id: media.id,
    url: media.image.url,
    altText: alt,
    filename,
    width: media.image.width || 0,
    height: media.image.height || 0,
    format: formatFromFilename(filename),
    fileSizeKb: 0,
    variantIds: [],
    isHero: position === 0,
    seoScore: 0,
    geoScore: 0,
    issues: [],
    proposedAltText: "",
    proposedFilename: "",
    translations: { en: alt },
    inShopifyFiles: true,
    createdAt: media.createdAt || new Date().toISOString(),
  };
}

// Fetches every product in the shop, following pagination, with all of each
// product's images.
export async function fetchShopProducts(shop: string, accessToken: string): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  let cursor: string | null = null;

  do {
    const data = await shopifyGraphQL(shop, accessToken, PRODUCTS_QUERY, { cursor });
    const page = data?.products;
    if (!page) break;

    for (const node of page.nodes ?? []) {
      const mediaNodes: any[] = [...(node.media?.nodes ?? [])];
      let mediaPage = node.media?.pageInfo;
      while (mediaPage?.hasNextPage) {
        const more = await shopifyGraphQL(shop, accessToken, MORE_MEDIA_QUERY, {
          id: node.id,
          cursor: mediaPage.endCursor,
        });
        mediaNodes.push(...(more?.product?.media?.nodes ?? []));
        mediaPage = more?.product?.media?.pageInfo;
      }

      const images = mediaNodes
        .map((m, idx) => toProductImage(m, idx))
        .filter((img): img is ShopifyProductImage => img !== null);

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
        variants: [] as ShopifyProductVariant[],
      };

      products.push({
        id: node.id,
        ...base,
        productType: node.productType || "",
        status: (node.status || "ACTIVE").toLowerCase() as ShopifyProduct["status"],
        overallSeoScore: 0,
        overallGeoScore: 0,
        jsonLd: buildFallbackJsonLd(base, shop),
        lastAuditedAt: new Date().toISOString(),
        tags: node.tags || [],
      });
    }

    cursor = page.pageInfo?.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);

  return products;
}

const FILE_UPDATE_MUTATION = `#graphql
  mutation UpdateAlt($files: [FileUpdateInput!]!) {
    fileUpdate(files: $files) {
      files { id alt }
      userErrors { field message code }
    }
  }
`;

export interface AltUpdateResult {
  updated: { imageId: string; altText: string }[];
  failed: { imageId: string; message: string }[];
}

// Writes alt text to Shopify for MediaImage IDs, in batches. An image counts
// as updated only when Shopify returns it; anything else is reported as
// failed with Shopify's error message. Shopify rejects a whole batch when one
// image in it is invalid, so the other images from that batch are resent once
// on their own.
export async function updateImageAlts(
  shop: string,
  accessToken: string,
  updates: { imageId: string; altText: string }[],
  retryInnocent = true
): Promise<AltUpdateResult> {
  const result: AltUpdateResult = { updated: [], failed: [] };
  const innocent: { imageId: string; altText: string }[] = [];
  const BATCH = 25;

  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    const data = await shopifyGraphQL(shop, accessToken, FILE_UPDATE_MUTATION, {
      files: batch.map((u) => ({ id: u.imageId, alt: u.altText })),
    });
    const payload = data?.fileUpdate;
    const saved = new Map<string, string>(
      (payload?.files ?? []).filter(Boolean).map((f: any) => [f.id, f.alt ?? ""])
    );
    const errors: any[] = payload?.userErrors ?? [];
    const fileErrors = errors.filter((e) => Array.isArray(e.field) && e.field[0] === "files");
    const otherMessages = errors
      .filter((e) => !fileErrors.includes(e))
      .map((e) => e.message)
      .filter(Boolean)
      .join("; ");

    batch.forEach((u, idx) => {
      if (saved.has(u.imageId)) {
        result.updated.push({ imageId: u.imageId, altText: saved.get(u.imageId)! });
        return;
      }
      const ownMessage = fileErrors
        .filter((e) => e.field[1] === String(idx))
        .map((e) => e.message)
        .filter(Boolean)
        .join("; ");
      if (ownMessage) {
        result.failed.push({ imageId: u.imageId, message: ownMessage });
      } else if (otherMessages) {
        result.failed.push({ imageId: u.imageId, message: otherMessages });
      } else if (fileErrors.length && retryInnocent) {
        innocent.push(u);
      } else {
        result.failed.push({
          imageId: u.imageId,
          message: fileErrors.length
            ? "Not saved because another image in the same batch was rejected. Save it again."
            : "Shopify did not confirm the update.",
        });
      }
    });
  }

  if (innocent.length) {
    const retried = await updateImageAlts(shop, accessToken, innocent, false);
    result.updated.push(...retried.updated);
    result.failed.push(...retried.failed);
  }

  return result;
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

// Verifies the X-Shopify-Hmac-Sha256 header on a webhook: base64 HMAC-SHA256
// of the raw request body, keyed with the app's client secret.
// https://shopify.dev/docs/apps/build/webhooks/subscribe/https#step-5-verify-the-webhook
export function verifyWebhookHmac(rawBody: Buffer, hmacHeader: string | undefined, secret: string): boolean {
  if (!hmacHeader) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(hmacHeader, "base64");
  if (digest.length !== received.length) return false;
  return crypto.timingSafeEqual(digest, received);
}

// Removes everything stored for a shop (uninstall or shop/redact).
export function forgetShop(shop: string): void {
  deleteToken(shop);
  shopProducts.delete(shop);
  shopInfo.delete(shop);
}
