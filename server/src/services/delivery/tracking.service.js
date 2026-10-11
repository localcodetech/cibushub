import AppError from "../../utils/AppError.js";
import { etaMinutes } from "../../utils/delivery/eta.js";
import {
  findActiveDeliveryWithOrder,
  findDeliveriesWithRider,
} from "../../repositories/delivery.repository.js";
import { findOrderById } from "../../repositories/order.repository.js";
import { findRestaurantById } from "../../repositories/restaurant.repository.js";
import { getLatestLocation } from "../rider/riderLocationStore.js";
import { emitToOrder } from "../../sockets/emitToOrder.js";

// The order statuses in which the customer sees the rider move [AC-RT-04].
// After DELIVERED or CANCELLED nothing is shared any more [AC-RT-09].
export const TRACKED_ORDER_STATUSES = ["RIDER_ASSIGNED", "PICKED_UP"];

// Who is bringing the food: first name, photo and vehicle, never the rider's phone
const toRiderCard = (rider) => ({
  firstName: (rider.user.fullName || "").trim().split(/\s+/)[0] || "Your rider",
  photoUrl: rider.user.avatarUrl,
  vehicleType: rider.vehicleType,
  plateNumber: rider.plateNumber,
});

const toPoint = (place) => ({
  latitude: Number(place.latitude),
  longitude: Number(place.longitude),
});

// Called for every location the server accepts from a rider (every ~5 s) [AC-RT-04].
// Sent to the order's room only while that order is being tracked.
export const shareRiderLocation = async (riderProfileId, point, atMs) => {
  const delivery = await findActiveDeliveryWithOrder(riderProfileId);
  if (!delivery || !TRACKED_ORDER_STATUSES.includes(delivery.order.status)) {
    return false;
  }
  emitToOrder(delivery.orderId, "rider:location", {
    latitude: point.latitude,
    longitude: point.longitude,
    at: new Date(atMs).toISOString(),
  });
  return true;
};

// The customer's tracking view of one of their orders [AC-RT-04, AC-MAP-01, AC-MAP-03].
// The page loads it once and every minute (for the ETA); the rider's moves come by socket.
export const getOrderTracking = async (customerId, orderId) => {
  const order = await findOrderById(orderId);
  if (!order || order.customerId !== customerId) {
    throw new AppError(404, "NOT_FOUND", "Order not found");
  }

  const restaurant = await findRestaurantById(order.restaurantId);
  const isTracked = TRACKED_ORDER_STATUSES.includes(order.status);
  const view = {
    orderId: order.id,
    status: order.status,
    isTracked,
    restaurant: { name: restaurant.name, ...toPoint(restaurant) },
    dropoff: {
      latitude: Number(order.deliveryLatitude),
      longitude: Number(order.deliveryLongitude),
    },
    rider: null,
    riderLocation: null,
    etaMinutes: null,
    // How the ETA was worked out (a routing service may come later)
    etaBasis: "STRAIGHT_LINE",
  };
  if (!isTracked) {
    return view;
  }

  const [delivery] = await findDeliveriesWithRider([order.id]);
  if (!delivery) {
    return view;
  }
  view.rider = toRiderCard(delivery.rider);

  const location = await getLatestLocation(delivery.rider.id);
  if (location) {
    view.riderLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      at: new Date(location.at).toISOString(),
    };
    // Before pickup the rider still goes via the restaurant
    const route =
      order.status === "PICKED_UP"
        ? [location, view.dropoff]
        : [location, view.restaurant, view.dropoff];
    view.etaMinutes = etaMinutes(route, delivery.rider.vehicleType);
  }
  return view;
};

// For the restaurant's board: the rider of each order, and how far they are from the
// restaurant (until pickup) [AC-RORD-08]. Returns a Map of orderId -> rider card.
export const ridersForKitchen = async (orders) => {
  const byOrder = new Map();
  if (orders.length === 0) {
    return byOrder;
  }

  const deliveries = await findDeliveriesWithRider(orders.map((order) => order.id));
  for (const delivery of deliveries) {
    const order = orders.find((item) => item.id === delivery.orderId);
    const card = { ...toRiderCard(delivery.rider), etaToRestaurantMinutes: null };

    // On the way to the restaurant: to collect, or to bring the food back
    if (["ASSIGNED", "RETURNING"].includes(delivery.status) && order.restaurant) {
      const location = await getLatestLocation(delivery.rider.id);
      if (location) {
        card.etaToRestaurantMinutes = etaMinutes(
          [location, toPoint(order.restaurant)],
          delivery.rider.vehicleType,
        );
      }
    }
    byOrder.set(delivery.orderId, card);
  }
  return byOrder;
};
