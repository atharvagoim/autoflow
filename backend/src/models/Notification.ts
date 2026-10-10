import { Schema, model, Document, Types } from "mongoose";

export interface INotification extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  title: string;
  body: string;
  tone: "info" | "success" | "warning";
  link: string;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, default: "", maxlength: 1000 },
    tone: { type: String, enum: ["info", "success", "warning"], default: "info" },
    link: { type: String, default: "" },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "autoflow_notifications" }
);
notificationSchema.index({ owner: 1, createdAt: -1 });

export const Notification = model<INotification>("Notification", notificationSchema);
