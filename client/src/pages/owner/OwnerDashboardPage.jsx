import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import KitchenOrderCard from "@/components/owner/KitchenOrderCard";
import AcceptOrderSheet from "@/components/owner/AcceptOrderSheet";
import RejectOrderSheet from "@/components/owner/RejectOrderSheet";
import {
  acceptOrderRequest,
  getOwnerBoardRequest,
  markReadyRequest,
  rejectOrderRequest,
  startPreparingRequest,
} from "@/api/ownerOrders";
import { onOrderUpdated } from "@/lib/liveUpdates";
import { isAlertSoundOn, playNewOrderSound, turnOnAlertSound } from "@/lib/orderAlertSound";
import { useNow } from "@/hooks/useNow";
import { BOARD_TABS } from "@/data/ownerBoard";

const BOARD_KEY = ["owner-board"];

// A safety net: live updates normally refresh the board instantly; this catches anything missed
const REFRESH_EVERY_MS = 60000;

// The one-tap moves (no questions asked)
const ONE_TAP_REQUESTS = {
  PREPARING: startPreparingRequest,
  READY_FOR_PICKUP: markReadyRequest,
};

// /owner: the restaurant's live order board [AC-RORD-01, 02, 03, 05, 06]
const OwnerDashboardPage = () => {
  const queryClient = useQueryClient();
  const now = useNow(1000);
  const [activeTab, setActiveTab] = useState(BOARD_TABS[0].key);
  const [isSoundOn, setIsSoundOn] = useState(isAlertSoundOn);

  // The order a button is working on, and why the last tap failed: { orderId, message }
  const [workingOrderId, setWorkingOrderId] = useState(null);
  const [actionError, setActionError] = useState(null);
  // The Accept or Reject sheet that is open: { order, type: "ACCEPTED" | "REJECTED" }
  const [openSheet, setOpenSheet] = useState(null);
  const [sheetError, setSheetError] = useState("");

  const {
    data: orders,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: BOARD_KEY,
    queryFn: getOwnerBoardRequest,
    refetchInterval: REFRESH_EVERY_MS,
  });

  // Live: any change to one of our orders refreshes the board; a new paid order also dings
  useEffect(() => {
    return onOrderUpdated((event) => {
      queryClient.invalidateQueries({ queryKey: BOARD_KEY });
      if (event.status === "PAID") {
        playNewOrderSound();
      }
    });
  }, [queryClient]);

  const handleTurnOnSound = async () => {
    setIsSoundOn(await turnOnAlertSound());
  };

  // Put the server's new copy of the order on the board straight away
  const showUpdatedOrder = (updated) => {
    queryClient.setQueryData(BOARD_KEY, (current) =>
      (current || []).map((order) => (order.id === updated.id ? updated : order)),
    );
    queryClient.invalidateQueries({ queryKey: BOARD_KEY });
  };

  // Sends one change; on failure (e.g. it was rejected for time a second ago) says why
  // and reloads the board so it shows the truth.
  const runRequest = async (orderId, request, onFailure) => {
    setWorkingOrderId(orderId);
    setActionError(null);
    try {
      showUpdatedOrder(await request());
      setOpenSheet(null);
    } catch (error) {
      onFailure(error.message);
      refetch();
    }
    setWorkingOrderId(null);
  };

  const handleAction = (order, toStatus) => {
    if (toStatus === "ACCEPTED" || toStatus === "REJECTED") {
      setSheetError("");
      setOpenSheet({ order, type: toStatus });
      return;
    }
    runRequest(
      order.id,
      () => ONE_TAP_REQUESTS[toStatus](order.id),
      (message) => setActionError({ orderId: order.id, message }),
    );
  };

  const handleAccept = (minutes) => {
    const orderId = openSheet.order.id;
    runRequest(orderId, () => acceptOrderRequest(orderId, minutes), setSheetError);
  };

  const handleReject = (reason) => {
    const orderId = openSheet.order.id;
    runRequest(orderId, () => rejectOrderRequest(orderId, reason), setSheetError);
  };

  return (
    <Container>
      <section className="py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Heading level={1}>Orders</Heading>
          {/* Browsers stay silent until a tap: this is that tap [AC-RORD-01] */}
          {isSoundOn ? (
            <p className="flex items-center gap-2 text-[15px] font-bold text-primary">
              <Bell size={18} aria-hidden="true" /> Sound on
            </p>
          ) : (
            <button
              type="button"
              onClick={handleTurnOnSound}
              className="flex min-h-11 items-center gap-2 rounded-md bg-amber-500 px-4 font-bold text-black"
            >
              <BellOff size={18} aria-hidden="true" /> Turn on sound for new orders
            </button>
          )}
        </div>

        <BoardContent
          orders={orders}
          isPending={isPending}
          error={error}
          refetch={refetch}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          now={now}
          workingOrderId={workingOrderId}
          actionError={actionError}
          onAction={handleAction}
        />
      </section>

      {openSheet && openSheet.type === "ACCEPTED" && (
        <AcceptOrderSheet
          order={openSheet.order}
          isAccepting={workingOrderId === openSheet.order.id}
          error={sheetError}
          onConfirm={handleAccept}
          onClose={() => setOpenSheet(null)}
        />
      )}
      {openSheet && openSheet.type === "REJECTED" && (
        <RejectOrderSheet
          order={openSheet.order}
          isRejecting={workingOrderId === openSheet.order.id}
          error={sheetError}
          onConfirm={handleReject}
          onClose={() => setOpenSheet(null)}
        />
      )}
    </Container>
  );
};

// The tabs with counts, and the orders of the chosen tab [AC-RORD-06]
const BoardContent = ({
  orders,
  isPending,
  error,
  refetch,
  activeTab,
  onTabChange,
  now,
  workingOrderId,
  actionError,
  onAction,
}) => {
  if (isPending) {
    return (
      <div role="status" className="mt-6 space-y-4">
        <span className="sr-only">Loading orders</span>
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6">
        <ErrorState message={error.message} onRetry={refetch} />
      </div>
    );
  }

  const ordersIn = (tab) => orders.filter((order) => tab.statuses.includes(order.status));
  const tab = BOARD_TABS.find((candidate) => candidate.key === activeTab);
  const shown = ordersIn(tab);
  // Owners with several restaurants see which one each order is for
  const showRestaurant = new Set(orders.map((order) => order.restaurant?.id)).size > 1;

  return (
    <>
      {/* Scrolls sideways on its own on small phones; the page never does */}
      <div className="-mx-4 mt-5 overflow-x-auto px-4">
        <div className="flex gap-2">
          {BOARD_TABS.map((candidate) => {
            const count = ordersIn(candidate).length;
            const isActive = candidate.key === activeTab;
            const needsAnswer = candidate.key === "new" && count > 0;
            return (
              <button
                key={candidate.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => onTabChange(candidate.key)}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[15px] font-bold",
                  isActive ? "border-foreground bg-foreground text-background" : "border-border",
                )}
              >
                {candidate.label}
                <span
                  className={cn(
                    "min-w-6 rounded-full px-1.5 text-center text-[13px]",
                    needsAnswer
                      ? "animate-pulse bg-amber-500 text-black"
                      : "bg-muted text-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          title={"No " + tab.label.toLowerCase() + " orders"}
          message={
            tab.key === "new"
              ? "New orders appear here the moment they are paid. Keep this page open."
              : "Orders move here as you work on them."
          }
        />
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((order) => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              now={now}
              showRestaurant={showRestaurant}
              isWorking={workingOrderId === order.id}
              error={actionError && actionError.orderId === order.id ? actionError.message : ""}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default OwnerDashboardPage;
