import { z } from "zod";

const wholeNumber = (min, max, unit) =>
  z
    .number({ error: "Enter a number" })
    .int("Use a whole number")
    .min(min, `At least ${min} ${unit}`)
    .max(max, `At most ${max} ${unit}`);

// Each setting a super admin can change, and its sensible limits [AC-SADM-02].
// All optional: send only the ones that change. Money is whole pesewas.
export const updateSettingsSchema = z
  .object({
    settings: z
      .object({
        deliveryBasePesewas: wholeNumber(0, 10000, "pesewas"),
        deliveryPerKmPesewas: wholeNumber(0, 5000, "pesewas"),
        serviceFeePesewas: wholeNumber(0, 5000, "pesewas"),
        commissionPercent: wholeNumber(0, 50, "%"),
        searchRadiusKm: wholeNumber(1, 30, "km"),
        widenedRadiusKm: wholeNumber(1, 50, "km"),
        offerSeconds: wholeNumber(20, 300, "seconds"),
        restaurantResponseMinutes: wholeNumber(2, 30, "minutes"),
        unpaidOrderMinutes: wholeNumber(10, 120, "minutes"),
        // Only Paystack until cash on delivery is built
        paymentMethods: z.array(z.enum(["PAYSTACK"])).min(1, "Keep at least one way to pay"),
      })
      .partial()
      .strict()
      .refine((settings) => Object.keys(settings).length > 0, "Change at least one setting"),
    reason: z
      .string("Give a reason")
      .trim()
      .min(10, "Give a clear reason (at least 10 characters)")
      .max(500, "Reason is too long"),
  })
  .strict();
