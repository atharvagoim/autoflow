import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AccessPayload {
  sub: string; // user id
  email: string;
}

type Expires = jwt.SignOptions["expiresIn"];

// Every token gets a unique id (jwtid) so two logins in the same second
// never produce identical tokens.
export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn as Expires, jwtid: crypto.randomUUID() });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn as Expires, jwtid: crypto.randomUUID() });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessPayload;
}

export function verifyRefreshToken(token: string): { sub: string; exp?: number } {
  return jwt.verify(token, env.jwt.refreshSecret) as { sub: string; exp?: number };
}
