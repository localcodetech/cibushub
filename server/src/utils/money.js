// The ONE place money is divided and rounded. Inputs are whole numbers (pesewas, metres);
// the answer is a whole number of pesewas, rounded half up: 2.5 -> 3, 2.4 -> 2.
export const divideAndRound = (numerator, denominator) => {
  return Math.floor((numerator * 2 + denominator) / (denominator * 2));
};
