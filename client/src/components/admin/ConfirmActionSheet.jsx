import { useState } from "react";
import Sheet from "@/components/common/Sheet";
import { Button } from "@/components/ui/button";
import Alert from "@/components/common/Alert";

// "Are you sure?" for admin actions [AC-ADM-08]. Sensitive ones (suspend, reject, refund,
// cancel) also need a written reason, which goes into the audit log [AC-ADM-07].
//
// <ConfirmActionSheet
//   title="Suspend Golden Pot Kitchen?"
//   description="It disappears from the app until you reactivate it."
//   confirmLabel="Suspend"
//   needsReason
//   isDangerous
//   onConfirm={async (reason) => { await suspendRestaurantRequest(id, reason); }}
//   onClose={() => setAction(null)}
// />
//
// onConfirm runs the action; if it throws, the error shows here and the sheet stays open.
const ConfirmActionSheet = ({
  title,
  description,
  confirmLabel,
  needsReason = false,
  reasonMinLength = 10,
  isDangerous = false,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const handleConfirm = async () => {
    if (needsReason && reason.trim().length < reasonMinLength) {
      setErrorMessage(`Give a clear reason (at least ${reasonMinLength} characters).`);
      return;
    }

    setErrorMessage("");
    setIsWorking(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (error) {
      setErrorMessage(error.message);
      setIsWorking(false);
    }
  };

  return (
    <Sheet title={title} description={description} onClose={onClose}>
      <div className="flex flex-col gap-4 p-4">
        {needsReason && (
          <div>
            <label htmlFor="action-reason" className="font-bold">
              Reason
            </label>
            <p className="text-[13px] text-muted-foreground">
              Saved in the audit log. The person affected may see it.
            </p>
            <textarea
              id="action-reason"
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
            />
          </div>
        )}

        {errorMessage && (
          <Alert>
            {" "}
            <span>{errorMessage}</span>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isWorking}
            className="h-12 flex-1"
          >
            Cancel
          </Button>
          {/* Disabled while working, so a double tap can't do it twice [AC-UX-05] */}
          <Button
            type="button"
            variant={isDangerous ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isWorking}
            className="h-12 flex-1 font-bold"
          >
            {isWorking ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Sheet>
  );
};

export default ConfirmActionSheet;
