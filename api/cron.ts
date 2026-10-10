import type { IncomingMessage, ServerResponse } from "http";
import { boot } from "./_boot";
import { runWorkerCycle } from "../backend/src/automation/worker";

// Called by Vercel Cron (see vercel.json). Starts due schedules, resumes
// waiting runs, marks overdue invoices and processes the queue.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.statusCode = 401;
    res.end("Unauthorized");
    return;
  }
  try {
    await boot();
    await runWorkerCycle();
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true }));
  } catch (err) {
    res.statusCode = 500;
    res.end((err as Error).message);
  }
}
