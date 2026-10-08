import { divideAndRound } from "../money.js";

// Who gets what from one order, documented in docs/pricing.md
export const EARNINGS_RULES = {
  commissionPercent: 10, // CibusHub keeps 10% of the food subtotal
  riderSharePercent: 100, // the rider gets the whole delivery fee
};

// Splits one order's money. The restaurant's part is "what is left", so the parts always add up
export const splitEarnings = ({ subtotalPesewas, deliveryFeePesewas }) => {
  const commissionPesewas = divideAndRound(subtotalPesewas * EARNINGS_RULES.commissionPercent, 100);
  const riderEarningsPesewas = divideAndRound(
    deliveryFeePesewas * EARNINGS_RULES.riderSharePercent,
    100,
  );

  return {
    commissionPercent: EARNINGS_RULES.commissionPercent,
    commissionPesewas,
    restaurantEarningsPesewas: subtotalPesewas - commissionPesewas,
    riderEarningsPesewas,
  };
};
