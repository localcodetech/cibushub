import { z } from "zod";
import { DOCUMENT_TYPES } from "../../models/restaurant/restaurantDocument.model.js";

// /documents/FDA_CERTIFICATE → the type must be one we know
export const documentTypeParamsSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
});

// Admin's verdict on one document: a rejection must say what is wrong
export const reviewDocumentSchema = z
  .object({
    status: z.enum(["VERIFIED", "REJECTED"]),
    reason: z
      .string()
      .trim()
      .min(10, "Give a clear reason (at least 10 characters)")
      .max(500, "Reason is too long")
      .optional(),
  })
  .strict()
  .refine((verdict) => verdict.status !== "REJECTED" || verdict.reason, {
    path: ["reason"],
    message: "Say why the document is rejected",
  });
