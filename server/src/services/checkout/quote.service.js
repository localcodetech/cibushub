import AppError from "../../utils/AppError.js";
import { checkCart } from "../cart/cartCheck.service.js";
import { findOwnedAddress } from "../../repositories/address.repository.js";
import { findUserById } from "../../repositories/user.repository.js";
import {
  DELIVERY_FEE_RULES,
  deliveryFeeFor,
  estimateRoadMeters,
  straightLineKm,
} from "../../utils/delivery/deliveryFee.js";

const SERVICE_FEE_PESEWAS = 0; // no service fee for now
const DISCOUNT_PESEWAS = 0; // promo codes come later

// Everything the checkout page shows, worked out from the database only.
// Placing the order uses this same function, so what is shown is what is charged [AC-CHK-01, AC-CHK-03]
export const buildQuote = async (customerId, { restaurantId, addressId, items }, transaction) => {
  const address = await findOwnedAddress(addressId, customerId, transaction);

  if (!address) {
    throw new AppError(404, "NOT_FOUND", "Address not found");
  }

  const customer = await findUserById(customerId, transaction);
  const cart = await checkCart({ restaurantId, items }, transaction);
  const problems = [...cart.problems];

  let delivery = null;
  let deliveryFeePesewas = 0;

  if (cart.restaurant) {
    const distanceKm = straightLineKm(cart.restaurant, address);
    const roadMeters = estimateRoadMeters(cart.restaurant, address);
    deliveryFeePesewas = deliveryFeeFor(roadMeters);

    delivery = {
      straightLineKm: distanceKm,
      roadMeters,
      radiusKm: cart.restaurant.deliveryRadiusKm,
      isInRange: distanceKm <= cart.restaurant.deliveryRadiusKm,
    };

    // [AC-CHK-04]
    if (!delivery.isInRange) {
      problems.push({
        code: "OUT_OF_DELIVERY_RANGE",
        message: `This address is ${distanceKm} km away. The restaurant delivers up to ${cart.restaurant.deliveryRadiusKm} km`,
      });
    }
  }

  const totalPesewas =
    cart.subtotalPesewas + deliveryFeePesewas + SERVICE_FEE_PESEWAS - DISCOUNT_PESEWAS;

  return {
    restaurant: cart.restaurant,
    lines: cart.lines,
    subtotalPesewas: cart.subtotalPesewas,
    deliveryFeePesewas,
    serviceFeePesewas: SERVICE_FEE_PESEWAS,
    discountPesewas: DISCOUNT_PESEWAS,
    totalPesewas,
    delivery,
    deliveryAddress: address,
    contactPhone: customer.phone,
    paymentMethods: ["PAYSTACK"],
    problems,
    hasChanges: cart.hasChanges || problems.length > cart.problems.length,
    canPlaceOrder: cart.canCheckout && problems.length === cart.problems.length,
    // Saved on the order, so a later formula change never changes a past order's fee
    pricingSnapshot: {
      distanceSource: "HAVERSINE",
      ...DELIVERY_FEE_RULES,
      straightLineKm: delivery ? delivery.straightLineKm : null,
      roadMeters: delivery ? delivery.roadMeters : null,
      serviceFeePesewas: SERVICE_FEE_PESEWAS,
    },
  };
};
