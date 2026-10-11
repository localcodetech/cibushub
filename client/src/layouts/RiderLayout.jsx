import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageLoader from "@/components/common/PageLoader";
import OfferSheet from "@/components/rider/OfferSheet";
import {
  acceptOfferRequest,
  declineOfferRequest,
  getCurrentOfferRequest,
  getRiderStatusRequest,
} from "@/api/riderWork";
import { RIDER_DELIVERY_KEY, RIDER_OFFER_KEY, RIDER_STATUS_KEY } from "@/data/riderQueries";
import { onLiveEvent } from "@/lib/liveUpdates";
import { playNewOrderSound } from "@/lib/orderAlertSound";
import { useLocationSharing } from "@/hooks/useLocationSharing";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useNow } from "@/hooks/useNow";
import { cn } from "@/lib/utils";
import Container from "./Container";

const RIDER_LINKS = [
  { label: "Home", to: "/rider", end: true },
  { label: "Delivery", to: "/rider/delivery", end: false },
  { label: "Earnings", to: "/rider/earnings", end: false },
];

// The server says how many seconds are left; we turn that into a moment on THIS phone's
// clock, so a phone whose clock is wrong still counts down correctly
const withDeadline = (offer) => {
  if (!offer) {
    return null;
  }
  return { ...offer, deadline: Date.now() + offer.secondsLeft * 1000 };
};

const loadOffer = async () => withDeadline(await getCurrentOfferRequest());

// The frame around every rider page. It stays on screen while the rider moves between
// pages, so these keep running the whole time they're online:
//   - sharing the location every 5 seconds, and keeping the screen awake [AC-RT-04, C10]
//   - the live events, and the offer pop-up wherever they are [AC-ASSIGN-03]
// Pages read the sharing state with useOutletContext().
const RiderLayout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isOfferHidden, setIsOfferHidden] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [offerError, setOfferError] = useState("");

  const statusQuery = useQuery({ queryKey: RIDER_STATUS_KEY, queryFn: getRiderStatusRequest });
  const offerQuery = useQuery({ queryKey: RIDER_OFFER_KEY, queryFn: loadOffer });

  const isOnline = statusQuery.data ? statusQuery.data.isOnline : false;
  const sharing = useLocationSharing(isOnline);
  const isScreenAwake = useWakeLock(isOnline);

  useEffect(() => {
    const stops = [
      onLiveEvent("delivery:offer", (offer) => {
        setOfferError("");
        setIsOfferHidden(false);
        queryClient.setQueryData(RIDER_OFFER_KEY, withDeadline(offer));
        playNewOrderSound();
      }),
      // Anything about the delivery in hand: given by an admin, taken off, food ready,
      // code unlocked, completed. The screen reloads it from the server.
      onLiveEvent("delivery:assigned", () => {
        queryClient.invalidateQueries({ queryKey: RIDER_DELIVERY_KEY });
      }),
      onLiveEvent("delivery:unassigned", () => {
        queryClient.invalidateQueries({ queryKey: RIDER_DELIVERY_KEY });
      }),
      onLiveEvent("delivery:ready", () => {
        queryClient.invalidateQueries({ queryKey: RIDER_DELIVERY_KEY });
      }),
      onLiveEvent("delivery:code-unlocked", () => {
        queryClient.invalidateQueries({ queryKey: RIDER_DELIVERY_KEY });
      }),
      // Nobody took it: take the food back to the restaurant
      onLiveEvent("delivery:returning", () => {
        queryClient.invalidateQueries({ queryKey: RIDER_DELIVERY_KEY });
      }),
      // The customer confirmed receipt after the code locked: the delivery is finished
      onLiveEvent("delivery:completed", () => {
        queryClient.invalidateQueries({ queryKey: RIDER_DELIVERY_KEY });
      }),
      // e.g. the server took us offline after 5 minutes without a location
      onLiveEvent("rider:status", () => {
        queryClient.invalidateQueries({ queryKey: RIDER_STATUS_KEY });
      }),
    ];
    return () => stops.forEach((stop) => stop());
  }, [queryClient]);

  const offer = offerQuery.data;

  const finishOffer = () => {
    queryClient.setQueryData(RIDER_OFFER_KEY, null);
    setIsOfferHidden(false);
    setOfferError("");
  };

  const handleAccept = async () => {
    setIsAnswering(true);
    try {
      await acceptOfferRequest(offer.offerId);
      finishOffer();
      await queryClient.invalidateQueries({ queryKey: RIDER_DELIVERY_KEY });
      navigate("/rider/delivery");
    } catch (error) {
      // e.g. "This delivery has already been taken": shown in the sheet until they close it
      setOfferError(error.message);
    }
    setIsAnswering(false);
  };

  const handleDecline = async () => {
    setIsAnswering(true);
    try {
      await declineOfferRequest(offer.offerId);
    } catch {
      // Already closed on the server: nothing more to do
    }
    finishOffer();
    setIsAnswering(false);
  };

  const handleCloseOffer = () => {
    // After an error or once it ran out, closing ends it; otherwise it can be reopened
    if (offerError || Date.now() >= offer.deadline) {
      finishOffer();
      return;
    }
    setIsOfferHidden(true);
  };

  return (
    <>
      <div className="border-b border-border">
        <Container>
          <nav aria-label="Rider" className="flex gap-6">
            {RIDER_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-12 items-center border-b-2 font-bold",
                    isActive ? "border-primary text-primary" : "border-transparent",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </Container>
      </div>

      {offer && isOfferHidden && (
        <Container>
          <OfferWaitingBar offer={offer} onOpen={() => setIsOfferHidden(false)} />
        </Container>
      )}

      <Suspense fallback={<PageLoader />}>
        <Outlet context={{ ...sharing, isScreenAwake }} />
      </Suspense>

      {offer && !isOfferHidden && (
        <OfferSheet
          offer={offer}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onClose={handleCloseOffer}
          isWorking={isAnswering}
          errorMessage={offerError}
        />
      )}
    </>
  );
};

// The offer is still open but its pop-up was closed: a bar to bring it back
const OfferWaitingBar = ({ offer, onOpen }) => {
  const now = useNow(1000);
  const secondsLeft = Math.max(0, Math.ceil((offer.deadline - now) / 1000));
  if (secondsLeft === 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-4 flex min-h-12 w-full items-center justify-between rounded-lg bg-primary px-4 font-bold text-primary-foreground"
    >
      <span>Delivery offer waiting</span>
      <span>{secondsLeft} s · View</span>
    </button>
  );
};

export default RiderLayout;
