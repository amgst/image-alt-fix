import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// An empty VITE_SHOPIFY_API_KEY in the build environment (for example a blank
// Vercel variable) would override .env.production and leave App Bridge
// without a client ID, so drop it and let the file's value apply.
if (!process.env.VITE_SHOPIFY_API_KEY?.trim()) delete process.env.VITE_SHOPIFY_API_KEY;

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Allow the Shopify CLI's Cloudflare tunnel hosts, which change on every
      // `shopify app dev` run.
      allowedHosts: ['.trycloudflare.com'],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
