// Turning rows into CSV text for spreadsheets [AC-ANL-04].

// Cells starting with these are formulas in Excel and Google Sheets. A restaurant called
// "=HYPERLINK(...)" must show as text, not run: a ' in front makes it plain text (OWASP).
const FORMULA_START = /^[=+\-@\t\r]/;

// One value as a safe CSV cell: formulas defused, and quotes around anything with a comma,
// quote or line break (a quote inside is doubled: She said "hi" -> "She said ""hi""")
export const csvCell = (value) => {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (FORMULA_START.test(text)) {
    text = "'" + text;
  }
  if (/[",\r\n]/.test(text)) {
    text = '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
};

// One line of the file, ending with CRLF as the CSV standard (RFC 4180) says
export const csvRow = (values) => values.map(csvCell).join(",") + "\r\n";

// 7072 pesewas -> "70.72": a plain number a spreadsheet can add up. Whole-number maths only.
export const cedisText = (pesewas) => {
  const amount = Number(pesewas || 0);
  return Math.floor(amount / 100) + "." + String(amount % 100).padStart(2, "0");
};
