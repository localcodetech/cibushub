import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ORDER_JOURNEY, ORDER_STATUSES } from "@/data/orderStatuses";
import { formatDateTime } from "@/utils/date";

// Every step of the order with the time it happened, and the current step highlighted [AC-ORD-06].
// status:   the order's status now
// timeline: [{ status, at, reason }] from the server, oldest first
const OrderTimeline = ({ status, timeline }) => {
  // When each status was reached, e.g. { PAID: "2026-10-09T22:09:46Z", ... }
  const reachedAt = {};
  for (const entry of timeline) {
    reachedAt[entry.status] = entry.at;
  }

  const endedEarly = status === "CANCELLED" || status === "REJECTED";

  // A normal order shows the whole journey (future steps in grey).
  // A cancelled or rejected one shows only the steps it reached, then how it ended.
  let steps = ORDER_JOURNEY;
  if (endedEarly) {
    steps = ORDER_JOURNEY.filter((step) => reachedAt[step]);
    steps = [...steps, status];
  }

  const endEntry = timeline.find((entry) => entry.status === status);

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const isDone = Boolean(reachedAt[step]);
        const isCurrent = step === status;
        const isLast = index === steps.length - 1;
        const isBadEnd = isCurrent && endedEarly;
        // The line down is green only when the NEXT step has happened too
        const nextIsDone = !isLast && Boolean(reachedAt[steps[index + 1]]);

        return (
          <li key={step} className="flex gap-3">
            {/* The dot and the line down to the next step */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                  isDone ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  isCurrent && !isBadEnd && "ring-4 ring-primary/20",
                  isBadEnd && "border-destructive bg-destructive text-white",
                )}
                aria-hidden="true"
              >
                {isDone && !isBadEnd && <Check size={14} strokeWidth={3} />}
                {isBadEnd && <X size={14} strokeWidth={3} />}
              </span>
              {!isLast && (
                <span className={cn("w-0.5 flex-1", nextIsDone ? "bg-primary" : "bg-border")} />
              )}
            </div>

            {/* The words, with the time it happened */}
            <div className={cn("pb-5", !isDone && "text-muted-foreground")}>
              <p className={cn(isCurrent ? "font-bold" : "", isBadEnd && "text-destructive")}>
                {ORDER_STATUSES[step].description}
                {/* Screen readers: say which step is now, since they can't see the ring */}
                {isCurrent && <span className="sr-only"> (current step)</span>}
              </p>
              {reachedAt[step] && (
                <p className="text-[13px] text-muted-foreground">
                  {formatDateTime(reachedAt[step])}
                </p>
              )}
              {isBadEnd && endEntry && endEntry.reason && (
                <p className="text-[13px] text-muted-foreground">Reason: {endEntry.reason}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default OrderTimeline;
