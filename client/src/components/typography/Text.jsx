import { cn } from "@/lib/utils";

// Text sizes from the design guide's type scale
const SIZES = {
  body: "text-base", // 16px, normal reading text
  small: "text-[15px]", // secondary text
  caption: "text-[13px]", // labels under photos, timestamps
};

// One paragraph style for the whole app.
// <Text>Hello</Text>                     -> normal paragraph
// <Text size="small" muted>Hello</Text>  -> smaller, grey text
// <Text as="span">Hello</Text>           -> a <span> instead of a <p>, for text inside a line
const Text = ({ as = "p", size = "body", muted = false, className, children }) => {
  const Tag = as;
  const colour = muted ? "text-muted-foreground" : "text-foreground";

  return <Tag className={cn(SIZES[size], colour, className)}>{children}</Tag>;
};

export default Text;
