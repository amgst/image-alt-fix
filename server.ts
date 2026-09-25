import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import app from "./app.js";

// Long-running server for local development (`shopify app dev`) and hosts
// that run `npm start`. On Vercel, api/index.ts serves the same Express app
// as a function and Vercel serves the built page itself.
const PORT = Number(process.env.PORT) || 3000;

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
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Image Alt Fix server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
