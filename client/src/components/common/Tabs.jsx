import { cn } from "@/lib/utils";

// Pick one view of the page: exactly one option is always chosen (a segmented control).
// For filtering a list (zero or more on), use Chips instead.
//
// <Tabs
//   label="Period"
//   value={period}
//   onChange={setPeriod}
//   options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }]}
// />
//
// options: [{ value, label, count?, urgent? }]
//   count:  a number shown after the label (e.g. orders in that column)
//   urgent: the count is something to answer now: gold and gently pulsing
//           (no pulse for reduced-motion users)
// fill:    stretch the options to share the full width (good for 2 to 4 short options)
// Each option is a toggle button (aria-pressed), so screen readers hear which one is on.
// Too many options for the screen scroll sideways instead of wrapping.
const Tabs = ({ label, value, onChange, options, fill = false, className }) => {
  return (
    <div className={cn("-mx-4 overflow-x-auto px-4", className)}>
      <div
        role="group"
        aria-label={label}
        className={cn(
          "inline-flex gap-1 rounded-lg border border-border bg-card p-1",
          fill && "flex w-full",
        )}
      >
        {options.map((option) => {
          const isChosen = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isChosen}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md px-3 font-bold whitespace-nowrap",
                "transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                fill && "flex-1",
                isChosen
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-primary/[0.06]",
              )}
            >
              {option.label}
              {option.count !== undefined && (
                <span
                  className={cn(
                    "min-w-6 rounded-full px-1.5 text-center text-[13px]",
                    option.urgent && option.count > 0
                      ? "bg-gold text-gold-foreground motion-safe:animate-pulse"
                      : isChosen
                        ? "bg-primary-foreground/20"
                        : "bg-muted",
                  )}
                >
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Tabs;
