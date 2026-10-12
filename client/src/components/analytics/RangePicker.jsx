import { cn } from "@/lib/utils";
import { presetRange } from "@/utils/dateRange";

const PRESETS = [
  { value: "today", label: "Today" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "custom", label: "Custom" },
];

// Today, 7 days, 30 days or two dates of your own [AC-ANL-01].
//   range: { preset, from, to } with dates like "2026-10-09"; onChange gets a new one
const RangePicker = ({ range, onChange }) => {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div role="group" aria-label="Period" className="flex rounded-lg border border-border p-1">
        {PRESETS.map((preset) => {
          const isChosen = range.preset === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              aria-pressed={isChosen}
              onClick={() =>
                onChange(
                  preset.value === "custom"
                    ? { ...range, preset: "custom" }
                    : { preset: preset.value, ...presetRange(preset.value) },
                )
              }
              className={cn(
                "min-h-10 rounded-md px-3 font-bold",
                isChosen ? "bg-primary text-primary-foreground" : "text-foreground",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {range.preset === "custom" && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[13px] text-muted-foreground">From</span>
            <input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(event) => onChange({ ...range, from: event.target.value })}
              className="h-12 w-full rounded-md border border-input bg-background px-2 text-base"
            />
          </label>
          <label className="block">
            <span className="text-[13px] text-muted-foreground">To</span>
            <input
              type="date"
              value={range.to}
              min={range.from}
              onChange={(event) => onChange({ ...range, to: event.target.value })}
              className="h-12 w-full rounded-md border border-input bg-background px-2 text-base"
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default RangePicker;
