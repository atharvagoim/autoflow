import { Schema, model, Types } from "mongoose";

const refreshTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "autoflow_refresh_tokens" }
);
// MongoDB deletes expired tokens automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export interface IRefreshToken {
  user: Types.ObjectId;
  token: string;
  expiresAt: Date;
}

export const RefreshToken = model<IRefreshToken>("RefreshToken", refreshTokenSchema);
