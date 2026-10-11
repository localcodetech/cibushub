// When a review may be written and changed [AC-REV-03]
export const REVIEW_RULES = {
  // Write it within 7 days of delivery
  writeWithinDays: 7,
  // Change it within 24 hours of writing it
  editWithinHours: 24,
  commentMaxLength: 500,
};

// 4 stars over 2 reviews... total 9, count 2 -> 4.5 (one decimal). No reviews -> null.
export const averageRating = (total, count) => {
  if (!count) {
    return null;
  }
  return Math.round((total / count) * 10) / 10;
};
