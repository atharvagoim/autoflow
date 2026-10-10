import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { User, IUser, publicUser } from "../models/User";
import { RefreshToken } from "../models/RefreshToken";
import { AppError } from "../lib/AppError";
import { env, DEMO_EMAIL, DEMO_PASSWORD } from "../config/env";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { loadSampleWorkspace } from "./sampleData";

async function issueSession(user: IUser) {
  const accessToken = signAccessToken({ sub: user._id.toString(), email: user.email });
  const refreshToken = signRefreshToken(user._id.toString());
  const { exp } = verifyRefreshToken(refreshToken);
  await RefreshToken.create({
    user: user._id,
    token: refreshToken,
    expiresAt: new Date((exp ?? Date.now() / 1000 + 7 * 86400) * 1000),
  });
  return { accessToken, refreshToken, user: publicUser(user) };
}

export async function signup(input: { name: string; email: string; password: string }) {
  const email = input.email.toLowerCase();
  if (await User.exists({ email })) throw AppError.conflict("An account with this email already exists. Try logging in.");
  const passwordHash = await bcrypt.hash(input.password, env.security.bcryptSaltRounds);
  const user = await User.create({ name: input.name, email, passwordHash });
  return issueSession(user);
}

export async function login(emailRaw: string, password: string) {
  const user = await User.findOne({ email: emailRaw.toLowerCase().trim() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw AppError.unauthorized("Incorrect email or password");
  }
  return issueSession(user);
}

// Creates the demo account (with sample data) if it doesn't exist yet.
export async function ensureDemoUser(): Promise<IUser> {
  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) return existing;
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, env.security.bcryptSaltRounds);
  const user = await User.create({ name: "Aanya Rao", email: DEMO_EMAIL, passwordHash, businessName: "Studio Aanya", currency: "INR" });
  await loadSampleWorkspace(user._id);
  return user;
}

export async function demoLogin() {
  if (!env.autoSeed) throw AppError.notFound("The demo account is turned off on this server");
  const user = await ensureDemoUser();
  return issueSession(user);
}

// Rotates the refresh token: the old one is deleted and a new pair issued.
export async function refresh(oldToken: string) {
  let sub: string;
  try {
    sub = verifyRefreshToken(oldToken).sub;
  } catch {
    throw AppError.unauthorized("Your session has expired. Please log in again.");
  }
  const stored = await RefreshToken.findOneAndDelete({ token: oldToken });
  if (!stored) throw AppError.unauthorized("Your session has expired. Please log in again.");
  const user = await User.findById(sub);
  if (!user) throw AppError.unauthorized("Your account no longer exists");
  return issueSession(user);
}

export async function logout(token: string) {
  if (token) await RefreshToken.deleteOne({ token });
}

export async function getProfile(userId: Types.ObjectId) {
  const user = await User.findById(userId);
  if (!user) throw AppError.unauthorized("Your account no longer exists");
  return publicUser(user);
}

export async function updateProfile(userId: Types.ObjectId, changes: { name?: string; businessName?: string; currency?: string }) {
  const user = await User.findByIdAndUpdate(userId, { $set: changes }, { new: true, runValidators: true });
  if (!user) throw AppError.unauthorized("Your account no longer exists");
  return publicUser(user);
}

export async function changePassword(userId: Types.ObjectId, current: string, next: string) {
  const user = await User.findById(userId);
  if (!user) throw AppError.unauthorized();
  if (user.email === DEMO_EMAIL) throw AppError.badRequest("The demo account's password can't be changed");
  if (!(await bcrypt.compare(current, user.passwordHash))) throw AppError.badRequest("Your current password is incorrect");
  user.passwordHash = await bcrypt.hash(next, env.security.bcryptSaltRounds);
  await user.save();
  await RefreshToken.deleteMany({ user: user._id }); // log out other devices
  return issueSession(user);
}
