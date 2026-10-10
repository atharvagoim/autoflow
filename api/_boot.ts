import { waitUntil } from "@vercel/functions";
import { connectDB } from "../backend/src/config/db";
import { env } from "../backend/src/config/env";
import { ensureDemoUser } from "../backend/src/services/auth";
import { setQueueListener } from "../backend/src/automation/events";
import { pump } from "../backend/src/automation/worker";

// Serverless has no long-running process, so there is no interval worker.
// Instead: connect once per warm instance, and process queued runs right
// after they are created (kept alive with waitUntil). Waiting/scheduled runs
// are picked up by the cron job in api/cron.ts.
let ready: Promise<void> | null = null;

export function boot(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await connectDB();
      if (env.autoSeed) await ensureDemoUser();
      setQueueListener(() => waitUntil(pump()));
    })().catch((err) => {
      ready = null; // retry on the next request
      throw err;
    });
  }
  return ready;
}
