import { divideAndRound } from "../money.js";

// Who gets what from one order, documented in docs/pricing.md.
// The commission is a platform setting [AC-SADM-02]; the rider always gets the whole delivery fee.
export const EARNINGS_RULES = {
  riderSharePercent: 100,
};

// Splits one order's money. The restaurant's part is "what is left", so the parts always add up.
// commissionPercent: from the settings the order was priced with
export const splitEarnings = ({ subtotalPesewas, deliveryFeePesewas, commissionPercent }) => {
  const commissionPesewas = divideAndRound(subtotalPesewas * commissionPercent, 100);
  const riderEarningsPesewas = divideAndRound(
    deliveryFeePesewas * EARNINGS_RULES.riderSharePercent,
    100,
  );

  return {
    commissionPercent,
    commissionPesewas,
    restaurantEarningsPesewas: subtotalPesewas - commissionPesewas,
    riderEarningsPesewas,
  };
};
