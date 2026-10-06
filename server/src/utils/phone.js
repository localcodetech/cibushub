export const normalizeGhanaPhone = (input) => {
  if (typeof input !== "string") {
    return null;
  }

  let digits = input.replace(/[\s\-()]/g, "");

  if (digits.startsWith("+233")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("233")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (!/^[25]\d{8}$/.test(digits)) {
    return null;
  }

  return `+233${digits}`;
};
