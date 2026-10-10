import crypto from "crypto";
import { Types } from "mongoose";
import { User } from "../models/User";
import { Customer } from "../models/Customer";
import { Invoice } from "../models/Invoice";
import { Expense } from "../models/Expense";
import { Automation } from "../models/Automation";
import { Run } from "../models/Run";
import { Notification } from "../models/Notification";
import { TEMPLATE_MAP } from "../automation/templates";
import { nextScheduleRun } from "../automation/variables";

const DAY = 86400000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

// Wipes this user's workspace. Their account itself is untouched.
export async function clearWorkspace(owner: Types.ObjectId) {
  await Promise.all([
    Customer.deleteMany({ owner }),
    Invoice.deleteMany({ owner }),
    Expense.deleteMany({ owner }),
    Automation.deleteMany({ owner }),
    Run.deleteMany({ owner }),
    Notification.deleteMany({ owner }),
  ]);
  await User.updateOne({ _id: owner }, { $set: { invoiceCounter: 0 } });
}

// Fills a workspace with believable data so every screen has something to
// show. Writes directly to the database, so no automations fire.
export async function loadSampleWorkspace(owner: Types.ObjectId) {
  await clearWorkspace(owner);
  const user = await User.findById(owner);
  const currency = user?.currency || "INR";

  const customers = await Customer.insertMany(
    [
      { name: "Meera Iyer", email: "meera@northwind.studio", company: "Northwind Studio", phone: "+91 98200 11223" },
      { name: "Rohan Desai", email: "rohan@lumenlabs.io", company: "Lumen Labs", phone: "+91 99870 44556" },
      { name: "Sara Thomas", email: "accounts@kiteandco.com", company: "Kite & Co.", phone: "" },
      { name: "Vikram Shah", email: "vikram@banyanfoods.in", company: "Banyan Foods", phone: "+91 90040 77889" },
      { name: "Lena Park", email: "lena@orbitmedia.co", company: "Orbit Media", phone: "" },
    ].map((c) => ({ ...c, owner }))
  );
  const [northwind, lumen, kite, banyan, orbit] = customers;

  const plan: Array<{ c: typeof northwind; items: Array<[string, number, number]>; issued: number; due: number; status: string; paidOn?: number; tax?: number }> = [
    { c: northwind, items: [["Brand identity system", 1, 85000]], issued: -150, due: -136, status: "paid", paidOn: -138, tax: 18 },
    { c: lumen, items: [["Landing page design", 1, 42000], ["Illustration set", 6, 3500]], issued: -120, due: -106, status: "paid", paidOn: -104, tax: 18 },
    { c: banyan, items: [["Packaging design", 3, 18000]], issued: -95, due: -81, status: "paid", paidOn: -84, tax: 18 },
    { c: kite, items: [["Monthly design retainer", 1, 60000]], issued: -64, due: -50, status: "paid", paidOn: -52, tax: 18 },
    { c: orbit, items: [["Social media templates", 12, 2500]], issued: -45, due: -31, status: "paid", paidOn: -29 },
    { c: northwind, items: [["Website UX audit", 1, 38000], ["Workshop (half day)", 1, 12000]], issued: -25, due: -11, status: "paid", paidOn: -9, tax: 18 },
    { c: kite, items: [["Monthly design retainer", 1, 60000]], issued: -12, due: 2, status: "paid", paidOn: -3, tax: 18 },
    { c: lumen, items: [["App onboarding screens", 1, 54000]], issued: -30, due: -9, status: "overdue", tax: 18 },
    { c: banyan, items: [["Menu redesign", 1, 16500]], issued: -22, due: -4, status: "overdue" },
    { c: orbit, items: [["Pitch deck design", 1, 32000]], issued: -9, due: 5, status: "sent", tax: 18 },
    { c: northwind, items: [["Motion graphics (30s)", 2, 22000]], issued: -2, due: 13, status: "sent", tax: 18 },
    { c: kite, items: [["Monthly design retainer", 1, 60000]], issued: 0, due: 14, status: "draft", tax: 18 },
  ];

  let counter = 0;
  const invoices = await Invoice.insertMany(
    plan.map((p) => {
      counter++;
      const items = p.items.map(([description, quantity, unitPrice]) => ({ description, quantity, unitPrice }));
      const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const tax = Math.round(subtotal * (p.tax || 0)) / 100;
      return {
        owner,
        number: `INV-${String(counter).padStart(4, "0")}`,
        customer: p.c._id,
        items,
        taxRate: p.tax || 0,
        subtotal,
        tax,
        total: subtotal + tax,
        currency,
        status: p.status,
        issueDate: daysFromNow(p.issued),
        dueDate: daysFromNow(p.due),
        paidAt: p.paidOn !== undefined ? daysFromNow(p.paidOn) : undefined,
        paymentMethod: p.paidOn !== undefined ? (counter % 2 ? "bank_transfer" : "upi") : undefined,
        notes: "Thank you for your business!",
      };
    })
  );
  await User.updateOne({ _id: owner }, { $set: { invoiceCounter: counter } });

  const expenses: Array<[string, number, string, number]> = [
    ["Figma Professional", 1300, "Software", -2],
    ["Coworking desk — October", 9500, "Rent", -5],
    ["Client lunch with Meera", 2350, "Meals", -8],
    ["Wacom tablet", 18900, "Office", -12],
    ["Google Workspace", 1380, "Software", -32],
    ["Coworking desk — September", 9500, "Rent", -35],
    ["Flight to Bengaluru (client visit)", 7200, "Travel", -40],
    ["Instagram ads", 5000, "Marketing", -48],
    ["Broadband", 1180, "Utilities", -55],
    ["Adobe Creative Cloud", 4230, "Software", -62],
    ["Coworking desk — August", 9500, "Rent", -66],
    ["Accountant (quarterly filing)", 6000, "Professional services", -90],
    ["Coworking desk — July", 9500, "Rent", -96],
    ["Printer ink and paper", 1650, "Office", -110],
    ["Coworking desk — June", 9500, "Rent", -127],
  ];
  await Expense.insertMany(
    expenses.map(([title, amount, category, day]) => ({ owner, title, amount, category, date: daysFromNow(day), categorizedByAI: false }))
  );

  const automationKeys: Array<[string, boolean]> = [
    ["thank_on_payment", true],
    ["chase_overdue", true],
    ["large_expense", true],
    ["daily_summary", false],
  ];
  const automations = await Automation.insertMany(
    automationKeys.map(([key, enabled]) => {
      const t = TEMPLATE_MAP.get(key)!;
      return {
        owner,
        name: t.name,
        description: t.description,
        enabled,
        templateKey: key,
        trigger: { type: t.trigger.type, config: { ...t.trigger.config, ...(t.trigger.type === "schedule" ? { tzOffset: -330 } : {}) } },
        steps: t.steps.map((s) => ({ id: crypto.randomBytes(4).toString("hex"), type: s.type, config: { ...s.config } })),
        webhookKey: crypto.randomBytes(16).toString("hex"),
        nextRunAt: enabled && t.trigger.type === "schedule" ? nextScheduleRun({ ...t.trigger.config, tzOffset: -330 }) : undefined,
        runCount: key === "thank_on_payment" ? 3 : key === "chase_overdue" ? 2 : 0,
        lastRunAt: key === "thank_on_payment" ? daysFromNow(-3) : key === "chase_overdue" ? daysFromNow(-3) : undefined,
      };
    })
  );

  const [thanks, chase] = automations;
  const paidInvoices = invoices.filter((i) => i.status === "paid").slice(-3);
  const overdue = invoices.filter((i) => i.status === "overdue");
  const runDocs = [
    ...paidInvoices.map((inv) => ({
      automation: thanks,
      at: inv.paidAt!,
      logs: [
        { type: "email", status: "success", message: `Emailed “Thanks for your payment for ${inv.number}”` },
        { type: "notify", status: "success", message: "Notification sent" },
      ],
    })),
    ...overdue.map((inv) => ({
      automation: chase,
      at: new Date(inv.dueDate.getTime() + DAY),
      logs: [
        { type: "ai_write", status: "success", message: "Wrote a reminder" },
        { type: "email", status: "success", message: `Emailed “Reminder: invoice ${inv.number} is overdue”` },
        { type: "notify", status: "success", message: "Notification sent" },
      ],
    })),
  ];
  await Run.insertMany(
    runDocs.map((r) => ({
      owner,
      automation: r.automation._id,
      automationName: r.automation.name,
      triggerType: r.automation.trigger.type,
      status: "success",
      vars: {},
      steps: [],
      nextStep: r.logs.length,
      logs: r.logs.map((l, i) => ({ ...l, stepId: r.automation.steps[i]?.id || String(i), at: r.at })),
      startedAt: r.at,
      finishedAt: r.at,
      createdAt: r.at,
    }))
  );

  await Notification.insertMany([
    { owner, title: "Welcome to AutoFlow", body: "This workspace is filled with sample data so you can look around. Reset it any time in Settings.", tone: "success", link: "/app/settings" },
    { owner, title: `${overdue.length} invoices are overdue`, body: "Chase overdue invoices is on and already sent reminders.", tone: "warning", link: "/app/invoices?status=overdue" },
  ]);
}
