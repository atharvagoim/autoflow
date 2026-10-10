import { findProblems, variablesFor, TRIGGERS, STEPS } from "../src/automation/catalog";
import { TEMPLATES } from "../src/automation/templates";

describe("catalog", () => {
  it("every template is valid as shipped", () => {
    for (const t of TEMPLATES) {
      expect({ key: t.key, problems: findProblems(t.trigger, t.steps) }).toEqual({ key: t.key, problems: [] });
    }
  });

  it("templates only use variables their trigger provides", () => {
    for (const t of TEMPLATES) {
      t.steps.forEach((s, i) => {
        const allowed = new Set(variablesFor(t.trigger.type, t.steps, i).map((v) => v.key));
        const used = JSON.stringify(s.config).match(/\{\{\s*(\w+)\s*\}\}/g) || [];
        for (const token of used) expect({ template: t.key, token, ok: allowed.has(token.replace(/[{}\s]/g, "")) }).toMatchObject({ ok: true });
      });
    }
  });

  it("reports missing pieces in plain language", () => {
    const problems = findProblems({ type: "invoice_paid", config: {} }, [{ type: "email", config: { to: "{{customerEmail}}" } }]);
    expect(problems).toContain("Step 1 (Send an email): fill in “Subject”");
    expect(findProblems({ type: "nope", config: {} }, [])).toEqual(["Choose what starts this automation", "Add at least one step"]);
  });

  it("invoice-only steps can't be used with other triggers", () => {
    const problems = findProblems({ type: "expense_added", config: {} }, [{ type: "update_invoice", config: { action: "mark_paid" } }]);
    expect(problems[0]).toMatch(/only works when an invoice starts/);
  });

  it("AI message becomes available after an AI step", () => {
    const steps = [{ type: "ai_write" }, { type: "email" }];
    expect(variablesFor("invoice_overdue", steps, 0).some((v) => v.key === "aiMessage")).toBe(false);
    expect(variablesFor("invoice_overdue", steps, 1).some((v) => v.key === "aiMessage")).toBe(true);
  });

  it("has unique types", () => {
    expect(new Set(TRIGGERS.map((t) => t.type)).size).toBe(TRIGGERS.length);
    expect(new Set(STEPS.map((s) => s.type)).size).toBe(STEPS.length);
  });
});
