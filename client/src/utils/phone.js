// true if the text is a Ghana mobile number in any common form:

// "024 123 4567", "0241234567", "233241234567" or "+233241234567" [AC-AUTH-04].

// Same rule as the server (server/src/utils/phone.js); the server still does the final check.

export const isGhanaPhone = (input) => {
  // Remove spaces, dashes and brackets: "024 123-4567" -> "0241234567"
  let digits = input.replace(/[\s\-()]/g, "");

  // Remove the start, leaving the 9 digits after it
  if (digits.startsWith("+233")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("233")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Ghana mobile numbers start with 2 or 5, then 8 more digits
  return /^[25]\d{8}$/.test(digits);
};
