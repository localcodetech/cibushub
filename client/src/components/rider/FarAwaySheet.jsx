import Sheet from "@/components/common/Sheet";
import { Button } from "@/components/ui/button";

// "Are you really there?" after the server said the rider is more than 200 m away
// (pickup [AC-DEL-03] or returning the food). Confirming goes ahead, flagged for our team.
// message: the server's text with the distance; confirmLabel: e.g. "Yes, I have the food"
const FarAwaySheet = ({ title, message, confirmLabel, isWorking, onConfirm, onClose }) => {
  return (
    <Sheet title={title} description={message} onClose={onClose}>
      <div className="flex flex-col gap-3 p-4">
        <p className="text-[15px]">Confirm only if it's true. This will be checked by our team.</p>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={isWorking}
          className="h-12 text-base font-bold"
        >
          {confirmLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-12 text-base font-bold"
        >
          Not yet
        </Button>
      </div>
    </Sheet>
  );
};

export default FarAwaySheet;
