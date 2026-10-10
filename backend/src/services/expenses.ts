import { Types } from "mongoose";
import { Expense, EXPENSE_CATEGORIES } from "../models/Expense";
import { AppError } from "../lib/AppError";
import { aiJSON, isAIConfigured } from "../lib/ai";
import { emitEvent } from "../automation/events";
import { expenseVars } from "../automation/variables";

export interface ExpenseInput {
  title: string;
  amount: number;
  category: string; // "auto" lets AutoFlow pick
  date: Date;
  notes?: string;
}

const KEYWORDS: Array<[string, RegExp]> = [
  ["Software", /software|saas|subscription|figma|notion|github|adobe|google workspace|aws|hosting|domain|zoom|slack|license/i],
  ["Travel", /flight|uber|ola|taxi|cab|train|hotel|airbnb|travel|fuel|petrol|toll|parking/i],
  ["Meals", /lunch|dinner|breakfast|coffee|cafe|restaurant|swiggy|zomato|food|meal|snack/i],
  ["Office", /office|stationery|printer|chair|desk|laptop|monitor|supplies|keyboard/i],
  ["Marketing", /ads?|advert|campaign|marketing|promotion|seo|instagram|facebook|linkedin|print/i],
  ["Utilities", /electric|internet|wifi|broadband|phone|mobile|water|gas bill|utility/i],
  ["Rent", /rent|lease|cowork/i],
  ["Salaries", /salary|salaries|payroll|wage|stipend|bonus/i],
  ["Professional services", /lawyer|legal|accountant|\bca\b|consult|audit|freelanc|contractor|design work/i],
];

// AI when an OpenAI key is set, otherwise a keyword match — either way the
// user never has to pick a category if they don't want to.
export async function suggestCategory(title: string, notes = ""): Promise<string> {
  const text = `${title} ${notes}`;
  if (isAIConfigured) {
    const res = await aiJSON(
      `Categorize a small-business expense. Reply as JSON {"category": one of ${JSON.stringify(EXPENSE_CATEGORIES)}}.`,
      text,
      { category: "Other" }
    );
    if ((EXPENSE_CATEGORIES as readonly string[]).includes(res.category)) return res.category;
  }
  return KEYWORDS.find(([, re]) => re.test(text))?.[0] || "Other";
}

export async function list(owner: Types.ObjectId) {
  return Expense.find({ owner }).sort({ date: -1, createdAt: -1 }).limit(500).lean();
}

export async function create(owner: Types.ObjectId, input: ExpenseInput) {
  const auto = input.category === "auto";
  const category = auto ? await suggestCategory(input.title, input.notes) : input.category;
  const expense = await Expense.create({ ...input, owner, category, categorizedByAI: auto });
  await emitEvent(owner, "expense_added", expenseVars(expense));
  return expense;
}

export async function update(owner: Types.ObjectId, id: string, input: ExpenseInput) {
  const auto = input.category === "auto";
  const category = auto ? await suggestCategory(input.title, input.notes) : input.category;
  const expense = await Expense.findOneAndUpdate(
    { _id: id, owner },
    { $set: { ...input, category, categorizedByAI: auto } },
    { new: true, runValidators: true }
  );
  if (!expense) throw AppError.notFound("That expense doesn't exist");
  return expense;
}

export async function remove(owner: Types.ObjectId, id: string) {
  const res = await Expense.deleteOne({ _id: id, owner });
  if (!res.deletedCount) throw AppError.notFound("That expense doesn't exist");
}
