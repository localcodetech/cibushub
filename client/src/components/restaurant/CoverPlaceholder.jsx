import { cn } from "@/lib/utils";

// What shows when a restaurant has no cover photo yet: a short green band with its
// initials, instead of a tall empty box. Decorative: the name is always written nearby.
//   size: card (restaurant lists) | header (the restaurant's own page)

// "Maame Akua's Chop Bar" -> "MA"
const initialsOf = (name = "") => {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

const CoverPlaceholder = ({ name, size = "card", dimmed = false }) => {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex w-full items-center justify-center bg-primary/10",
        size === "header" ? "h-32 rounded-xl" : "h-20",
        dimmed && "opacity-60",
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-lg bg-primary font-heading text-lg font-bold text-primary-foreground">
        {initialsOf(name)}
      </span>
    </div>
  );
};

export default CoverPlaceholder;
