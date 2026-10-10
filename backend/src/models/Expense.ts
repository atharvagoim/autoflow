import { Schema, model, Document, Types } from "mongoose";

export const EXPENSE_CATEGORIES = [
  "Software", "Travel", "Meals", "Office", "Marketing", "Utilities", "Rent", "Salaries", "Professional services", "Other",
] as const;

export interface IExpense extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  title: string;
  amount: number;
  category: string;
  date: Date;
  notes: string;
  categorizedByAI: boolean;
  createdAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, enum: EXPENSE_CATEGORIES, default: "Other" },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: "", maxlength: 500 },
    categorizedByAI: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "autoflow_expenses" }
);
expenseSchema.index({ owner: 1, date: -1 });

export const Expense = model<IExpense>("Expense", expenseSchema);
