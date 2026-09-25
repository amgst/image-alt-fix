// Wraps fetch() so every /api/* call carries a fresh App Bridge session
// token — required for server.ts's resolveShopForRequest to identify which
// shop is calling. Without this header, the backend can never tell who's
// asking and falls back to demo/no data even though the UI loads fine.
// https://shopify.dev/docs/api/app-bridge/reference/session-token

declare global {
  interface Window {
    shopify?: {
      idToken: () => Promise<string>;
      toast?: { show: (message: string, options?: { isError?: boolean; duration?: number }) => void };
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

async function send(input: string, init: RequestInit): Promise<Response> {
  const token = await getIdToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

// When the server reports a stale session token (Shopify's retry header on a
// 401), fetch a fresh token and retry once.
export async function shopifyFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const res = await send(input, init);
  if (res.status === 401 && res.headers.get('X-Shopify-Retry-Invalid-Session-Request') === '1') {
    return send(input, init);
  }
  return res;
}

// Shows an App Bridge toast in the Shopify admin, or logs when App Bridge is
// not available (for example in a plain browser tab).
export function showToast(message: string, isError = false): void {
  if (window.shopify?.toast) window.shopify.toast.show(message, { isError });
  else (isError ? console.error : console.log)(message);
}
