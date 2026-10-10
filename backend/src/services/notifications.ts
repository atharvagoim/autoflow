import { Types } from "mongoose";
import { Notification } from "../models/Notification";

export async function notify(
  owner: Types.ObjectId | string,
  data: { title: string; body?: string; tone?: "info" | "success" | "warning"; link?: string }
) {
  return Notification.create({
    owner,
    title: data.title.slice(0, 140),
    body: (data.body || "").slice(0, 1000),
    tone: data.tone || "info",
    link: data.link || "",
  });
}

export async function list(owner: Types.ObjectId) {
  const [items, unread] = await Promise.all([
    Notification.find({ owner }).sort({ createdAt: -1 }).limit(40).lean(),
    Notification.countDocuments({ owner, read: false }),
  ]);
  return { items, unread };
}

export async function markAllRead(owner: Types.ObjectId) {
  await Notification.updateMany({ owner, read: false }, { $set: { read: true } });
}
