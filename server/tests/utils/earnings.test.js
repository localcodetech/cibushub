import { describe, expect, it } from "vitest";
import { splitEarnings } from "../../src/utils/order/earnings.js";

describe("splitEarnings", () => {
  it("takes 10% commission from the food and gives the rider the whole delivery fee", () => {
    const shares = splitEarnings({
      subtotalPesewas: 9500,
      deliveryFeePesewas: 1072,
      commissionPercent: 10,
    });

    expect(shares).toEqual({
      commissionPercent: 10,
      commissionPesewas: 950,
      restaurantEarningsPesewas: 8550,
      riderEarningsPesewas: 1072,
    });
  });

  it("rounds half a pesewa up, and the restaurant's part plus commission is always the subtotal", () => {
    // 10% of 3505 is 350.5 -> 351
    const shares = splitEarnings({
      subtotalPesewas: 3505,
      deliveryFeePesewas: 500,
      commissionPercent: 10,
    });

    expect(shares.commissionPesewas).toBe(351);
    expect(shares.restaurantEarningsPesewas).toBe(3154);
    expect(shares.commissionPesewas + shares.restaurantEarningsPesewas).toBe(3505);
  });
});
