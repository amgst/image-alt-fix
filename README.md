# Shopify Image SEO

Shopify image SEO and GEO workspace for auditing product media, improving alt text and filenames, reviewing Shopify Files, and generating product imagery with Gemini.

## Requirements

- Node.js 20.19 or newer
- A Gemini API key for AI audit and image-generation actions

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`.

3. Start the app:

   ```bash
   npm run dev
   ```

Open `http://localhost:3000` in a browser. The development server serves the React UI and API from the same origin.

## Validation and production

```bash
npm run lint
npm run build
npm start
```

`npm run build` creates the browser assets in `dist/` and the bundled server at `dist/server.cjs`. `npm start` serves the production build on port `3000`.

## Environment variables

- `GEMINI_API_KEY`: enables Gemini-backed audits, image generation, and JSON-LD generation.
- `PORT`: currently fixed to `3000` by the server and reserved for a future deployment configuration.

Without `GEMINI_API_KEY`, the seeded catalog and non-AI workflows still load, but Gemini-backed actions return an unavailable response.

## Current Shopify boundary

This repository is a functional local prototype. Its catalog and Shopify Files data are seeded in server memory and reset whenever the server restarts. It does not yet include Shopify OAuth, App Bridge, Admin GraphQL access, webhook handling, or persistent storage. Before installing it for a merchant, replace the seeded data layer with authenticated Shopify Admin API calls and add durable storage for audit results and settings.
