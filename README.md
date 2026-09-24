# Image Alt Fix

Embedded Shopify app for reviewing and fixing product image ALT text. It reads every product image from the store and writes ALT text changes back to Shopify.

## Requirements

- Node.js 22.13 or newer. The app uses Node's built-in SQLite module.
- Shopify CLI, and the "Image Alt Fix" app in the Shopify Dev Dashboard

## Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the client secret from the Dev Dashboard.

3. Start the app through Shopify CLI:

   ```bash
   shopify app dev --config image-alt-fix
   ```

   The CLI starts the server with `npm run dev` (see `shopify.web.toml`), opens an HTTPS tunnel, points the app's URL at it, and passes in the client ID, secret, app URL and scopes. Open the app from the preview link the CLI prints.

Opening `http://localhost:3000` directly shows a "not authenticated" message. The app only works inside the Shopify admin, where App Bridge supplies a session token.

## How it works

- **Installation and authentication.** Shopify managed installation handles install and scope approval. Each API call carries an App Bridge session token, which the server verifies and exchanges for an offline Admin API access token. The app uses no cookies for authentication, so it works in incognito windows and with third-party cookies blocked.
- **Token storage.** Access tokens are saved in SQLite at `DATABASE_PATH` (default `./data/app.sqlite`). A missing token, or one that lacks a scope the app now requires, is replaced through token exchange on the next request.
- **Scopes.** `read_products` to read products and their images, and `write_files` to save ALT text. Keep `SCOPES` equal to `[access_scopes]` in the app config.
- **Reading.** The catalog is re-read from Shopify on every load and on "Sync from Shopify", following pagination through all products and all of their images.
- **Writing.** ALT text is saved with the Admin GraphQL `fileUpdate` mutation on each image's MediaImage ID. The UI only shows a change as saved once Shopify confirms it.
- **Webhooks.** `/api/webhooks` verifies Shopify's HMAC signature and handles `app/uninstalled` plus the three mandatory privacy compliance topics. The subscriptions are declared in `shopify.app.image-alt-fix.toml`.

## Dashboard banners

The Overview page shows banners from `banners.json` in the project root. The server re-reads the file on every page load, so edits appear without a restart. Merchants can dismiss a banner, and it stays hidden in their browser. Give a banner a new `id` to show it again.

```json
[
  {
    "id": "inventory-alerts-launch",
    "tone": "promo",
    "title": "New from Wbify: Inventory Alerts",
    "message": "Get notified before your best sellers run out.",
    "imageUrl": "https://cdn.example.com/inventory-alerts.png",
    "action": { "label": "Learn more", "url": "https://apps.shopify.com/..." },
    "startsAt": "2026-10-01T00:00:00Z",
    "endsAt": "2026-10-31T23:59:59Z",
    "dismissible": true
  }
]
```

- `id` and `title` are required. Everything else is optional.
- `tone` is `info`, `success`, `warning`, `critical` or `promo`. `promo` renders as a dark feature banner.
- `imageUrl` and `action.url` must be `https://` links, otherwise they are dropped.
- `startsAt` and `endsAt` limit when the banner shows.

A separate status banner, driven by the store's own ALT text numbers, always appears above these.

## Validation and production

```bash
npm run lint
npm run build
npm start
```

`npm run build` creates the browser assets in `dist/` and the bundled server at `dist/server.cjs`. `npm start` serves the production build on `PORT`, or `3000` if it is not set.

## Before going to production

- **Hosting.** Deploy to a host with a stable HTTPS URL. Set `application_url` and `redirect_urls` in `shopify.app.image-alt-fix.toml` to it, then run `shopify app deploy`.
- **Environment.** Set `SHOPIFY_API_KEY`, `VITE_SHOPIFY_API_KEY` (at build time), `SHOPIFY_API_SECRET`, `SCOPES` and `NODE_ENV=production`.
- **Persistent storage.** Point `DATABASE_PATH` at a persistent volume. SQLite suits a single server instance. Running several instances needs a shared database such as Postgres behind the same functions in `tokenStore.ts`.
- **Privacy policy.** The app serves its privacy policy at `/privacy` on its own domain, for example `https://your-app-host.com/privacy`. Set `SUPPORT_EMAIL` so the page shows your contact address, and update the policy in `legal/privacy.html` if the app starts handling new data.
- **Listing.** Prepare a support contact, screenshots and description in the Partner Dashboard. The app icon is in `listing/`.
