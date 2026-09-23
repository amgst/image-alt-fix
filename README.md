# Shopify Image SEO

Shopify image SEO and GEO workspace for auditing product media, improving alt text and filenames, reviewing Shopify Files, and generating product imagery.

## Requirements

- Node.js 20.19 or newer

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env`.

3. Start the app:

   ```bash
   npm run dev
   ```

Open `http://localhost:3000` in a browser. The development server serves the React UI and API from the same origin.

## Shopify CLI development

This project includes `shopify.app.toml` so Shopify CLI can recognize the directory. Before running `shopify app dev`:

1. Create or select the app in the Shopify Dev Dashboard.
2. Copy its client ID into `shopify.app.toml` in place of `REPLACE_WITH_SHOPIFY_CLIENT_ID`.
3. Run:

   ```bash
   shopify app dev
   ```

The current server is still a local prototype. The CLI configuration prepares the app directory and development URL, but OAuth callback handling and live Shopify Admin API access still need to be implemented before merchant installation.

## Validation and production

```bash
npm run lint
npm run build
npm start
```

`npm run build` creates the browser assets in `dist/` and the bundled server at `dist/server.cjs`. `npm start` serves the production build on port `3000`.

## Environment variables

- `PORT`: currently fixed to `3000` by the server and reserved for a future deployment configuration.

Audits, image generation, and JSON-LD generation are all rule-based and run entirely on the server — no external AI API or key is required.

## Current Shopify boundary

This repository is a functional local prototype. Its catalog and Shopify Files data are seeded in server memory and reset whenever the server restarts. It does not yet include Shopify OAuth, App Bridge, Admin GraphQL access, webhook handling, or persistent storage. Before installing it for a merchant, replace the seeded data layer with authenticated Shopify Admin API calls and add durable storage for audit results and settings.
