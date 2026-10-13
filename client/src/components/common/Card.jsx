import { cn } from "@/lib/utils";

// A box for things that belong together (a restaurant, an order, the price summary).

// Depth comes from the tone and the border, never from shadows (shadows are only for
// floating layers: sheets and dropdowns).
//
// <Card>...</Card>
// <Card tone="highlight">The one thing to look at first</Card>
// <Card as={Link} to="/restaurants/1" interactive>...</Card>   -> the whole card is tappable
// <Card as="figure" padding="none">...</Card>
//
// tone:
//   default    cream surface: most cards
//   highlight  green tint: the most important card on the page (e.g. a delivery in progress)
//   danger     red tint: a warning about this thing (e.g. "Suspended")
//   quiet      page-coloured: secondary details next to a default card, so cream doesn't
//              stack on cream
// interactive: the card is a link or button. It lifts with a soft shadow on hover, presses in
//              when tapped (colour only for reduced-motion users) and shows the focus ring.
// padding:     none | sm (12px) | md (16px, default) | lg (20px, 24px on wider screens)
// as:          the element or component to draw ("div" by default)
// ...props:    passed on (e.g. to, onClick, aria-label)
const TONES = {
  default: "border-border bg-card",
  highlight: "border-primary/40 bg-primary/[0.06]",
  danger: "border-destructive/50 bg-destructive/[0.06]",
  quiet: "border-border bg-background",
};

const PADDING = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5 sm:p-6",
};

// Hover: the card lifts a little with a soft green shadow; tap: it presses in.
// "group" lets what's inside react too (e.g. the photo zooms). Reduced motion: colour only.
const INTERACTIVE =
  "group cursor-pointer transition-[background-color,border-color,translate,scale,box-shadow] duration-200 ease-out " +
  "hover:-translate-y-1 hover:border-primary/40 hover:bg-primary/[0.03] hover:shadow-lg hover:shadow-primary/10 " +
  "active:translate-y-0 active:scale-[0.98] active:shadow-sm " +
  "motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 " +
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none";

const Card = ({
  as: Tag = "div",
  tone = "default",
  padding = "md",
  interactive = false,
  className,
  children,
  ...props
}) => {
  return (
    <Tag
      className={cn(
        "block rounded-lg border text-card-foreground",
        TONES[tone],
        PADDING[padding],
        interactive && INTERACTIVE,
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
};

// The title line of a card, with an optional action on the right (e.g. "Change", "History")
//   <CardHeader title="Contact" action={<Link to="...">Edit</Link>} />
//   level: the heading level that fits the page (3 by default, under the page's h1 and h2s)
export const CardHeader = ({ title, action, level = 3, className }) => {
  const Heading = "h" + level;
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <Heading className="font-heading text-[15px] font-bold text-foreground">{title}</Heading>
      {action}
    </div>
  );
};

export default Card;
