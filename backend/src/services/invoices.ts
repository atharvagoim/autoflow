import { Types } from "mongoose";
import { Invoice, IInvoice, IInvoiceItem } from "../models/Invoice";
import { Customer } from "../models/Customer";
import { User } from "../models/User";
import { AppError } from "../lib/AppError";
import { emitEvent } from "../automation/events";
import { invoiceVars } from "../automation/variables";

export interface InvoiceInput {
  customer: string;
  items: IInvoiceItem[];
  taxRate: number;
  dueDate: Date;
  issueDate?: Date;
  notes?: string;
  send?: boolean;
}

const DAY = 24 * 60 * 60 * 1000;

// An invoice is overdue once its due date has fully passed.
export function overdueCutoff(now = new Date()) {
  return new Date(now.getTime() - DAY);
}

// Flips sent invoices past their due date to "overdue" — one at a time and
// atomically, so the "invoice becomes overdue" trigger fires exactly once.
export async function sweepOverdue(owner?: Types.ObjectId) {
  const filter: Record<string, unknown> = { status: "sent", dueDate: { $lt: overdueCutoff() } };
  if (owner) filter.owner = owner;
  for (let i = 0; i < 200; i++) {
    const inv = await Invoice.findOneAndUpdate(filter, { $set: { status: "overdue" } }, { new: true }).populate("customer");
    if (!inv) break;
    await emitEvent(inv.owner, "invoice_overdue", invoiceVars(inv));
  }
}

async function nextNumber(owner: Types.ObjectId) {
  const user = await User.findByIdAndUpdate(owner, { $inc: { invoiceCounter: 1 } }, { new: true });
  if (!user) throw AppError.unauthorized();
  return { number: `INV-${String(user.invoiceCounter).padStart(4, "0")}`, currency: user.currency };
}

async function assertCustomer(owner: Types.ObjectId, id: string) {
  if (!Types.ObjectId.isValid(id) || !(await Customer.exists({ _id: id, owner }))) {
    throw AppError.badRequest("Choose a customer for this invoice");
  }
}

export async function list(owner: Types.ObjectId, status?: string) {
  await sweepOverdue(owner);
  const filter: Record<string, unknown> = { owner };
  if (status === "unpaid") filter.status = { $in: ["sent", "overdue"] };
  else if (status && ["draft", "sent", "paid", "overdue"].includes(status)) filter.status = status;
  return Invoice.find(filter).sort({ issueDate: -1, createdAt: -1 }).limit(500).populate("customer", "name email company").lean();
}

export async function get(owner: Types.ObjectId, id: string) {
  const invoice = await Invoice.findOne({ _id: id, owner }).populate("customer");
  if (!invoice) throw AppError.notFound("That invoice doesn't exist");
  return invoice;
}

export async function create(owner: Types.ObjectId, input: InvoiceInput) {
  await assertCustomer(owner, input.customer);
  const { number, currency } = await nextNumber(owner);
  const invoice = await Invoice.create({
    owner,
    number,
    currency,
    customer: input.customer,
    items: input.items,
    taxRate: input.taxRate,
    issueDate: input.issueDate || new Date(),
    dueDate: input.dueDate,
    notes: input.notes || "",
    status: input.send ? "sent" : "draft",
  });
  await invoice.populate("customer");
  await emitEvent(owner, "invoice_created", invoiceVars(invoice));
  return invoice;
}

export async function update(owner: Types.ObjectId, id: string, input: InvoiceInput) {
  const invoice = await get(owner, id);
  if (invoice.status === "paid") throw AppError.badRequest("Paid invoices can't be edited");
  await assertCustomer(owner, input.customer);
  invoice.set({
    customer: input.customer,
    items: input.items,
    taxRate: input.taxRate,
    dueDate: input.dueDate,
    issueDate: input.issueDate || invoice.issueDate,
    notes: input.notes || "",
  });
  if (input.send && invoice.status === "draft") invoice.status = "sent";
  // Moving the due date into the future un-flags an overdue invoice.
  if (invoice.status === "overdue" && invoice.dueDate >= overdueCutoff()) invoice.status = "sent";
  await invoice.save();
  return invoice.populate("customer");
}

export async function markSent(owner: Types.ObjectId, id: string) {
  const invoice = await get(owner, id);
  if (invoice.status !== "draft") return invoice;
  invoice.status = invoice.dueDate < overdueCutoff() ? "overdue" : "sent";
  await invoice.save();
  return invoice;
}

export async function markPaid(owner: Types.ObjectId, id: string, method = "bank_transfer", paidAt = new Date()) {
  // Atomic so double-clicks can't fire "invoice paid" twice.
  const invoice = await Invoice.findOneAndUpdate(
    { _id: id, owner, status: { $ne: "paid" } },
    { $set: { status: "paid", paidAt, paymentMethod: method } },
    { new: true }
  ).populate("customer");
  if (!invoice) {
    const existing = await get(owner, id);
    return existing; // already paid
  }
  await emitEvent(owner, "invoice_paid", invoiceVars(invoice));
  return invoice;
}

export async function markUnpaid(owner: Types.ObjectId, id: string) {
  const invoice = await get(owner, id);
  if (invoice.status !== "paid") return invoice;
  invoice.status = invoice.dueDate < overdueCutoff() ? "overdue" : "sent";
  invoice.paidAt = undefined;
  invoice.paymentMethod = undefined;
  await invoice.save();
  return invoice;
}

export async function remove(owner: Types.ObjectId, id: string) {
  const res = await Invoice.deleteOne({ _id: id, owner });
  if (!res.deletedCount) throw AppError.notFound("That invoice doesn't exist");
}

export type PopulatedInvoice = IInvoice & { customer: { name: string; email: string; company?: string } };
