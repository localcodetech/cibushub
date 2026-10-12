import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sheet from "@/components/common/Sheet";
import Skeleton from "@/components/common/Skeleton";
import { Button } from "@/components/ui/button";
import { adminAssignRiderRequest, getLiveRidersRequest } from "@/api/admin";
import { VEHICLE_NAMES } from "@/data/riderStatuses";
import { cn } from "@/lib/utils";
import Alert from "@/components/common/Alert";

// Give an order to a chosen rider, or swap riders, before pickup [AC-ASSIGN-07].
// Only online riders who are free (not carrying another order) are listed.
const AssignRiderSheet = ({ order, currentRiderId, onDone, onClose }) => {
  const [chosenRiderId, setChosenRiderId] = useState(null);
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const { data, isPending, error } = useQuery({
    queryKey: ["admin-live-riders"],
    queryFn: getLiveRidersRequest,
  });

  const freeRiders = data
    ? data.filter((rider) => !rider.delivery && rider.id !== currentRiderId)
    : [];

  const handleConfirm = async () => {
    if (!chosenRiderId) {
      setErrorMessage("Choose a rider.");
      return;
    }
    if (reason.trim().length < 5) {
      setErrorMessage("Give a short reason.");
      return;
    }

    setErrorMessage("");
    setIsWorking(true);
    try {
      await adminAssignRiderRequest(order.id, chosenRiderId, reason.trim());
      await onDone();
      onClose();
    } catch (requestError) {
      setErrorMessage(requestError.message);
      setIsWorking(false);
    }
  };

  return (
    <Sheet
      title={"Choose a rider for " + order.orderNumber}
      description="They get the order at once. A current rider is taken off."
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        <fieldset>
          <legend className="font-bold">Free riders online</legend>
          {isPending && <Skeleton className="mt-2 h-24 w-full" />}
          {error && <p className="mt-2 text-destructive">{error.message}</p>}
          {data && freeRiders.length === 0 && (
            <p className="mt-2 text-muted-foreground">No free riders online right now.</p>
          )}
          <div className="mt-2 flex flex-col gap-2">
            {freeRiders.map((rider) => (
              <label
                key={rider.id}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md border px-3",
                  chosenRiderId === rider.id ? "border-primary bg-primary/10" : "border-border",
                )}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="rider"
                    value={rider.id}
                    checked={chosenRiderId === rider.id}
                    onChange={() => setChosenRiderId(rider.id)}
                    className="size-5 accent-primary"
                  />
                  <span className="font-bold">{rider.fullName}</span>
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {VEHICLE_NAMES[rider.vehicleType]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="assign-reason" className="font-bold">
            Reason
          </label>
          <textarea
            id="assign-reason"
            rows={2}
            maxLength={300}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
          />
        </div>

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
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isWorking}
            className="h-12 flex-1 font-bold"
          >
            {isWorking ? "Assigning…" : "Assign rider"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
};

export default AssignRiderSheet;
