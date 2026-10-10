import PDFDocument from "pdfkit";
import { formatGhs } from "../../utils/money.js";
import { COMPANY_ADDRESS, COMPANY_NAME, CONTACT_EMAIL } from "../../utils/legal.js";

// The receipt as a real PDF file, drawn on an A4 page [AC-PAY-17].
// The app downloads it, and the receipt email will attach the same file (Step 12).
// Same design as the receipt screen: green band, two address boxes, items table, total bar.

const GREEN = "#123c2a";
const CREAM = "#f7f0df";
const GOLD = "#c89b3c";
const INK = "#2b2118";
const MUTED = "#6b5d4f";
const LINE = "#e6dccb";

const PAGE_WIDTH = 595.28; // A4 in PDF points (1 point = 1/72 inch)
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PAGE_BOTTOM = 842 - 60; // leave room for the footer

const PAYMENT_BADGES = {
  PAID: "PAID",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTLY REFUNDED",
};

// "2026-10-09T22:09:31Z" -> "9 Oct 2026, 22:09" in Ghana time
const ghanaDateTime = (date) => {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

// The CibusHub "C" with its gold dot, from the 512 x 512 app icon, shrunk to `size`
const drawLogo = (doc, x, y, size) => {
  const scale = size / 512;
  doc.save();
  doc.translate(x, y).scale(scale);
  doc
    .path("M352 168 A128 128 0 1 0 352 344")
    .lineWidth(64)
    .lineCap("round")
    .strokeColor(CREAM)
    .stroke();
  doc.circle(344, 256, 36).fillColor(GOLD).fill();
  doc.restore();
};

const drawHeader = (doc, receipt) => {
  // Full-width green band at the top of the page
  doc.rect(0, 0, PAGE_WIDTH, 92).fillColor(GREEN).fill();
  drawLogo(doc, MARGIN - 6, 20, 52);

  doc
    .fillColor(CREAM)
    .font("Helvetica-Bold")
    .fontSize(22)
    .text("CibusHub", MARGIN + 52, 28);
  doc
    .font("Helvetica")
    .fontSize(10)
    .text("Food delivery in Kumasi", MARGIN + 52, 54);

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("RECEIPT", MARGIN, 30, { width: CONTENT_WIDTH, align: "right", characterSpacing: 2 });
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(receipt.orderNumber, MARGIN, 52, { width: CONTENT_WIDTH, align: "right" });
};

// "Order number  CH-..." rows on the left, the PAID stamp on the right. Returns the next y.
const drawFacts = (doc, receipt, top) => {
  const facts = [
    ["Order number", receipt.orderNumber],
    ["Ordered", ghanaDateTime(receipt.placedAt)],
  ];
  if (receipt.paidAt) {
    facts.push(["Paid", ghanaDateTime(receipt.paidAt)]);
  }

  let y = top;
  for (const [label, value] of facts) {
    doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(label, MARGIN, y);
    doc
      .font("Helvetica-Bold")
      .fillColor(INK)
      .text(value, MARGIN + 90, y);
    y += 16;
  }

  // The stamp: a rounded outline with the word inside
  const badge = PAYMENT_BADGES[receipt.paymentStatus] || "PAID";
  doc.font("Helvetica-Bold").fontSize(11);
  const badgeWidth = doc.widthOfString(badge) + 28;
  const badgeX = PAGE_WIDTH - MARGIN - badgeWidth;
  doc
    .roundedRect(badgeX, top - 2, badgeWidth, 22, 11)
    .lineWidth(1.5)
    .strokeColor(GREEN)
    .stroke();
  doc.fillColor(GREEN).text(badge, badgeX, top + 4, { width: badgeWidth, align: "center" });

  return y;
};

// One titled box ("BILLED TO" / "FROM") with lines of text. Returns its height.
const drawPartyBox = (doc, x, y, width, title, lines) => {
  const padding = 12;
  let textY = y + padding + 16;
  // Measure first, so the border fits the text
  doc.font("Helvetica").fontSize(10);
  let height = padding * 2 + 16;
  for (const line of lines) {
    height += doc.heightOfString(line.text, { width: width - padding * 2 }) + 3;
  }

  doc.roundedRect(x, y, width, height, 8).lineWidth(1).strokeColor(LINE).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(MUTED)
    .text(title, x + padding, y + padding, { characterSpacing: 1 });

  for (const line of lines) {
    doc
      .font(line.bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(10)
      .fillColor(INK)
      .text(line.text, x + padding, textY, { width: width - padding * 2 });
    textY += doc.heightOfString(line.text, { width: width - padding * 2 }) + 3;
  }

  return height;
};

const drawParties = (doc, receipt, top) => {
  const gap = 14;
  const boxWidth = (CONTENT_WIDTH - gap) / 2;

  const customerLines = [
    { text: receipt.customerName, bold: true },
    { text: receipt.contactPhone },
  ];
  if (receipt.deliveryArea) customerLines.push({ text: receipt.deliveryArea });
  if (receipt.deliveryLandmark) customerLines.push({ text: receipt.deliveryLandmark });
  if (receipt.deliveryGhanaPostGps)
    customerLines.push({ text: "GPS: " + receipt.deliveryGhanaPostGps });

  const restaurantLines = [{ text: receipt.restaurantName, bold: true }];
  if (receipt.restaurantAddress) restaurantLines.push({ text: receipt.restaurantAddress });
  if (receipt.restaurantPhone) restaurantLines.push({ text: receipt.restaurantPhone });

  const leftHeight = drawPartyBox(doc, MARGIN, top, boxWidth, "BILLED TO", customerLines);
  const rightHeight = drawPartyBox(
    doc,
    MARGIN + boxWidth + gap,
    top,
    boxWidth,
    "FROM",
    restaurantLines,
  );

  return top + Math.max(leftHeight, rightHeight);
};

// Column positions for the items table
const COLUMNS = {
  item: { x: MARGIN, width: 260 },
  qty: { x: MARGIN + 265, width: 40 },
  unit: { x: MARGIN + 310, width: 100 },
  amount: { x: MARGIN + 415, width: CONTENT_WIDTH - 415 },
};

const drawTableHeader = (doc, y) => {
  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED);
  doc.text("ITEM", COLUMNS.item.x, y, { characterSpacing: 1 });
  doc.text("QTY", COLUMNS.qty.x, y, { width: COLUMNS.qty.width, align: "center" });
  doc.text("UNIT PRICE", COLUMNS.unit.x, y, { width: COLUMNS.unit.width, align: "right" });
  doc.text("AMOUNT", COLUMNS.amount.x, y, { width: COLUMNS.amount.width, align: "right" });
  doc
    .moveTo(MARGIN, y + 14)
    .lineTo(PAGE_WIDTH - MARGIN, y + 14)
    .lineWidth(1.5)
    .strokeColor(GREEN)
    .stroke();
  return y + 22;
};

const drawItems = (doc, receipt, top) => {
  let y = drawTableHeader(doc, top);

  for (const item of receipt.items) {
    const options = item.options.join(", ");
    doc.font("Helvetica-Bold").fontSize(10);
    let rowHeight = doc.heightOfString(item.name, { width: COLUMNS.item.width });
    if (options) {
      doc.font("Helvetica").fontSize(9);
      rowHeight += doc.heightOfString(options, { width: COLUMNS.item.width }) + 2;
    }

    // A long order continues on a new page, with the column titles again
    if (y + rowHeight + 12 > PAGE_BOTTOM) {
      doc.addPage();
      y = drawTableHeader(doc, MARGIN);
    }

    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK);
    doc.text(item.name, COLUMNS.item.x, y, { width: COLUMNS.item.width });
    if (options) {
      doc.font("Helvetica").fontSize(9).fillColor(MUTED);
      doc.text(options, COLUMNS.item.x, doc.y + 2, { width: COLUMNS.item.width });
    }

    doc.font("Helvetica").fontSize(10).fillColor(INK);
    doc.text(String(item.quantity), COLUMNS.qty.x, y, {
      width: COLUMNS.qty.width,
      align: "center",
    });
    doc.text(formatGhs(item.unitPricePesewas), COLUMNS.unit.x, y, {
      width: COLUMNS.unit.width,
      align: "right",
    });
    doc.text(formatGhs(item.lineTotalPesewas), COLUMNS.amount.x, y, {
      width: COLUMNS.amount.width,
      align: "right",
    });

    y += rowHeight + 8;
    doc
      .moveTo(MARGIN, y)
      .lineTo(PAGE_WIDTH - MARGIN, y)
      .lineWidth(0.75)
      .strokeColor(LINE)
      .stroke();
    y += 8;
  }

  return y;
};

const drawTotals = (doc, receipt, top) => {
  const x = PAGE_WIDTH - MARGIN - 220;
  const width = 220;
  let y = top + 4;

  const rows = [
    ["Subtotal", receipt.subtotalPesewas],
    ["Delivery fee", receipt.deliveryFeePesewas],
  ];
  if (receipt.serviceFeePesewas > 0) rows.push(["Service fee", receipt.serviceFeePesewas]);
  if (receipt.discountPesewas > 0) rows.push(["Discount", -receipt.discountPesewas]);

  for (const [label, pesewas] of rows) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(MUTED)
      .text(label, x + 10, y);
    doc.fillColor(INK).text(formatGhs(pesewas), x, y, { width: width - 10, align: "right" });
    y += 16;
  }

  // The green "Total paid" bar
  y += 4;
  doc.roundedRect(x, y, width, 28, 6).fillColor(GREEN).fill();
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(CREAM)
    .text("Total paid", x + 10, y + 8);
  doc.text(formatGhs(receipt.totalPesewas), x, y + 8, { width: width - 10, align: "right" });

  return y + 28;
};

const drawPayment = (doc, receipt, top) => {
  const height = 46;
  doc.roundedRect(MARGIN, top, CONTENT_WIDTH, height, 8).fillColor(CREAM).fill();

  const rows = [
    ["Paid with", (receipt.paymentMethod || "-") + " (Paystack)"],
    ["Reference", receipt.paymentReference || "-"],
  ];
  let y = top + 10;
  for (const [label, value] of rows) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(MUTED)
      .text(label, MARGIN + 14, y);
    doc.fillColor(INK).text(value, MARGIN + 90, y);
    y += 15;
  }

  return top + height;
};

const drawFooter = (doc) => {
  const y = 842 - 50;
  // The footer sits inside the bottom margin. pdfkit starts a new page when text goes past
  // the margin, so let this page use the margin area for the footer.
  doc.page.margins.bottom = 0;
  doc
    .moveTo(MARGIN, y - 10)
    .lineTo(PAGE_WIDTH - MARGIN, y - 10)
    .lineWidth(0.75)
    .strokeColor(LINE)
    .stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(INK)
    .text("Thank you for ordering with CibusHub!", MARGIN, y, {
      width: CONTENT_WIDTH,
      align: "center",
    });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(MUTED)
    .text(
      `All amounts are in Ghana cedis (GHS).  ${COMPANY_NAME} · ${COMPANY_ADDRESS} · ${CONTACT_EMAIL}`,
      MARGIN,
      y + 13,
      { width: CONTENT_WIDTH, align: "center" },
    );
};

// receipt: the object from buildReceipt(). Resolves to the PDF file as a Buffer.
export const buildReceiptPdf = (receipt) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      info: { Title: `CibusHub receipt ${receipt.orderNumber}`, Author: "CibusHub" },
    });

    // pdfkit writes the file in pieces; collect them and join at the end
    const pieces = [];
    doc.on("data", (piece) => pieces.push(piece));
    doc.on("end", () => resolve(Buffer.concat(pieces)));
    doc.on("error", reject);

    drawHeader(doc, receipt);
    let y = drawFacts(doc, receipt, 116);
    y = drawParties(doc, receipt, y + 18);
    y = drawItems(doc, receipt, y + 24);
    if (y + 140 > PAGE_BOTTOM) {
      doc.addPage();
      y = MARGIN;
    }
    y = drawTotals(doc, receipt, y);
    drawPayment(doc, receipt, y + 20);
    drawFooter(doc);

    doc.end();
  });
};
