import { env } from "./config/env"; // loads the project-root .env first
import { app } from "./app";
import { connectDB } from "./config/db";
import { logger } from "./lib/logger";
import { ensureDemoUser } from "./services/auth";
import { startWorker } from "./automation/worker";

async function main() {
  await connectDB();

  if (env.autoSeed) {
    // Makes sure the demo account (with sample data) exists for "Try the demo".
    await ensureDemoUser();
  }

  if (env.runWorkerInline) startWorker();
  else logger.info('RUN_WORKER_INLINE=false — run "npm run worker" to process automations.');

  const server = app.listen(env.port, () => {
    if (process.env.PORT === "5000" && env.port !== 5000) {
      logger.warn("Port 5000 is used by AirPlay Receiver on macOS, so AutoFlow is using 5050 instead.");
    }
    logger.info(`AutoFlow is running on http://localhost:${env.port}`);
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      logger.error(`Port ${env.port} is already in use by another app. Set a different PORT in your .env (for example PORT=5050) and start again.`);
    } else {
      logger.error(`Server error: ${err.message}`);
    }
    process.exit(1);
  });
}

main().catch((err) => {
  logger.error(`Failed to start: ${err.message}`);
  if (/ECONNREFUSED|querySrv|ENOTFOUND|Server selection|authentication failed/i.test(err.message)) {
    logger.error("Couldn't reach MongoDB. Check MONGO_URI in your .env file (a local MongoDB or a MongoDB Atlas connection string).");
  }
  process.exit(1);
});
