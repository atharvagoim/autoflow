import { Schema, model, Document, Types } from "mongoose";

export interface ICustomer extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  company: string;
  createdAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    phone: { type: String, default: "", trim: true, maxlength: 30 },
    company: { type: String, default: "", trim: true, maxlength: 100 },
  },
  { timestamps: true, collection: "autoflow_customers" }
);

export const Customer = model<ICustomer>("Customer", customerSchema);
