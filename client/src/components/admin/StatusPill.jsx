import { cn } from "@/lib/utils";

// A small coloured label, e.g. "Live" (green) or "Suspended" (red).
// tone: "green" | "gold" | "red" | "muted"
const TONES = {
  green: "bg-primary/10 text-primary",
  gold: "bg-gold/20 text-foreground",
  red: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

const StatusPill = ({ label, tone = "muted" }) => {
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[13px] font-bold", TONES[tone])}>
      {label}
    </span>
  );
};

export default StatusPill;
