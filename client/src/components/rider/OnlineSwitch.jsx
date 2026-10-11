import Text from "@/components/typography/Text";
import { cn } from "@/lib/utils";

// The big Online / Offline switch at the top of the rider home [AC-RIDER-03].
// isOnline: the server's answer; isWorking: a change is being sent; onToggle(): flip it
const OnlineSwitch = ({ isOnline, isWorking, onToggle }) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border p-4",
        isOnline ? "border-success bg-success/10" : "border-border",
      )}
    >
      <div>
        <Text className="text-lg font-bold">{isOnline ? "You're online" : "You're offline"}</Text>
        <Text muted className="text-[15px]">
          {isOnline ? "Delivery offers will pop up here" : "Go online to get delivery offers"}
        </Text>
      </div>

      {/* role="switch" + aria-checked: screen readers say "on" / "off" */}
      <button
        type="button"
        role="switch"
        aria-checked={isOnline}
        aria-label="Online"
        disabled={isWorking}
        onClick={onToggle}
        className={cn(
          "relative h-9 w-16 shrink-0 rounded-full transition-colors disabled:opacity-60",
          isOnline ? "bg-success" : "bg-muted-foreground/40",
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 size-7 rounded-full bg-white shadow transition-transform",
            isOnline && "translate-x-7",
          )}
        />
      </button>
    </div>
  );
};

export default OnlineSwitch;
