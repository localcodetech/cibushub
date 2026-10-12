import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// A message about something that just happened: an error after a tap, or a confirmation.
// Errors are read out at once by screen readers (role="alert"); confirmations politely
// (role="status"). The icon means colour is never the only signal.
//
// <Alert>{error.message}</Alert>
// <Alert icon={LocateOff}>Turn on location to go online.</Alert>
// <Alert tone="success">Saved. Version 4 is now in force.</Alert>
//
// tone: danger (default) | success      icon: a Lucide icon instead of the tone's own
const TONES = {
  danger: {
    // Normal text colour: long red text is hard to read; the icon and border carry the red
    classes: "border-destructive/50 bg-destructive/[0.06] text-foreground",
    icon: CircleAlert,
    role: "alert",
  },
  success: {
    classes: "border-primary/40 bg-primary/[0.06] text-foreground",
    icon: CircleCheck,
    role: "status",
  },
};

const Alert = ({ tone = "danger", icon, className, children }) => {
  const style = TONES[tone];
  const Icon = icon || style.icon;

  return (
    <div
      role={style.role}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 text-[15px]",
        style.classes,
        className,
      )}
    >
      <Icon
        size={20}
        className={cn("mt-0.5 shrink-0", tone === "success" ? "text-primary" : "text-destructive")}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};

export default Alert;
