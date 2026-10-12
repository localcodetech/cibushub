// "GHA-123456789-0" -> "GHA-•••••••89-0": enough to tell two cards apart on a list, not enough
// to copy. The full number is shown only through the audited "reveal" (plan-review, Step 13).
export const maskGhanaCard = (number) => {
  const match = /^GHA-(\d{9})-(\d)$/.exec(String(number || ""));
  if (!match) {
    return number ? "•••" : null;
  }
  return `GHA-${"•".repeat(7)}${match[1].slice(-2)}-${match[2]}`;
};
