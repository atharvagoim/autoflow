import { Run } from "../models/Run";
import { Automation } from "../models/Automation";
import { logger } from "../lib/logger";
import { processRun } from "./engine";
import { setQueueListener, startRun } from "./events";
import { nextScheduleRun } from "./variables";
import { sweepOverdue } from "../services/invoices";

// MongoDB-backed worker: runs are documents, claimed atomically, so this
// survives restarts (waiting runs resume later) and needs no Redis.
const MAX_PARALLEL = 4;
const STUCK_AFTER_MS = 15 * 60 * 1000;
let active = 0;
let started = false;

async function claimNext() {
  const now = new Date();
  return Run.findOneAndUpdate(
    { $or: [{ status: "queued" }, { status: "waiting", resumeAt: { $lte: now } }] },
    { $set: { status: "running", claimedAt: now } },
    { sort: { createdAt: 1 }, new: true }
  );
}

// Claims happen one at a time within this process, and a run already being
// processed here is never started again — so no step can run twice.
let claiming = false;
let pumpAgain = false;
const inFlight = new Set<string>();

export async function pump(): Promise<void> {
  if (claiming) {
    pumpAgain = true;
    return;
  }
  claiming = true;
  try {
    while (active < MAX_PARALLEL) {
      let run;
      try {
        run = await claimNext();
      } catch (err) {
        logger.error(`[worker] could not claim a run: ${(err as Error).message}`);
        return;
      }
      if (!run) return;
      const id = String(run._id);
      if (inFlight.has(id)) continue;
      inFlight.add(id);
      active++;
      processRun(run)
        .catch(async (err) => {
          logger.error(`[worker] run ${id} crashed: ${(err as Error).message}`);
          await Run.updateOne({ _id: run!._id }, { $set: { status: "failed", error: "Unexpected error", finishedAt: new Date() } }).catch(() => undefined);
        })
        .finally(() => {
          inFlight.delete(id);
          active--;
          void pump();
        });
    }
  } finally {
    claiming = false;
    if (pumpAgain) {
      pumpAgain = false;
      setImmediate(() => void pump());
    }
  }
}

// Starts any scheduled automations that are due. The conditional update on
// nextRunAt makes sure each slot runs once even with several servers.
async function runSchedules() {
  const now = new Date();
  const due = await Automation.find({ enabled: true, "trigger.type": "schedule", nextRunAt: { $lte: now } }).limit(100);
  for (const automation of due) {
    const next = nextScheduleRun(automation.trigger.config, now);
    const claimed = await Automation.findOneAndUpdate(
      { _id: automation._id, nextRunAt: automation.nextRunAt },
      { $set: { nextRunAt: next } },
      { new: true }
    );
    if (claimed) await startRun(claimed, {});
  }
}

// Runs interrupted by a crash or deploy are marked failed rather than re-run,
// so nobody gets the same email twice.
async function recoverStuck() {
  const res = await Run.updateMany(
    { status: "running", claimedAt: { $lt: new Date(Date.now() - STUCK_AFTER_MS) } },
    { $set: { status: "failed", error: "Interrupted by a server restart", finishedAt: new Date() } }
  );
  if (res.modifiedCount) logger.warn(`[worker] marked ${res.modifiedCount} interrupted run(s) as failed`);
}

export async function tick() {
  try {
    await recoverStuck();
    await sweepOverdue();
    await runSchedules();
  } catch (err) {
    logger.error(`[worker] tick failed: ${(err as Error).message}`);
  }
  void pump();
}

// One full pass, used by the Vercel cron job (no long-running process there).
export async function runWorkerCycle() {
  await tick();
  while (active > 0 || claiming) await new Promise((r) => setTimeout(r, 200));
}

export function startWorker() {
  if (started) return;
  started = true;
  setQueueListener(() => setImmediate(() => void pump()));
  void tick();
  setInterval(() => void pump(), 10_000).unref();
  setInterval(() => void tick(), 60_000).unref();
  logger.info("Automation worker started");
}

// `npm run worker` — a separate worker process (set RUN_WORKER_INLINE=false on the web server).
if (require.main === module) {
  (async () => {
    const { connectDB } = await import("../config/db");
    await connectDB();
    startWorker();
    setInterval(() => undefined, 1 << 30); // keep the process alive
  })().catch((err) => {
    logger.error(`Worker failed to start: ${(err as Error).message}`);
    process.exit(1);
  });
}
