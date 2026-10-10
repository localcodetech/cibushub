import { useState } from "react";
import Sheet from "@/components/common/Sheet";
import { CANCEL_REASONS } from "@/data/orderStatuses";
import { formatMoney } from "@/utils/money";

// "Cancel this order?" with a reason, before the restaurant accepts [AC-CANC-01].
// order:      the order (to say whether money comes back)
// isCancelling / error: from the page's request
// onConfirm:  called with the reason text
// onClose:    "Keep my order"
const CancelOrderSheet = ({ order, isCancelling, error, onConfirm, onClose }) => {
  const [chosenReason, setChosenReason] = useState(CANCEL_REASONS[0]);
  const [moreDetails, setMoreDetails] = useState("");

  const isPaid = order.paymentStatus === "PAID";

  const handleConfirm = () => {
    // "Changed my mind: found food nearby" or just "Changed my mind"
    const details = moreDetails.trim();
    onConfirm(details ? chosenReason + ": " + details : chosenReason);
  };

  return (
    <Sheet
      title="Cancel this order?"
      description={
        isPaid
          ? "You'll get a full refund of " +
            formatMoney(order.totalPesewas) +
            " to the account you paid with."
          : "Nothing was paid, so nothing will be charged."
      }
      onClose={onClose}
    >
      <div className="space-y-4 p-4">
        <fieldset>
          <legend className="mb-2 text-[15px] font-bold">Why are you cancelling?</legend>
          <div className="space-y-1">
            {CANCEL_REASONS.map((reason) => (
              <label key={reason} className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="cancel-reason"
                  checked={chosenReason === reason}
                  onChange={() => setChosenReason(reason)}
                  className="size-5 accent-primary"
                />
                {reason}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="cancel-details" className="text-[13px] text-muted-foreground">
            Anything to add? (optional)
          </label>
          <textarea
            id="cancel-details"
            rows={2}
            maxLength={400}
            value={moreDetails}
            onChange={(event) => setMoreDetails(event.target.value)}
            className="rounded-lg border border-input bg-white px-3.5 py-3 text-base dark:bg-card"
          />
        </div>

        {error && (
          <p role="alert" className="text-[15px] text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isCancelling}
            className="min-h-12 flex-1 rounded-md bg-destructive px-5 font-bold text-white disabled:opacity-60"
          >
            {isCancelling ? "Cancelling…" : "Cancel order"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 flex-1 rounded-md border border-border px-5 font-bold"
          >
            Keep my order
          </button>
        </div>
      </div>
    </Sheet>
  );
};

export default CancelOrderSheet;
