import { useState } from "react";
import { CircleAlert } from "lucide-react";
import Sheet from "@/components/common/Sheet";
import { Button } from "@/components/ui/button";
import { adminCancelOrderRequest } from "@/api/admin";
import { formatMoney } from "@/utils/money";
import { cn } from "@/lib/utils";

const REFUND_CHOICES = [
  { value: "FULL", label: "Full refund" },
  { value: "PARTIAL", label: "Part refund" },
  { value: "NONE", label: "No refund" },
];

// An admin cancels an order: why, and how much goes back [AC-CANC-03, AC-ADM-08].
// Everything is checked again by the server and written to the audit log.
const AdminCancelOrderSheet = ({ order, onDone, onClose }) => {
  const [refund, setRefund] = useState("FULL");
  // Typed in cedis, e.g. "25.50"; sent as whole pesewas (2550)
  const [amountText, setAmountText] = useState("");
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const handleConfirm = async () => {
    if (reason.trim().length < 10) {
      setErrorMessage("Give a clear reason (at least 10 characters).");
      return;
    }

    const choice = { reason: reason.trim(), refund };
    if (refund === "PARTIAL") {
      const pesewas = Math.round(Number(amountText) * 100);
      if (!Number.isFinite(pesewas) || pesewas < 1 || pesewas > order.totalPesewas) {
        setErrorMessage(
          "Enter an amount between GHS 0.01 and " + formatMoney(order.totalPesewas) + ".",
        );
        return;
      }
      choice.refundAmountPesewas = pesewas;
    }

    setErrorMessage("");
    setIsWorking(true);
    try {
      await adminCancelOrderRequest(order.id, choice);
      await onDone();
      onClose();
    } catch (error) {
      setErrorMessage(error.message);
      setIsWorking(false);
    }
  };

  return (
    <Sheet
      title={"Cancel " + order.orderNumber + "?"}
      description="The customer, restaurant and rider are told. This can't be undone."
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 p-4">
        <fieldset>
          <legend className="font-bold">Refund</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {REFUND_CHOICES.map((choice) => (
              <label
                key={choice.value}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-2 text-center text-[15px] font-bold",
                  refund === choice.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="refund"
                  value={choice.value}
                  checked={refund === choice.value}
                  onChange={() => setRefund(choice.value)}
                  className="sr-only"
                />
                {choice.label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Order total {formatMoney(order.totalPesewas)}.
          </p>
        </fieldset>

        {refund === "PARTIAL" && (
          <div>
            <label htmlFor="refund-amount" className="font-bold">
              Amount to refund (GHS)
            </label>
            <input
              id="refund-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={amountText}
              onChange={(event) => setAmountText(event.target.value)}
              className="mt-2 h-12 w-full rounded-md border border-input bg-background px-3 text-base"
            />
          </div>
        )}

        <div>
          <label htmlFor="cancel-reason" className="font-bold">
            Reason
          </label>
          <p className="text-[13px] text-muted-foreground">
            Saved in the audit log. The customer sees it.
          </p>
          <textarea
            id="cancel-reason"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          />
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive p-3 text-[15px] text-destructive"
          >
            <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isWorking}
            className="h-12 flex-1"
          >
            Keep order
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isWorking}
            className="h-12 flex-1 font-bold"
          >
            {isWorking ? "Cancelling…" : "Cancel order"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
};

export default AdminCancelOrderSheet;
