import { useState } from "react";
import { Link, useOutletContext } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CircleAlert,
  CircleCheck,
  Navigation,
  PackageCheck,
  Phone,
  Store,
  UserRound,
} from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import Sheet from "@/components/common/Sheet";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import DeliveryMap from "@/components/map/DeliveryMap";
import DeliveryCodeForm from "@/components/rider/DeliveryCodeForm";
import ReasonSheet from "@/components/rider/ReasonSheet";
import { Button } from "@/components/ui/button";
import {
  callCustomerRequest,
  completeDeliveryRequest,
  getCurrentDeliveryRequest,
  giveUpDeliveryRequest,
  pickUpRequest,
  reportUnreachableRequest,
} from "@/api/riderWork";
import { RIDER_DELIVERY_KEY } from "@/data/riderQueries";
import { directionsUrl } from "@/utils/googleMaps";
import { formatMoney } from "@/utils/money";

const REFRESH_EVERY_MS = 30 * 1000; // a safety net; live events normally refresh it sooner

// The delivery in hand [AC-DEL-01 to AC-DEL-08]:
// before pickup: the restaurant on a map, Google Maps directions, "Picked up";
// after pickup:  the customer's details, Call, the 4-digit code, "Customer unreachable".
const RiderDeliveryPage = () => {
  const queryClient = useQueryClient();
  // From RiderLayout: the rider's last shared position, for the map
  const { lastPoint } = useOutletContext();

  // Which pop-up is open: null, "FAR_PICKUP", "GIVE_UP" or "UNREACHABLE"
  const [openSheet, setOpenSheet] = useState(null);
  const [farMessage, setFarMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  // Set once delivered: the delivery is gone from the server, so keep what to celebrate
  const [deliveredOrder, setDeliveredOrder] = useState(null);

  const query = useQuery({
    queryKey: RIDER_DELIVERY_KEY,
    queryFn: getCurrentDeliveryRequest,
    refetchInterval: REFRESH_EVERY_MS,
  });

  if (deliveredOrder) {
    return (
      <Container>
        <section className="flex flex-col items-center gap-3 py-16 text-center">
          <CircleCheck size={56} className="text-success" aria-hidden="true" />
          <Heading level={1}>Delivered!</Heading>
          <Text className="text-lg">
            {deliveredOrder.orderNumber} · you earned{" "}
            <strong>{formatMoney(deliveredOrder.earningsPesewas)}</strong>
          </Text>
          <Link
            to="/rider"
            className="mt-4 inline-flex min-h-12 items-center rounded-md bg-primary px-6 font-bold text-primary-foreground"
          >
            Back to offers
          </Link>
        </section>
      </Container>
    );
  }

  if (query.isPending) {
    return (
      <Container>
        <div role="status" className="flex flex-col gap-4 py-8">
          <span className="sr-only">Loading your delivery</span>
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Container>
    );
  }

  if (query.isError) {
    return (
      <Container>
        <div className="py-8">
          <ErrorState message={query.error.message} onRetry={query.refetch} />
        </div>
      </Container>
    );
  }

  const delivery = query.data;
  if (!delivery) {
    return (
      <Container>
        <div className="py-8">
          <EmptyState
            title="No delivery in hand"
            message="Accept an offer and it shows here."
            action={{ label: "Back to home", to: "/rider" }}
          />
        </div>
      </Container>
    );
  }

  const isPickedUp = delivery.status === "PICKED_UP";
  const showUpdated = (updated) => queryClient.setQueryData(RIDER_DELIVERY_KEY, updated);

  // "Picked up". Far from the restaurant, the server refuses once; we ask, then confirm.
  const sendPickup = async (confirmFarAway) => {
    setActionError("");
    setIsWorking(true);
    try {
      showUpdated(await pickUpRequest(confirmFarAway));
      setOpenSheet(null);
    } catch (error) {
      if (error.code === "PICKUP_FAR_FROM_RESTAURANT") {
        setFarMessage(error.message);
        setOpenSheet("FAR_PICKUP");
      } else {
        setActionError(error.message);
        setOpenSheet(null);
        query.refetch();
      }
    }
    setIsWorking(false);
  };

  // "Call": counted on the server first, then the phone dials
  const handleCall = async () => {
    setActionError("");
    try {
      const { phone } = await callCustomerRequest();
      queryClient.invalidateQueries({ queryKey: RIDER_DELIVERY_KEY });
      window.location.href = "tel:" + phone;
    } catch (error) {
      setActionError(error.message);
    }
  };

  const handleComplete = async (code) => {
    try {
      await completeDeliveryRequest(code);
    } catch (error) {
      // The attempts-left count changed: reload it, then show the message in the form
      query.refetch();
      throw error;
    }
    setDeliveredOrder({
      orderNumber: delivery.orderNumber,
      earningsPesewas: delivery.earningsPesewas,
    });
    queryClient.setQueryData(RIDER_DELIVERY_KEY, null);
  };

  const handleGiveUp = async (reason) => {
    await giveUpDeliveryRequest(reason);
    setOpenSheet(null);
    queryClient.setQueryData(RIDER_DELIVERY_KEY, null);
  };

  const handleUnreachable = async (note) => {
    showUpdated(await reportUnreachableRequest(note));
    setOpenSheet(null);
  };

  const destination = isPickedUp ? delivery.dropoff : delivery.pickup;

  return (
    <Container>
      <section className="flex flex-col gap-4 py-6">
        <div>
          <Heading level={1}>{isPickedUp ? "Deliver to the customer" : "Collect the food"}</Heading>
          <Text muted className="mt-1">
            {delivery.orderNumber} · you earn {formatMoney(delivery.earningsPesewas)}
          </Text>
        </div>

        <DeliveryMap
          restaurant={isPickedUp ? null : delivery.pickup}
          dropoff={isPickedUp ? delivery.dropoff : null}
          rider={lastPoint}
        />

        <a
          href={directionsUrl(destination)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-border font-bold"
        >
          <Navigation size={20} aria-hidden="true" />
          Open in Google Maps
        </a>

        {actionError && (
          <p role="alert" className="flex items-center gap-2 text-[15px] text-destructive">
            <CircleAlert size={18} aria-hidden="true" />
            {actionError}
          </p>
        )}

        {!isPickedUp && (
          <>
            <Card className="flex flex-col gap-2">
              <Text className="flex items-center gap-2 font-bold">
                <Store size={20} className="text-primary" aria-hidden="true" />
                {delivery.pickup.restaurantName}
              </Text>
              <Text className="text-[15px]">
                {delivery.pickup.addressLine}, {delivery.pickup.area}
              </Text>
              <a href={"tel:" + delivery.pickup.phone} className="font-bold text-primary underline">
                Call the restaurant
              </a>
              <ul className="mt-2 border-t border-border pt-2 text-[15px]">
                {delivery.items.map((item) => (
                  <li key={item.name}>
                    {item.quantity} × {item.name}
                  </li>
                ))}
              </ul>
            </Card>

            {!delivery.foodReady && (
              <Text muted className="text-center text-[15px]">
                The kitchen is still preparing it. "Picked up" works once they mark it ready.
              </Text>
            )}
            <Button
              type="button"
              onClick={() => sendPickup(false)}
              disabled={!delivery.foodReady || isWorking}
              className="h-14 text-base font-bold"
            >
              <PackageCheck size={20} aria-hidden="true" />
              {isWorking ? "Sending…" : "Picked up"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpenSheet("GIVE_UP")}
              className="h-12 text-base text-destructive"
            >
              I can't continue this delivery
            </Button>
          </>
        )}

        {isPickedUp && (
          <>
            <Card className="flex flex-col gap-2">
              <Text className="flex items-center gap-2 font-bold">
                <UserRound size={20} className="text-primary" aria-hidden="true" />
                {delivery.dropoff.customerFirstName}
              </Text>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[15px]">
                {delivery.dropoff.area && (
                  <>
                    <dt className="text-muted-foreground">Area</dt>
                    <dd>{delivery.dropoff.area}</dd>
                  </>
                )}
                {delivery.dropoff.landmark && (
                  <>
                    <dt className="text-muted-foreground">Landmark</dt>
                    <dd>{delivery.dropoff.landmark}</dd>
                  </>
                )}
                {delivery.dropoff.ghanaPostGps && (
                  <>
                    <dt className="text-muted-foreground">GhanaPost</dt>
                    <dd>{delivery.dropoff.ghanaPostGps}</dd>
                  </>
                )}
                {delivery.dropoff.instructions && (
                  <>
                    <dt className="text-muted-foreground">Note</dt>
                    <dd>{delivery.dropoff.instructions}</dd>
                  </>
                )}
              </dl>
              <Button
                type="button"
                variant="outline"
                onClick={handleCall}
                className="mt-2 h-12 text-base font-bold"
              >
                <Phone size={20} aria-hidden="true" />
                Call {delivery.dropoff.customerFirstName}
              </Button>
            </Card>

            <Card>
              <DeliveryCodeForm
                attemptsLeft={delivery.codeAttemptsLeft}
                onSubmit={handleComplete}
              />
            </Card>

            {delivery.unreachableReportedAt && (
              <div role="status" className="rounded-lg border border-border p-4">
                <Text className="font-bold">Reported: customer unreachable</Text>
                <Text muted className="text-[15px]">
                  Stay near the drop-off. CibusHub support will contact you. If the customer turns
                  up, enter their code as usual.
                </Text>
              </div>
            )}
            {delivery.canReportUnreachable && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpenSheet("UNREACHABLE")}
                className="h-12 text-base text-destructive"
              >
                Customer unreachable
              </Button>
            )}
            {!delivery.canReportUnreachable && !delivery.unreachableReportedAt && (
              <Text muted className="text-center text-[13px]">
                Can't find the customer? Call them twice, then you can report it.
              </Text>
            )}
          </>
        )}
      </section>

      {openSheet === "FAR_PICKUP" && (
        <Sheet
          title="Are you at the restaurant?"
          description={farMessage}
          onClose={() => setOpenSheet(null)}
        >
          <div className="flex flex-col gap-3 p-4">
            <Text className="text-[15px]">
              Confirm only if you really have the food. This pickup will be checked by our team.
            </Text>
            <Button
              type="button"
              onClick={() => sendPickup(true)}
              disabled={isWorking}
              className="h-12 text-base font-bold"
            >
              Yes, I have the food
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenSheet(null)}
              className="h-12 text-base font-bold"
            >
              Not yet
            </Button>
          </div>
        </Sheet>
      )}

      {openSheet === "GIVE_UP" && (
        <ReasonSheet
          title="Can't continue?"
          description="The order goes to another rider. Use this only if you really can't collect it."
          label="What happened?"
          required
          submitLabel="Give the delivery back"
          onSubmit={handleGiveUp}
          onClose={() => setOpenSheet(null)}
        />
      )}

      {openSheet === "UNREACHABLE" && (
        <ReasonSheet
          title="Customer unreachable"
          description="Our team is told where you are and how many times you called."
          label="Anything we should know?"
          required={false}
          submitLabel="Report"
          onSubmit={handleUnreachable}
          onClose={() => setOpenSheet(null)}
        />
      )}
    </Container>
  );
};

export default RiderDeliveryPage;
