import { checkCondition, fillTemplate, flattenPayload, formatMoney, nextScheduleRun, waitMs, withCommonVars } from "../src/automation/variables";

describe("fillTemplate", () => {
  it("fills known fields and blanks unknown ones", () => {
    expect(fillTemplate("Hi {{customerName}}, {{ amountText }} {{nope}}!", { customerName: "Meera", amountText: "₹1,000" })).toBe("Hi Meera, ₹1,000 !");
  });
  it("handles empty input", () => {
    expect(fillTemplate(undefined, {})).toBe("");
  });
});

describe("checkCondition", () => {
  it("compares numbers, including formatted ones", () => {
    expect(checkCondition(60000, "greater_than", "50000")).toBe(true);
    expect(checkCondition("₹60,000", "greater_than", "50,000")).toBe(true);
    expect(checkCondition(100, "less_than", 50)).toBe(false);
  });
  it("compares text case-insensitively", () => {
    expect(checkCondition("Paid", "equals", "paid")).toBe(true);
    expect(checkCondition("overdue", "not_equals", "paid")).toBe(true);
    expect(checkCondition("Figma subscription", "contains", "figma")).toBe(true);
    expect(checkCondition("anything", "contains", "")).toBe(false);
  });
});

describe("nextScheduleRun", () => {
  const from = new Date("2026-10-09T10:30:00Z"); // a Friday

  it("hourly → next full hour", () => {
    expect(nextScheduleRun({ frequency: "hourly" }, from).toISOString()).toBe("2026-10-09T11:00:00.000Z");
  });
  it("daily in UTC, later today or tomorrow", () => {
    expect(nextScheduleRun({ frequency: "daily", hour: 14 }, from).toISOString()).toBe("2026-10-09T14:00:00.000Z");
    expect(nextScheduleRun({ frequency: "daily", hour: 9 }, from).toISOString()).toBe("2026-10-10T09:00:00.000Z");
  });
  it("daily at 9 AM India time (UTC+5:30, offset -330)", () => {
    // 10:30 UTC = 16:00 IST, so the next 9 AM IST is tomorrow 03:30 UTC.
    expect(nextScheduleRun({ frequency: "daily", hour: 9, tzOffset: -330 }, from).toISOString()).toBe("2026-10-10T03:30:00.000Z");
  });
  it("weekly on Monday", () => {
    expect(nextScheduleRun({ frequency: "weekly", weekday: 1, hour: 9 }, from).toISOString()).toBe("2026-10-12T09:00:00.000Z");
  });
  it("weekly on the same day but time already passed → next week", () => {
    expect(nextScheduleRun({ frequency: "weekly", weekday: 5, hour: 9 }, from).toISOString()).toBe("2026-10-16T09:00:00.000Z");
  });
  it("always returns a time after `from`", () => {
    for (let h = 0; h < 24; h++) {
      expect(nextScheduleRun({ frequency: "daily", hour: h, tzOffset: 300 }, from).getTime()).toBeGreaterThan(from.getTime());
    }
  });
});

describe("other helpers", () => {
  it("waitMs clamps to 1–90 units", () => {
    expect(waitMs(3, "days")).toBe(3 * 86400000);
    expect(waitMs(0, "minutes")).toBe(60000);
    expect(waitMs(500, "hours")).toBe(90 * 3600000);
  });
  it("formatMoney uses the currency", () => {
    expect(formatMoney(150000, "INR")).toBe("₹1,50,000");
    expect(formatMoney(1234.5, "USD")).toBe("$1,234.50");
  });
  it("flattenPayload keeps simple values only", () => {
    expect(flattenPayload({ name: "Sam", amount: 5, nested: { a: 1 }, "bad key!": 1 })).toEqual({ name: "Sam", amount: 5 });
    expect(flattenPayload(["x"])).toEqual({});
  });
  it("withCommonVars adds user details and amountText", () => {
    const v = withCommonVars({ amount: 500 }, { name: "Aanya", email: "a@b.co", businessName: "", currency: "INR" });
    expect(v).toMatchObject({ userName: "Aanya", userEmail: "a@b.co", businessName: "Aanya", amountText: "₹500" });
  });
});
