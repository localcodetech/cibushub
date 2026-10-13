import { cn } from "@/lib/utils";

// An on / off switch for something that takes effect at once (no Save button):
// rider online, restaurant taking orders, a dish on sale.
// role="switch" + aria-checked: screen readers say "on" or "off".
//
// <Switch checked={isOpen} onChange={setOpen} label="Taking orders" />
//
// checked:  on or off
// onChange: gets the new value (true / false)
// label:    what it switches, read out by screen readers (the screen shows it nearby)
// size:     md (the big one at the top of a page) | sm (inside a list row)
// The tap area is always at least 44px tall, even for the small switch.
const SIZES = {
  md: { track: "h-9 w-16", knob: "size-7", on: "translate-x-7" },
  sm: { track: "h-7 w-12", knob: "size-5", on: "translate-x-5" },
};

const Switch = ({ checked, onChange, label, disabled = false, size = "md" }) => {
  const style = SIZES[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-11 shrink-0 items-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
    >
      <span
        className={cn(
          "relative rounded-full transition-colors",
          style.track,
          checked ? "bg-success" : "bg-muted-foreground/40",
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 rounded-full bg-white shadow transition-transform",
            style.knob,
            checked && style.on,
          )}
        />
      </span>
    </button>
  );
};

export default Switch;
