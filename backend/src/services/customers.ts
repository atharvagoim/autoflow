import { Types } from "mongoose";
import { Customer } from "../models/Customer";
import { Invoice } from "../models/Invoice";
import { AppError } from "../lib/AppError";

export interface CustomerInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

export async function list(owner: Types.ObjectId) {
  const customers = await Customer.find({ owner }).sort({ name: 1 }).lean();
  const invoices = await Invoice.find({ owner }, { customer: 1, total: 1, status: 1 }).lean();
  const byId = new Map<string, { invoices: number; billed: number; unpaid: number }>();
  for (const inv of invoices) {
    const key = String(inv.customer);
    const t = byId.get(key) || { invoices: 0, billed: 0, unpaid: 0 };
    t.invoices += 1;
    t.billed += inv.total;
    if (inv.status === "sent" || inv.status === "overdue") t.unpaid += inv.total;
    byId.set(key, t);
  }
  return customers.map((c) => {
    const t = byId.get(String(c._id));
    return { ...c, invoices: t?.invoices || 0, billed: t?.billed || 0, unpaid: t?.unpaid || 0 };
  });
}

export async function create(owner: Types.ObjectId, input: CustomerInput) {
  return Customer.create({ ...input, owner });
}

export async function update(owner: Types.ObjectId, id: string, input: CustomerInput) {
  const customer = await Customer.findOneAndUpdate({ _id: id, owner }, { $set: input }, { new: true, runValidators: true });
  if (!customer) throw AppError.notFound("That customer doesn't exist");
  return customer;
}

export async function remove(owner: Types.ObjectId, id: string) {
  const count = await Invoice.countDocuments({ owner, customer: id });
  if (count > 0) {
    throw AppError.badRequest(`This customer has ${count} invoice${count === 1 ? "" : "s"}. Delete those first to remove the customer.`);
  }
  const res = await Customer.deleteOne({ _id: id, owner });
  if (!res.deletedCount) throw AppError.notFound("That customer doesn't exist");
}
