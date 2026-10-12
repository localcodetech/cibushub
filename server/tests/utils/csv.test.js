import { describe, expect, it } from "vitest";
import { cedisText, csvCell, csvRow } from "../../src/utils/export/csv.js";

describe("CSV cells [AC-ANL-04]", () => {
  it("turns formulas into plain text, so a spreadsheet never runs them", () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(csvCell("+233 kitchen")).toBe("'+233 kitchen");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@chef")).toBe("'@chef");
  });

  it("quotes commas, quotes and line breaks, and leaves plain text alone", () => {
    expect(csvCell("Adum, Kumasi")).toBe('"Adum, Kumasi"');
    expect(csvCell('Auntie "Muni"')).toBe('"Auntie ""Muni"""');
    expect(csvCell("Golden Pot")).toBe("Golden Pot");
    expect(csvCell(null)).toBe("");
    expect(csvRow(["a", 1, null])).toBe("a,1,\r\n");
  });

  it("writes pesewas as cedis without decimal maths", () => {
    expect(cedisText(7072)).toBe("70.72");
    expect(cedisText(5)).toBe("0.05");
    expect(cedisText(0)).toBe("0.00");
  });
});
