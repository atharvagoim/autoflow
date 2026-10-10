import { Router, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { validateBody } from "../middleware/validate";
import { ownerId } from "../middleware/auth";
import * as customers from "../services/customers";
import * as invoices from "../services/invoices";
import * as expenses from "../services/expenses";
import * as dashboard from "../services/dashboard";
import * as notifications from "../services/notifications";
import * as assistant from "../services/assistant";
import { streamInvoicePdf } from "../services/pdf";
import { User } from "../models/User";
import { EXPENSE_CATEGORIES } from "../models/Expense";
import { PAYMENT_METHODS } from "../models/Invoice";

// Everything here requires login (mounted behind requireAuth) and is always
// scoped to the logged-in user's own workspace.
const router = Router();
const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });

const date = z.coerce.date({ errorMap: () => ({ message: "Enter a valid date" }) });

// ---- Dashboard & assistant ------------------------------------------------
router.get("/dashboard", asyncHandler(async (req, res) => ok(res, await dashboard.summary(ownerId(req)))));

router.post(
  "/assistant",
  validateBody(z.object({ question: z.string().trim().min(1, "Type a question").max(500) })),
  asyncHandler(async (req, res) => ok(res, await assistant.ask(ownerId(req), req.body.question)))
);

// ---- Notifications --------------------------------------------------------
router.get("/notifications", asyncHandler(async (req, res) => ok(res, await notifications.list(ownerId(req)))));
router.post("/notifications/read", asyncHandler(async (req, res) => ok(res, await notifications.markAllRead(ownerId(req)))));

// ---- Customers ------------------------------------------------------------
const customerBody = z.object({
  name: z.string().trim().min(1, "Enter the customer's name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(120),
  phone: z.string().trim().max(30).optional().default(""),
  company: z.string().trim().max(100).optional().default(""),
});
router.get("/customers", asyncHandler(async (req, res) => ok(res, await customers.list(ownerId(req)))));
router.post("/customers", validateBody(customerBody), asyncHandler(async (req, res) => ok(res, await customers.create(ownerId(req), req.body), 201)));
router.put("/customers/:id", validateBody(customerBody), asyncHandler(async (req, res) => ok(res, await customers.update(ownerId(req), req.params.id, req.body))));
router.delete("/customers/:id", asyncHandler(async (req, res) => ok(res, await customers.remove(ownerId(req), req.params.id))));

// ---- Invoices -------------------------------------------------------------
const invoiceBody = z
  .object({
    customer: z.string().min(1, "Choose a customer"),
    items: z
      .array(
        z.object({
          description: z.string().trim().min(1, "Describe each item").max(200),
          quantity: z.coerce.number().positive("Quantity must be more than 0").max(1_000_000),
          unitPrice: z.coerce.number().min(0, "Price can't be negative").max(1_000_000_000),
        })
      )
      .min(1, "Add at least one item")
      .max(50),
    taxRate: z.coerce.number().min(0).max(100).default(0),
    issueDate: date.optional(),
    dueDate: date,
    notes: z.string().trim().max(1000).optional().default(""),
    send: z.boolean().optional().default(false),
  })
  .refine((b) => !b.issueDate || b.dueDate >= new Date(b.issueDate.getTime() - 86400000), {
    message: "The due date can't be before the issue date",
    path: ["dueDate"],
  });

router.get("/invoices", asyncHandler(async (req, res) => ok(res, await invoices.list(ownerId(req), String(req.query.status || "")))));
router.get("/invoices/:id", asyncHandler(async (req, res) => ok(res, await invoices.get(ownerId(req), req.params.id))));
router.post("/invoices", validateBody(invoiceBody), asyncHandler(async (req, res) => ok(res, await invoices.create(ownerId(req), req.body), 201)));
router.put("/invoices/:id", validateBody(invoiceBody), asyncHandler(async (req, res) => ok(res, await invoices.update(ownerId(req), req.params.id, req.body))));
router.post("/invoices/:id/send", asyncHandler(async (req, res) => ok(res, await invoices.markSent(ownerId(req), req.params.id))));
router.post(
  "/invoices/:id/pay",
  validateBody(z.object({ method: z.enum(PAYMENT_METHODS).default("bank_transfer"), paidAt: date.optional() })),
  asyncHandler(async (req, res) => ok(res, await invoices.markPaid(ownerId(req), req.params.id, req.body.method, req.body.paidAt)))
);
router.post("/invoices/:id/unpay", asyncHandler(async (req, res) => ok(res, await invoices.markUnpaid(ownerId(req), req.params.id))));
router.delete("/invoices/:id", asyncHandler(async (req, res) => ok(res, await invoices.remove(ownerId(req), req.params.id))));
router.get(
  "/invoices/:id/pdf",
  asyncHandler(async (req, res) => {
    const owner = ownerId(req);
    const [invoice, user] = await Promise.all([invoices.get(owner, req.params.id), User.findById(owner)]);
    streamInvoicePdf(res, invoice as unknown as invoices.PopulatedInvoice, {
      name: user?.name || "",
      businessName: user?.businessName || "",
      email: user?.email || "",
    });
  })
);

// ---- Expenses -------------------------------------------------------------
const expenseBody = z.object({
  title: z.string().trim().min(1, "What was this expense for?").max(120),
  amount: z.coerce.number().positive("Enter an amount more than 0").max(1_000_000_000),
  category: z.enum(["auto", ...EXPENSE_CATEGORIES]).default("auto"),
  date: date.default(() => new Date()),
  notes: z.string().trim().max(500).optional().default(""),
});
router.get("/expenses", asyncHandler(async (req, res) => ok(res, await expenses.list(ownerId(req)))));
router.get("/expenses/categories", (_req, res) => ok(res, EXPENSE_CATEGORIES));
router.post("/expenses", validateBody(expenseBody), asyncHandler(async (req, res) => ok(res, await expenses.create(ownerId(req), req.body), 201)));
router.put("/expenses/:id", validateBody(expenseBody), asyncHandler(async (req, res) => ok(res, await expenses.update(ownerId(req), req.params.id, req.body))));
router.delete("/expenses/:id", asyncHandler(async (req, res) => ok(res, await expenses.remove(ownerId(req), req.params.id))));

export default router;
