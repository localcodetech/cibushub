// The ONE place money is divided and rounded. Inputs are whole numbers (pesewas, metres);
// the answer is a whole number of pesewas, rounded half up: 2.5 -> 3, 2.4 -> 2.
export const divideAndRound = (numerator, denominator) => {
  return Math.floor((numerator * 2 + denominator) / (denominator * 2));
};

// 7072 -> "GHS 70.72": for words a person reads (SMS, email). Never used for maths. [AC-GLOBAL-08]
export const formatGhs = (pesewas) => {
  const cedis = Math.floor(pesewas / 100);
  const remainder = String(pesewas % 100).padStart(2, "0");
  return `GHS ${cedis}.${remainder}`;
};
