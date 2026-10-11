import env from "../../../config/env/env.js";
import { CONTACT_EMAIL } from "../../../utils/legal.js";

// The CibusHub email layout [AC-NOTIF-05]. Plain functions that build HTML strings:
// tables and inline styles, because Gmail, Outlook and phone mail apps ignore most modern
// CSS. Every email also gets a plain-text version, built from the same parts.

// Brand colours, from docs/frontendDesign.md
const GREEN = "#123c2a"; // Forest Green: leads the brand
const GOLD = "#c89b3c"; // Ashanti Gold: small highlights only, never text on cream
const TERRACOTTA = "#b9573e"; // rare
const COCOA = "#2b2118"; // text
const PAGE = "#fbf8f1";
const CREAM = "#f7f0df"; // Warm Cream
const CARD = "#ffffff";
const TEXT = COCOA;
const MUTED = "#6e6458";
const LINE = "#e6ddcb";

// A thin kente-inspired stripe across the top of the card: woven-cloth rhythm in our own
// colours. (Adinkra symbols are NOT used as decoration: each has one meaningful job.)
const KENTE = [
  [GOLD, 40],
  [GREEN, 18],
  [GOLD, 10],
  [TERRACOTTA, 14],
  [COCOA, 8],
  [GOLD, 40],
  [GREEN, 28],
  [GOLD, 10],
  [COCOA, 8],
  [TERRACOTTA, 14],
  [GOLD, 40],
  [GREEN, 18],
  [GOLD, 10],
  [COCOA, 8],
  [TERRACOTTA, 14],
  [GOLD, 40],
  [GREEN, 28],
];
const kenteStripe = () =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>` +
  KENTE.map(
    ([colour, width]) =>
      `<td width="${width}" height="6" style="height:6px;line-height:6px;font-size:0;background:${colour}">&nbsp;</td>`,
  ).join("") +
  `</tr></table>`;

// The CibusHub mark, drawn with HTML so it shows even when a mail app blocks images:
// a green rounded square, a cream "C" (also a plate rim), and the gold dot.
// The name stays Forest Green: gold text on cream is too faint to read (design guide).
const logo = () =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>` +
  `<td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;border-radius:12px;background:${GREEN};font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;line-height:44px;color:${CREAM}">C<span style="display:inline-block;width:8px;height:8px;margin-left:-6px;border-radius:50%;background:${GOLD};vertical-align:middle"></span></td>` +
  `<td style="padding-left:12px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.3px;color:${GREEN}">CibusHub</td>` +
  `</tr></table>`;

// Anything that came from a person (names, notes) is escaped: it can never become HTML
export const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// A link into the app, e.g. appLink("/customer/orders/123")
export const appLink = (path) => env.CLIENT_URL.replace(/\/$/, "") + path;

// ── Building blocks. Each returns { html, text } ──

export const paragraph = (text) => ({
  html: `<p style="margin:0 0 20px;font-size:16px;line-height:26px;color:${TEXT}">${escapeHtml(text)}</p>`,
  text,
});

// A one-time code, big and easy to copy
export const codeBox = (code) => ({
  html: `<p style="margin:8px 0 28px;text-align:center"><span style="display:inline-block;padding:16px 28px;border-radius:14px;background:${CREAM};border-bottom:3px solid ${GOLD};font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:${GREEN}">${escapeHtml(code)}</span></p>`,
  text: `\n    ${code}\n`,
});

export const button = (label, url) => ({
  html: `<p style="margin:12px 0 28px"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:${GREEN};color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.2px;text-decoration:none">${escapeHtml(label)}&nbsp;&nbsp;<span style="color:${GOLD}">&rarr;</span></a></p>`,
  text: `${label}: ${url}`,
});

// Label / value rows, e.g. [["Subtotal", "GHS 60.00"], ...]; bold: the last row stands out
export const amountRows = (rows, { boldLast = false } = {}) => ({
  html:
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse">` +
    rows
      .map(([label, value], index) => {
        const isBold = boldLast && index === rows.length - 1;
        const weight = isBold ? "700" : "400";
        const border = isBold ? `border-top:1px solid ${LINE};` : "";
        const size = isBold ? "17px" : "15px";
        const padding = isBold ? "14px 0 4px" : "8px 0";
        return `<tr><td style="${border}padding:${padding};font-size:${size};font-weight:${weight};color:${TEXT}">${escapeHtml(label)}</td><td align="right" style="${border}padding:${padding};font-size:${size};font-weight:${weight};color:${TEXT};white-space:nowrap">${escapeHtml(value)}</td></tr>`;
      })
      .join("") +
    `</table>`,
  text: rows.map(([label, value]) => `${label}: ${value}`).join("\n"),
});

export const smallPrint = (text) => ({
  html: `<p style="margin:0 0 14px;font-size:13px;line-height:21px;color:${MUTED}">${escapeHtml(text)}</p>`,
  text,
});

// ── The whole email ──
//   subject:   the subject line
//   preheader: the grey preview line in the inbox (hidden in the email itself)
//   heading:   the big title
//   blocks:    building blocks from above, in order
// Returns { subject, html, text }
export const renderEmail = ({ subject, preheader, heading, blocks }) => {
  const year = new Date().getUTCFullYear();
  const footerText = `CibusHub · Kumasi, Ghana · ${CONTACT_EMAIL}`;
  const whyText =
    "You're getting this email because of your CibusHub account or order. It's not marketing.";

  const dot = `<span style="color:${GOLD}">&nbsp;&bull;&nbsp;</span>`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${PAGE};font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE}">
<tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 4px 24px">${logo()}</td></tr>
<tr><td style="background:${CARD};border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(43,33,24,0.06)">
${kenteStripe()}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:36px 32px 16px">
<h1 style="margin:0 0 12px;font-size:24px;line-height:31px;font-weight:700;letter-spacing:-0.3px;color:${TEXT}">${escapeHtml(heading)}</h1>
<div style="width:40px;height:3px;margin:0 0 24px;border-radius:2px;background:${GOLD};font-size:0;line-height:0">&nbsp;</div>
${blocks.map((block) => block.html).join("\n")}
</td></tr></table>
</td></tr>
<tr><td style="padding:28px 8px 0;font-size:12px;line-height:20px;color:${MUTED}">
${escapeHtml(whyText)}<br>
CibusHub${dot}Kumasi, Ghana${dot}<a href="mailto:${CONTACT_EMAIL}" style="color:${GREEN};text-decoration:none">${CONTACT_EMAIL}</a><br>
© ${year} CibusHub
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    heading,
    "",
    ...blocks.map((block) => block.text),
    "",
    "--",
    whyText,
    footerText,
  ].join("\n");

  return { subject, html, text };
};
