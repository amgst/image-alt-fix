// Vercel function entry: serves the app's Express routes (/api/*, /privacy).
// vercel.json rewrites those paths here; Vercel serves the built page itself.
import app from "../app";

export default app;
