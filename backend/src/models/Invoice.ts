import { Schema, model, Document, Types } from "mongoose";

export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export const PAYMENT_METHODS = ["bank_transfer", "upi", "card", "cash", "other"] as const;

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface IInvoice extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  number: string;
  customer: Types.ObjectId;
  items: IInvoiceItem[];
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  paidAt?: Date;
  paymentMethod?: string;
  notes: string;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<IInvoiceItem>(
  {
    description: { type: String, required: true, trim: true, maxlength: 200 },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    number: { type: String, required: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    items: { type: [itemSchema], default: [] },
    taxRate: { type: Number, default: 0, min: 0, max: 100 },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: INVOICE_STATUSES, default: "draft" },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    paidAt: Date,
    paymentMethod: { type: String, enum: PAYMENT_METHODS },
    notes: { type: String, default: "", maxlength: 1000 },
    pdfUrl: String,
  },
  { timestamps: true, collection: "autoflow_invoices" }
);

invoiceSchema.index({ owner: 1, number: 1 }, { unique: true });
invoiceSchema.index({ owner: 1, status: 1, dueDate: 1 });

// Keeps money fields consistent no matter which code path saves the invoice.
invoiceSchema.pre("validate", function (next) {
  const round = (n: number) => Math.round(n * 100) / 100;
  this.subtotal = round(this.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0));
  this.tax = round((this.subtotal * (this.taxRate || 0)) / 100);
  this.total = round(this.subtotal + this.tax);
  next();
});

export const Invoice = model<IInvoice>("Invoice", invoiceSchema);
