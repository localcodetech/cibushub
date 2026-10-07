import { randomInt } from "node:crypto";

// A short reference people can read out on the phone, e.g. CH-261008-482193 [AC-CHK-08]
// Date part: year, month, day in Accra time (the same as UTC). Random part: 6 digits.
// The database's unique rule is the final guard; a clash just makes the order retry.
export const generateOrderNumber = (moment = new Date()) => {
  const year = String(moment.getUTCFullYear()).slice(2);
  const month = String(moment.getUTCMonth() + 1).padStart(2, "0");
  const day = String(moment.getUTCDate()).padStart(2, "0");
  const randomPart = String(randomInt(0, 1000000)).padStart(6, "0");

  return `CH-${year}${month}${day}-${randomPart}`;
};
