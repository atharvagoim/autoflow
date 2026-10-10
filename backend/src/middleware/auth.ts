import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { AppError } from "../lib/AppError";
import { verifyAccessToken } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      userId?: Types.ObjectId;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return next(AppError.unauthorized("Please log in to continue"));
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.userId = new Types.ObjectId(payload.sub);
    next();
  } catch {
    next(AppError.unauthorized("Your session has expired. Please log in again."));
  }
}

// Only valid after requireAuth.
export function ownerId(req: Request): Types.ObjectId {
  if (!req.userId) throw AppError.unauthorized();
  return req.userId;
}
