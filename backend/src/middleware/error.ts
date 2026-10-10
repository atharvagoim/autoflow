import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { AppError } from "../lib/AppError";
import { logger } from "../lib/logger";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, code: "NOT_FOUND", message: `Nothing found at ${req.method} ${req.originalUrl}` });
}

function firstZodMessage(err: ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Please check the form and try again";
  const field = issue.path.filter((p) => p !== "body").join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
}

// One consistent error shape: { success:false, code, message }.
// Messages are written for people, since the UI shows them directly.
export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let status = 500;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong on our side. Please try again.";

  if (err instanceof AppError) {
    status = err.statusCode;
    code = err.code;
    message = err.message;
  } else if (err instanceof ZodError) {
    status = 400;
    code = "BAD_REQUEST";
    message = firstZodMessage(err);
  } else if (err instanceof mongoose.Error.CastError) {
    status = 404;
    code = "NOT_FOUND";
    message = "That item doesn't exist";
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    code = "BAD_REQUEST";
    message = Object.values(err.errors)[0]?.message || "Please check the form and try again";
  } else if ((err as { code?: number })?.code === 11000) {
    status = 409;
    code = "CONFLICT";
    message = "That already exists";
  } else if ((err as { type?: string })?.type === "entity.parse.failed") {
    status = 400;
    code = "BAD_REQUEST";
    message = "The request body isn't valid JSON";
  } else if ((err as { type?: string })?.type === "entity.too.large") {
    status = 413;
    code = "TOO_LARGE";
    message = "That request is too large";
  }

  if (status >= 500) logger.error(`${req.method} ${req.originalUrl} — ${(err as Error)?.stack || err}`);
  res.status(status).json({ success: false, code, message });
}
