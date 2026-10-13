import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Filters for a list: rounded chips that turn on and off. A chip that is on shows a tick, so
// "on" never depends on colour alone. To switch between views of a page, use Tabs instead.
//
// <ChipRow label="Filters">
//   <Chip selected={openNow} onClick={() => setOpenNow(!openNow)}>Open now</Chip>
//   <Chip selected={cuisine === "rice"} onClick={...}>Rice</Chip>
// </ChipRow>

// A row of chips that scrolls sideways on small screens instead of wrapping
export const ChipRow = ({ label, className, children }) => {
  return (
    <div className={cn("-mx-4 overflow-x-auto px-4 pb-1", className)}>
      <div role="group" aria-label={label} className="flex gap-2">
        {children}
      </div>
    </div>
  );
};

// One chip: a toggle button (aria-pressed tells screen readers whether it is on)
//   count: optional number after the label
export const Chip = ({ selected = false, onClick, count, children }) => {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        // Fully round: the design guide keeps round pills for filters
        "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[15px] font-bold whitespace-nowrap",
        "transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-foreground hover:border-primary/40",
      )}
    >
      {selected && <Check size={16} strokeWidth={3} aria-hidden="true" />}
      {children}
      {count !== undefined && (
        <span className="min-w-6 rounded-full bg-muted px-1.5 text-center text-[13px] text-foreground">
          {count}
        </span>
      )}
    </button>
  );
};
