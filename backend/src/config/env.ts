import path from "path";
import dotenv from "dotenv";

// One .env for the whole project, at the project root.
// (src/config → backend → project root, and the same depth from dist/server/config.)
const projectRoot = path.resolve(__dirname, "..", "..", "..");
dotenv.config({ path: path.join(projectRoot, ".env") });

const isProd = process.env.NODE_ENV === "production";

function secret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProd) throw new Error(`Missing required environment variable: ${name}`);
  return devFallback;
}

function int(name: string, fallback: number): number {
  const n = parseInt(process.env[name] || "", 10);
  return Number.isFinite(n) ? n : fallback;
}

// macOS's AirPlay Receiver occupies port 5000 and answers with "403 Forbidden",
// which makes the app look broken. In development on a Mac we move to 5050
// (frontend/vite.config.mts applies the same rule so the two always agree).
function resolvePort(): number {
  const requested = int("PORT", 5050);
  if (requested === 5000 && process.platform === "darwin" && !isProd) return 5050;
  return requested;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd,
  port: resolvePort(),
  projectRoot,
  clientDistDir: path.join(projectRoot, "dist", "client"),
  // Only needed when the web app is hosted on a different domain from the API.
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  // Public URL of the app, used in emails and webhook links. Falls back to the request host.
  appUrl: (process.env.APP_URL || "").replace(/\/$/, ""),

  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/finflow_ai",

  // Run automations inside the web server (default). Set to false only if you
  // run `npm run worker` as a separate process.
  runWorkerInline: process.env.RUN_WORKER_INLINE !== "false",
  autoSeed: process.env.AUTO_SEED !== "false",

  jwt: {
    accessSecret: secret("JWT_ACCESS_SECRET", "dev_access_secret"),
    refreshSecret: secret("JWT_REFRESH_SECRET", "dev_refresh_secret"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  smtp: {
    host: process.env.SMTP_HOST || "",
    port: int("SMTP_PORT", 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.EMAIL_FROM || "AutoFlow <no-reply@autoflow.app>",
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  },

  integrations: {
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || "",
    whatsappApiToken: process.env.WHATSAPP_API_TOKEN || "",
  },

  security: {
    bcryptSaltRounds: int("BCRYPT_SALT_ROUNDS", 10),
    rateLimitWindowMs: int("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
    rateLimitMax: int("RATE_LIMIT_MAX", 1000),
  },
};

export const DEMO_EMAIL = "demo@autoflow.app";
export const DEMO_PASSWORD = "Password123!";
