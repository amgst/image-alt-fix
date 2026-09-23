// Wraps fetch() so every /api/* call carries a fresh App Bridge session
// token — required for server.ts's resolveShopForRequest to identify which
// shop is calling. Without this header, the backend can never tell who's
// asking and falls back to demo/no data even though the UI loads fine.
// https://shopify.dev/docs/api/app-bridge/reference/session-token

declare global {
  interface Window {
    shopify?: {
      idToken: () => Promise<string>;
    };
  }
}

async function getIdToken(): Promise<string | null> {
  if (!window.shopify?.idToken) return null;
  try {
    return await window.shopify.idToken();
  } catch (err) {
    console.error('Failed to get App Bridge session token:', err);
    return null;
  }
}

export async function shopifyFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getIdToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
