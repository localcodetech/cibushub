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
import { getSettings } from "../settings/platformSettings.service.js";

const DISCOUNT_PESEWAS = 0; // promo codes come later

// Everything the checkout page shows, worked out from the database only.
// Placing the order uses this same function, so what is shown is what is charged [AC-CHK-01, AC-CHK-03]
//   seenTotalPesewas: (placing only) the total the checkout page showed. If fees changed since
//   (a super admin changed a setting), the order stops with the new total [plan-review C14].
export const buildQuote = async (
  customerId,
  { restaurantId, addressId, items, seenTotalPesewas },
  transaction,
) => {
  const address = await findOwnedAddress(addressId, customerId, transaction);

  if (!address) {
    throw new AppError(404, "NOT_FOUND", "Address not found");
  }

  const customer = await findUserById(customerId, transaction);
  // The fees, commission and payment methods in force right now [AC-SADM-03]
  const settings = await getSettings();
  const cart = await checkCart({ restaurantId, items }, transaction);
  const problems = [...cart.problems];

  let delivery = null;
  let deliveryFeePesewas = 0;

  if (cart.restaurant) {
    const distanceKm = straightLineKm(cart.restaurant, address);
    const roadMeters = estimateRoadMeters(cart.restaurant, address);
    deliveryFeePesewas = deliveryFeeFor(roadMeters, settings.values);

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

  const serviceFeePesewas = settings.values.serviceFeePesewas;
  const totalPesewas =
    cart.subtotalPesewas + deliveryFeePesewas + serviceFeePesewas - DISCOUNT_PESEWAS;

  // The page showed another total: something changed. Show the new one before charging it.
  if (
    seenTotalPesewas !== undefined &&
    seenTotalPesewas !== totalPesewas &&
    problems.length === 0
  ) {
    problems.push({
      code: "TOTAL_CHANGED",
      message: `The total changed from ${seenTotalPesewas} to ${totalPesewas} pesewas. Please check it and try again`,
    });
  }

  return {
    restaurant: cart.restaurant,
    lines: cart.lines,
    subtotalPesewas: cart.subtotalPesewas,
    deliveryFeePesewas,
    serviceFeePesewas,
    discountPesewas: DISCOUNT_PESEWAS,
    totalPesewas,
    delivery,
    deliveryAddress: address,
    contactPhone: customer.phone,
    paymentMethods: settings.values.paymentMethods,
    // Used when the order is saved, so the split matches the prices shown
    commissionPercent: settings.values.commissionPercent,
    problems,
    hasChanges: cart.hasChanges || problems.length > cart.problems.length,
    canPlaceOrder: cart.canCheckout && problems.length === cart.problems.length,
    // Saved on the order, so a later formula change never changes a past order's fee
    pricingSnapshot: {
      // Which settings version priced this order [AC-SADM-03]
      settingsVersion: settings.version,
      distanceSource: "HAVERSINE",
      ...DELIVERY_FEE_RULES,
      basePesewas: settings.values.deliveryBasePesewas,
      perKmPesewas: settings.values.deliveryPerKmPesewas,
      straightLineKm: delivery ? delivery.straightLineKm : null,
      roadMeters: delivery ? delivery.roadMeters : null,
      serviceFeePesewas,
    },
  };
};
