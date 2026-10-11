import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PackageCheck, PhoneCall } from "lucide-react";
import Card from "@/components/common/Card";
import Sheet from "@/components/common/Sheet";
import Skeleton from "@/components/common/Skeleton";
import { Button } from "@/components/ui/button";
import DeliveryMap from "@/components/map/DeliveryMap";
import RiderSummary from "@/components/order/RiderSummary";
import { confirmReceivedRequest, getOrderTrackingRequest } from "@/api/orders";
import { onLiveEvent } from "@/lib/liveUpdates";
import { useNow } from "@/hooks/useNow";

// The ETA is worked out on the server: ask again once a minute [AC-MAP-03]
const ETA_EVERY_MS = 60 * 1000;
// Older than this, the rider's position is probably stale (no signal, phone locked)
const STALE_AFTER_SECONDS = 60;

// "4 s ago", "2 min ago"
const formatAgo = (seconds) => {
  if (seconds < 60) {
    return seconds + " s ago";
  }
  return Math.floor(seconds / 60) + " min ago";
};

// The customer's live view while the rider has the order [AC-RT-04, AC-MAP-01, AC-MAP-03]:
// a map with the rider moving, who they are, about how long, and the code to give them.
// The rider's moves come over the socket every few seconds; the rest reloads every minute.
// order: the customer's order (status, contactPhone, deliveryCode)
const LiveTracking = ({ order }) => {
  const queryClient = useQueryClient();
  const now = useNow(1000);
  const trackingKey = ["tracking", order.id];
  // The rider reported they can't reach the customer: ask them to pick up the phone
  const [riderCantReach, setRiderCantReach] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  const query = useQuery({
    queryKey: trackingKey,
    queryFn: () => getOrderTrackingRequest(order.id),
    refetchInterval: ETA_EVERY_MS,
  });

  // Move the rider's marker the moment a new position arrives (no refetch needed)
  useEffect(() => {
    const stopLocation = onLiveEvent("rider:location", (event) => {
      if (event.orderId !== order.id) {
        return;
      }
      queryClient.setQueryData(["tracking", order.id], (current) =>
        current
          ? {
              ...current,
              riderLocation: { latitude: event.latitude, longitude: event.longitude, at: event.at },
            }
          : current,
      );
    });
    const stopUnreachable = onLiveEvent("delivery:unreachable", (event) => {
      if (event.orderId === order.id) {
        setRiderCantReach(true);
      }
    });
    return () => {
      stopLocation();
      stopUnreachable();
    };
  }, [order.id, queryClient]);

  if (query.isPending) {
    return <Skeleton className="mt-6 h-80 w-full" />;
  }
  // The rest of the order page still works without the map
  if (query.isError || !query.data.isTracked) {
    return null;
  }

  // "I've received my food" after the code locked: the order is delivered
  const handleConfirmReceived = async () => {
    setIsConfirming(true);
    setConfirmError("");
    try {
      const updated = await confirmReceivedRequest(order.id);
      queryClient.setQueryData(["order", order.id], updated);
      setIsConfirmOpen(false);
    } catch (error) {
      setConfirmError(error.message);
    }
    setIsConfirming(false);
  };

  const tracking = query.data;
  const isPickedUp = tracking.status === "PICKED_UP";
  const location = tracking.riderLocation;
  const secondsAgo = location
    ? Math.max(0, Math.round((now - new Date(location.at).getTime()) / 1000))
    : null;

  let etaText = "";
  if (tracking.etaMinutes) {
    etaText = isPickedUp
      ? "Arriving in about " + tracking.etaMinutes + " min"
      : "Collecting your food · about " + tracking.etaMinutes + " min to you";
  }

  return (
    <Card className="mt-6 flex flex-col gap-4">
      {riderCantReach && (
        <div role="alert" className="flex gap-3 rounded-lg bg-destructive/10 p-3 text-[15px]">
          <PhoneCall size={20} className="shrink-0 text-destructive" aria-hidden="true" />
          <span>
            Your rider is trying to reach you. Please answer your phone ({order.contactPhone}).
          </span>
        </div>
      )}

      {/* The rider typed a wrong code 5 times: the customer can finish it [AC-DEL-06] */}
      {order.canConfirmReceived && (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-destructive p-4">
          <p className="text-[15px]">
            Your rider entered a wrong code too many times. If you have your food, confirm it here.
          </p>
          <Button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            className="h-12 text-base font-bold"
          >
            <PackageCheck size={20} aria-hidden="true" />
            I've received my food
          </Button>
        </div>
      )}

      {/* The 4-digit code: the rider needs it to finish the delivery [AC-DEL-06] */}
      {isPickedUp && order.deliveryCode && !order.canConfirmReceived && (
        <div className="rounded-lg bg-primary p-4 text-center text-primary-foreground">
          <p className="text-[15px]">Give your rider this code</p>
          <p className="font-heading text-5xl font-bold tracking-[0.3em]">{order.deliveryCode}</p>
        </div>
      )}

      {tracking.rider && (
        <RiderSummary rider={tracking.rider}>
          {etaText && <p className="text-[15px] font-bold">{etaText}</p>}
        </RiderSummary>
      )}

      <DeliveryMap
        restaurant={isPickedUp ? null : tracking.restaurant}
        dropoff={tracking.dropoff}
        rider={location}
      />

      <p className="text-[13px] text-muted-foreground">
        {location === null && "Waiting for your rider's location…"}
        {location !== null && secondsAgo <= STALE_AFTER_SECONDS && (
          <>Location updated {formatAgo(secondsAgo)}</>
        )}
        {location !== null && secondsAgo > STALE_AFTER_SECONDS && (
          <>Last seen {formatAgo(secondsAgo)}. Your rider may have a weak signal.</>
        )}
        {" · Times are estimates."}
      </p>

      {isConfirmOpen && (
        <Sheet
          title="Got your food?"
          description="Confirm only if the rider has handed you your order."
          onClose={() => setIsConfirmOpen(false)}
        >
          <div className="flex flex-col gap-3 p-4">
            {confirmError && (
              <p role="alert" className="text-[15px] text-destructive">
                {confirmError}
              </p>
            )}
            <Button
              type="button"
              onClick={handleConfirmReceived}
              disabled={isConfirming}
              className="h-12 text-base font-bold"
            >
              {isConfirming ? "Confirming…" : "Yes, I have my food"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              className="h-12 text-base font-bold"
            >
              Not yet
            </Button>
          </div>
        </Sheet>
      )}
    </Card>
  );
};

export default LiveTracking;
