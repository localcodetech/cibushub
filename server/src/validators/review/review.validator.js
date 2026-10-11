import { z } from "zod";
import { REVIEW_RULES } from "../../utils/review/reviewRules.js";
import { paginationFields } from "../pagination.js";

const stars = z
  .number({ error: "Choose 1 to 5 stars" })
  .int("Choose 1 to 5 stars")
  .min(1, "Choose 1 to 5 stars")
  .max(5, "Choose 1 to 5 stars");

// Writing or changing a review [AC-REV-02]: the restaurant's stars are required,
// the rider's stars and the comment are optional. An empty comment is no comment.
// The text is kept exactly as typed and always shown as plain text [AC-REV-08].
export const reviewSchema = z
  .object({
    rating: stars,
    riderRating: stars.nullable().optional(),
    comment: z
      .string()
      .trim()
      .max(REVIEW_RULES.commentMaxLength, `At most ${REVIEW_RULES.commentMaxLength} characters`)
      .transform((text) => (text === "" ? null : text))
      .nullable()
      .optional(),
  })
  .strict();

// ?page=1&pageSize=20
export const listReviewsSchema = z.object({ ...paginationFields }).strict();

// The owner's list: ?unanswered=true&page=1
export const listOwnerReviewsSchema = z
  .object({
    unanswered: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    ...paginationFields,
  })
  .strict();

// The owner's one public reply [AC-REV-06]: plain text, shown as text
export const replySchema = z
  .object({
    reply: z
      .string({ error: "Write a reply" })
      .trim()
      .min(2, "Write a reply")
      .max(REVIEW_RULES.commentMaxLength, `At most ${REVIEW_RULES.commentMaxLength} characters`),
  })
  .strict();

// Admins: ?hidden=true&restaurantId=...&maxRating=2&page=1
export const adminListReviewsSchema = z
  .object({
    hidden: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    restaurantId: z.uuid("Unknown restaurant").optional(),
    maxRating: z.coerce.number().int().min(1).max(5).optional(),
    ...paginationFields,
  })
  .strict();

// Hiding or showing a review needs a reason, for the audit log [AC-REV-07, AC-ADM-07]
export const moderateReviewSchema = z
  .object({
    reason: z
      .string({ error: "Give a reason" })
      .trim()
      .min(5, "Give a reason (at least 5 characters)")
      .max(255, "At most 255 characters"),
  })
  .strict();
