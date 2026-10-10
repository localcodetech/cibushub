import { useState } from "react";
import Sheet from "@/components/common/Sheet";
import { REJECT_REASONS } from "@/data/ownerBoard";

const OTHER = "OTHER";

// "Reject this order?" [AC-RORD-03, AC-UX-07]: a reason is required, and the customer
// is refunded in full, so it always asks first.
//
// isRejecting / error: from the page's request
// onConfirm:  called with the reason text
// onClose:    "Keep order"
const RejectOrderSheet = ({ order, isRejecting, error, onConfirm, onClose }) => {
  const [chosenReason, setChosenReason] = useState(REJECT_REASONS[0]);
  const [otherReason, setOtherReason] = useState("");
  const [formError, setFormError] = useState("");

  const handleConfirm = () => {
    const reason = chosenReason === OTHER ? otherReason.trim() : chosenReason;
    // Same rule as the server: 3 to 300 characters
    if (reason.length < 3) {
      setFormError("Tell the customer why, in a few words.");
      return;
    }
    setFormError("");
    onConfirm(reason);
  };

  return (
    <Sheet
      title={"Reject " + order.orderNumber + "?"}
      description="The customer is told why and gets a full refund. This can't be undone."
      onClose={onClose}
    >
      <div className="space-y-4 p-4">
        <fieldset>
          <legend className="mb-2 text-[15px] font-bold">Why can't you take it?</legend>
          <div className="space-y-1">
            {[...REJECT_REASONS, OTHER].map((reason) => (
              <label key={reason} className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="reject-reason"
                  checked={chosenReason === reason}
                  onChange={() => setChosenReason(reason)}
                  className="size-5 accent-primary"
                />
                {reason === OTHER ? "Something else" : reason}
              </label>
            ))}
          </div>
        </fieldset>

        {chosenReason === OTHER && (
          <div className="flex flex-col gap-2">
            <label htmlFor="reject-other" className="text-[13px] text-muted-foreground">
              Your reason (the customer sees this)
            </label>
            <textarea
              id="reject-other"
              rows={2}
              maxLength={300}
              value={otherReason}
              onChange={(event) => setOtherReason(event.target.value)}
              aria-invalid={formError ? true : undefined}
              className="rounded-lg border border-input bg-white px-3.5 py-3 text-base dark:bg-card"
            />
          </div>
        )}

        {(formError || error) && (
          <p role="alert" className="text-[15px] text-destructive">
            {formError || error}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isRejecting}
            className="min-h-12 flex-1 rounded-md bg-destructive px-5 font-bold text-white disabled:opacity-60"
          >
            {isRejecting ? "Rejecting…" : "Reject and refund"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 flex-1 rounded-md border border-border px-5 font-bold"
          >
            Keep order
          </button>
        </div>
      </div>
    </Sheet>
  );
};

export default RejectOrderSheet;
