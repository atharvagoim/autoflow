import PDFDocument from "pdfkit";
import { Response } from "express";
import { formatDate, formatMoney } from "../automation/variables";
import { PopulatedInvoice } from "./invoices";

// Streams an invoice PDF straight to the response — nothing is stored on
// disk, so PDFs are always current and private to their owner.
export function streamInvoicePdf(res: Response, invoice: PopulatedInvoice, business: { name: string; businessName: string; email: string }) {
  const money = (n: number) => formatMoney(n, invoice.currency).replace("₹", "Rs. "); // built-in PDF fonts lack ₹
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${invoice.number}.pdf"`);
  doc.pipe(res);

  const pink = "#E9579A";
  const ink = "#16161D";
  const muted = "#6B6B78";

  doc.rect(0, 0, doc.page.width, 8).fill(pink);
  doc.fillColor(ink).font("Helvetica-Bold").fontSize(22).text(business.businessName || business.name, 50, 50);
  doc.font("Helvetica").fontSize(10).fillColor(muted).text(business.email);

  doc.font("Helvetica-Bold").fontSize(26).fillColor(ink).text("Invoice", 350, 50, { align: "right", width: 195 });
  doc.font("Helvetica").fontSize(10).fillColor(muted).text(invoice.number, 350, 82, { align: "right", width: 195 });

  doc.moveDown(3);
  const top = 140;
  doc.fontSize(9).fillColor(muted).text("Billed to", 50, top);
  doc.fontSize(12).fillColor(ink).font("Helvetica-Bold").text(invoice.customer?.name || "", 50, top + 14);
  doc.font("Helvetica").fontSize(10).fillColor(muted).text([invoice.customer?.company, invoice.customer?.email].filter(Boolean).join("\n"), 50, top + 30);

  const meta: Array<[string, string]> = [
    ["Issued", formatDate(invoice.issueDate)],
    ["Due", formatDate(invoice.dueDate)],
    ["Status", invoice.status === "paid" ? `Paid ${invoice.paidAt ? formatDate(invoice.paidAt) : ""}` : invoice.status[0].toUpperCase() + invoice.status.slice(1)],
  ];
  meta.forEach(([k, v], i) => {
    doc.fontSize(9).fillColor(muted).text(k, 350, top + i * 18, { width: 80 });
    doc.fontSize(10).fillColor(ink).text(v, 430, top + i * 18, { width: 115, align: "right" });
  });

  let y = 230;
  doc.rect(50, y, 495, 24).fill("#F6F1F5");
  doc.fillColor(muted).fontSize(9).text("Description", 60, y + 8).text("Qty", 330, y + 8, { width: 40, align: "right" }).text("Price", 380, y + 8, { width: 70, align: "right" }).text("Amount", 460, y + 8, { width: 75, align: "right" });
  y += 32;
  for (const item of invoice.items) {
    const h = Math.max(18, doc.heightOfString(item.description, { width: 260 }) + 6);
    if (y + h > 720) {
      doc.addPage();
      y = 60;
    }
    doc.fillColor(ink).fontSize(10).text(item.description, 60, y, { width: 260 });
    doc.text(String(item.quantity), 330, y, { width: 40, align: "right" });
    doc.text(money(item.unitPrice), 380, y, { width: 70, align: "right" });
    doc.text(money(item.quantity * item.unitPrice), 460, y, { width: 75, align: "right" });
    y += h;
  }

  y += 12;
  doc.moveTo(330, y).lineTo(545, y).strokeColor("#E4E0E8").stroke();
  y += 10;
  const totals: Array<[string, string, boolean]> = [
    ["Subtotal", money(invoice.subtotal), false],
    [`Tax (${invoice.taxRate}%)`, money(invoice.tax), false],
    ["Total", money(invoice.total), true],
  ];
  for (const [k, v, bold] of totals) {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 13 : 10).fillColor(bold ? ink : muted).text(k, 330, y, { width: 100 });
    doc.fillColor(ink).text(v, 430, y, { width: 115, align: "right" });
    y += bold ? 22 : 16;
  }

  if (invoice.notes) {
    y += 20;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(muted).text("Notes", 50, y);
    doc.font("Helvetica").fontSize(10).fillColor(ink).text(invoice.notes, 50, y + 14, { width: 495 });
  }

  doc.fontSize(8).fillColor(muted).text("Made with AutoFlow", 50, 770, { width: 495, align: "center" });
  doc.end();
}
