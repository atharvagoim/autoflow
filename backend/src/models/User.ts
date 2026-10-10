import { Schema, model, Document, Types } from "mongoose";

export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  businessName: string;
  currency: Currency;
  invoiceCounter: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true }, // never sent to the browser: responses use publicUser()
    businessName: { type: String, default: "", trim: true, maxlength: 80 },
    currency: { type: String, enum: CURRENCIES, default: "INR" },
    invoiceCounter: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "autoflow_users" }
);

// Safety net: the password hash is stripped whenever a user is serialised.
userSchema.set("toJSON", {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.passwordHash;
    return ret;
  },
});

export function publicUser(user: IUser) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    businessName: user.businessName,
    currency: user.currency,
  };
}

export const User = model<IUser>("User", userSchema);
