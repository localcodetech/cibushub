import { Bike, MapPin, Store } from "lucide-react";
import Sheet from "@/components/common/Sheet";
import Text from "@/components/typography/Text";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/useNow";
import { formatMoney } from "@/utils/money";
import { formatDistance } from "@/utils/distance";

// The delivery offer pop-up [AC-ASSIGN-03]: where to collect, how far, where it goes,
// what it pays, and 60 seconds to answer.
//
// offer:       the server's offer, plus deadline (ms on THIS phone's clock, see RiderHomePage)
// onAccept, onDecline: the two answers; onClose: hide it (the offer stays open until it runs out)
// isWorking:   true while an answer is being sent; errorMessage: e.g. "already taken"
const OfferSheet = ({ offer, onAccept, onDecline, onClose, isWorking, errorMessage }) => {
  const now = useNow(1000);
  const secondsLeft = Math.max(0, Math.ceil((offer.deadline - now) / 1000));
  const hasRunOut = secondsLeft === 0;

  return (
    <Sheet
      title="New delivery"
      description={"Answer within " + secondsLeft + " s"}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 p-4">
        {/* The countdown, as a shrinking bar too: easy to read at a glance on a bike */}
        <div
          role="timer"
          aria-label={secondsLeft + " seconds left to answer"}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full bg-primary transition-[width] duration-1000 ease-linear"
            style={{ width: (secondsLeft / 60) * 100 + "%" }}
          />
        </div>

        <Text className="font-heading text-3xl font-bold">
          {formatMoney(offer.earningsPesewas)}
        </Text>

        <ul className="flex flex-col gap-3 text-[15px]">
          <li className="flex gap-3">
            <Store size={20} className="shrink-0 text-primary" aria-hidden="true" />
            <span>
              <strong>{offer.restaurantName}</strong>, {offer.restaurantArea}
              <br />
              <span className="text-muted-foreground">
                {formatDistance(offer.pickupDistanceMetres)} from you
              </span>
            </span>
          </li>
          <li className="flex gap-3">
            <MapPin size={20} className="shrink-0 text-primary" aria-hidden="true" />
            <span>
              Drop-off in <strong>{offer.dropoffArea || "the city"}</strong>
              <br />
              <span className="text-muted-foreground">
                {formatDistance(offer.deliveryDistanceMetres)} from the restaurant
              </span>
            </span>
          </li>
        </ul>

        {errorMessage && (
          <p role="alert" className="text-[15px] font-bold text-destructive">
            {errorMessage}
          </p>
        )}

        {hasRunOut && !errorMessage && (
          <p role="alert" className="text-[15px] font-bold text-destructive">
            This offer has run out.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onDecline}
            disabled={isWorking || hasRunOut || Boolean(errorMessage)}
            className="h-14 text-base font-bold"
          >
            Decline
          </Button>
          <Button
            type="button"
            onClick={onAccept}
            disabled={isWorking || hasRunOut || Boolean(errorMessage)}
            className="h-14 text-base font-bold"
          >
            <Bike size={20} aria-hidden="true" />
            {isWorking ? "Sending…" : "Accept"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
};

export default OfferSheet;
