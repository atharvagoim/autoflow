import type { IncomingMessage, ServerResponse } from "http";
import { app } from "../backend/src/app";
import { boot } from "./_boot";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await boot();
  } catch (err) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, message: "Database unavailable. Check MONGO_URI." }));
    return;
  }
  return app(req as never, res as never);
}
