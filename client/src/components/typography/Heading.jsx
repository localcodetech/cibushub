import { cn } from "@/lib/utils";

// Text size for each heading level, from the design guide's type scale
const SIZES = {
  1: "text-[26px] leading-tight tracking-tight md:text-[30px]", // page title
  2: "text-xl leading-snug", // section heading (20px)
  3: "text-lg leading-snug", // card title (18px)
  4: "text-base", // 16px
  5: "text-[15px]",
  6: "text-[13px]",
};

// One heading for the whole app: <Heading level={1}>My orders</Heading> draws an <h1>.
// className lets one page add extra classes, e.g. className="mt-4".
const Heading = ({ level = 2, className, children }) => {
  // A variable that holds a tag name can be used like a tag: "h" + 1 gives <h1>
  const Tag = "h" + level;

  return (
    <Tag className={cn("font-heading font-bold text-foreground", SIZES[level], className)}>
      {children}
    </Tag>
  );
};

export default Heading;
