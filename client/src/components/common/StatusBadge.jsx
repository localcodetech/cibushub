import { ArrowRight, CircleCheck, CircleDashed, CircleX, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// The one status label in the app: orders, restaurants, riders, accounts, payments.
// Each tone is a group of statuses, with its own colour AND icon, so colour is never the
// only signal (AC-UX-08).
//
// <StatusBadge label="Preparing" tone="progress" />
// <StatusBadge label="Default" tone="progress" icon={null} />   -> a plain label, no icon
//
// tone:
//   neutral    nothing is happening yet       (Waiting for payment, Draft)
//   attention  someone needs to act           (Sent to restaurant, Ready, Waiting for review)
//   progress   moving along                   (Accepted, Preparing, On the way)
//   success    done and good                  (Delivered, Live, Active)
//   danger     ended badly or blocked         (Rejected, Cancelled, Suspended)
// icon: a Lucide icon to use instead of the tone's own, or null for none
const TONES = {
  neutral: { classes: "bg-muted text-muted-foreground", icon: CircleDashed },
  attention: { classes: "bg-gold/20 text-foreground", icon: Clock },
  progress: { classes: "bg-primary/10 text-primary", icon: ArrowRight },
  success: { classes: "bg-success text-success-foreground", icon: CircleCheck },
  danger: { classes: "bg-destructive/10 text-destructive", icon: CircleX },
};

const StatusBadge = ({ label, tone = "neutral", icon, className }) => {
  const style = TONES[tone] || TONES.neutral;
  const Icon = icon === undefined ? style.icon : icon;

  return (
    <span
      className={cn(
        // 8px corners for badges (fully round is for filter pills), per the design guide
        "inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-0.5 text-[13px] font-bold whitespace-nowrap",
        style.classes,
        className,
      )}
    >
      {Icon && <Icon size={14} strokeWidth={2.5} aria-hidden="true" />}
      {label}
    </span>
  );
};

export default StatusBadge;
