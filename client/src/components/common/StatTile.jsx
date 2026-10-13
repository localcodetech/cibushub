import { cn } from "@/lib/utils";
import Card from "./Card";

// One number with its label: the headline figures on dashboards, analytics and earnings.
//
// <StatTile label="Orders paid today" value={9} />
// <StatTile label="Your earnings" value={formatMoney(2350)} note="3 deliveries" size="lg" />
//
// value:  already formatted text or a number
// note:   optional small line under the value
// size:   md (dashboard grids) | lg (the one figure a page is about, e.g. today's earnings)
// tone:   passed to Card (default | highlight | danger | quiet)
// as:     the wrapper element; "div" by default (use "li" inside a list of tiles)

const StatTile = ({ label, value, note, size = "md", tone = "default", as = "div", className }) => {
  return (
    <Card as={as} tone={tone} padding={size === "lg" ? "lg" : "md"} className={className}>
      <p className="text-[15px] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-heading font-bold", size === "lg" ? "text-4xl" : "text-2xl")}>
        {value}
      </p>
      {note && <p className="mt-1 text-[13px] text-muted-foreground">{note}</p>}
    </Card>
  );
};

export default StatTile;
