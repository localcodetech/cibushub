import { z } from "zod";

// An admin cancels with a reason and chooses the refund [AC-CANC-03, AC-ADM-08]
export const adminCancelOrderSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(10, "Give a clear reason (at least 10 characters)")
      .max(500, "Reason is too long"),
    refund: z.enum(["FULL", "PARTIAL", "NONE"], "Choose FULL, PARTIAL or NONE"),
    // Only for a PARTIAL refund, in whole pesewas
    refundAmountPesewas: z.number().int("Use whole pesewas").min(1).optional(),
  })
  .strict()
  .refine((body) => (body.refund === "PARTIAL") === (body.refundAmountPesewas !== undefined), {
    message: "Send refundAmountPesewas for a PARTIAL refund, and only then",
    path: ["refundAmountPesewas"],
  });
