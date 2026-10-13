import { Award } from "lucide-react";

// A gold badge for recognition that was earned: top-rated restaurants and riders.
//   <TopRatedBadge label="Top rated" explain="Customers rate it 4.5 stars or more" />
// Gold with Cocoa text (design guide: gold is never text on cream).
// explain: why it was earned; screen readers hear it, and it shows on hover.
const TopRatedBadge = ({ label, explain }) => {
  return (
    <span
      title={explain}
      className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-gold px-2 py-0.5 text-[13px] font-bold text-gold-foreground"
    >
      <Award size={14} strokeWidth={2.5} aria-hidden="true" />
      {label}
      <span className="sr-only">: {explain}</span>
    </span>
  );
};

export default TopRatedBadge;
