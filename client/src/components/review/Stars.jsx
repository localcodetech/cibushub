import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STAR_NUMBERS = [1, 2, 3, 4, 5];

// Read-only stars, e.g. 4 -> four gold stars and one empty one.
// Screen readers hear "4 out of 5 stars" once, not five separate icons.
//
// <Stars rating={4} />  <Stars rating={4.3} size={14} />
const Stars = ({ rating, size = 16, className }) => {
  // 4.3 shows 4 full stars, 4.5 shows 5: the nearest whole star
  const fullStars = Math.round(rating);

  return (
    <span
      role="img"
      aria-label={rating + " out of 5 stars"}
      className={cn("inline-flex gap-0.5", className)}
    >
      {STAR_NUMBERS.map((number) => (
        <Star
          key={number}
          size={size}
          aria-hidden="true"
          className={number <= fullStars ? "fill-gold text-gold" : "text-border"}
        />
      ))}
    </span>
  );
};

export default Stars;
