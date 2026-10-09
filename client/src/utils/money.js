// Turn pesewas (whole numbers) into text a person reads: 7072 -> "GHS 70.72" [AC-GLOBAL-08].
// Use this for EVERY price on screen. Never do maths on the text it returns.
// Same output as the server's formatGhs (server/src/utils/money.js).


export const formatMoney = (pesewas) => {
  // Discounts can be negative: format the size, then put the minus sign in front
  const sign = pesewas < 0 ? "-" : "";
  const amount = Math.abs(pesewas);

  // 7072 -> 70 cedis and 72 pesewas. Whole-number maths only, no decimals.
  const cedis = Math.floor(amount / 100);
  const remainder = String(amount % 100).padStart(2, "0");

  return `${sign}GHS ${cedis}.${remainder}`;
};
