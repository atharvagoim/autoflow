import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { apiRateLimiter } from "./middleware/rateLimit";
import { requireAuth } from "./middleware/auth";
import { errorMiddleware, notFoundHandler } from "./middleware/error";
import authRoutes from "./routes/auth";
import dataRoutes from "./routes/data";
import automationRoutes from "./routes/automations";
import hookRoutes from "./routes/hooks";

export const app = express();

// Behind Render/Railway/nginx: trust the first proxy so rate limits see real IPs.
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "blob:"],
        "frame-src": ["'self'", "blob:"],
        // Don't force https: the app may be served over plain http (localhost, a VPS IP).
        "upgrade-insecure-requests": null,
      },
    },
  })
);

// Only matters if the web app is hosted on another domain (CLIENT_URL).
const allowedOrigins = env.clientUrl.split(",").map((o) => o.trim().replace(/\/$/, ""));
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)), credentials: true }));

app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.isProd ? "tiny" : "dev", { stream: { write: (msg) => logger.info(msg.trim()) }, skip: (req) => req.url === "/health" }));

app.get("/health", (_req, res) => res.json({ success: true, status: "ok" }));

app.use("/api", apiRateLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/hooks", hookRoutes);
app.use("/api/automations", requireAuth, automationRoutes);
app.use("/api", requireAuth, dataRoutes);
app.use("/api", notFoundHandler);

// Serve the built web app (npm run build → dist/client) from this same server.
const indexHtml = path.join(env.clientDistDir, "index.html");
if (fs.existsSync(indexHtml)) {
  app.use(express.static(env.clientDistDir, { index: false, maxAge: "30d", immutable: true }));
  // Page routes (/, /login, /app/invoices…) get index.html; missing files still 404.
  app.get(/^\/(?!api\/)[^.]*$/, (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indexHtml);
  });
}

app.use(notFoundHandler);
app.use(errorMiddleware);
