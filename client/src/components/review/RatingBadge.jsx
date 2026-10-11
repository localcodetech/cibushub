import { Star } from "lucide-react";

// The small rating on restaurant cards and pages: "★ 4.3 (12 reviews)", or "New" before the
// first review [AC-REV-04, AC-REV-05].
// averageRating and reviewCount come from the server, which keeps them up to date.
const RatingBadge = ({ averageRating, reviewCount }) => {
  if (!reviewCount) {
    return <span className="text-muted-foreground">New</span>;
  }

  let countText = reviewCount + " reviews";
  if (reviewCount === 1) {
    countText = "1 review";
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Star size={14} className="fill-gold text-gold" aria-hidden="true" />
      <span className="font-bold text-foreground">{averageRating.toFixed(1)}</span>
      <span>({countText})</span>
    </span>
  );
};

export default RatingBadge;
