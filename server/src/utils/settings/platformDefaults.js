// Audit lines need a target id: this one fixed id means "the platform settings"
// (the version number is written in the line itself)
export const PLATFORM_SETTINGS_TARGET_ID = "00000000-0000-4000-8000-000000000001";

// The platform settings a super admin can change [AC-SADM-02], with their starting values.
// The live values are in the platform_settings table (newest row wins); these are only the
// first version, and the shape every version must have.
export const DEFAULT_SETTINGS = {
  // Delivery fee = base + per km x road km (docs/pricing.md)
  deliveryBasePesewas: 500,
  deliveryPerKmPesewas: 200,
  // Added to every order (none for now)
  serviceFeePesewas: 0,
  // CibusHub's share of the food subtotal
  commissionPercent: 10,
  // Finding a rider: first this far from the restaurant, then once more, wider
  searchRadiusKm: 5,
  widenedRadiusKm: 10,
  // How long a rider has to answer an offer
  offerSeconds: 60,
  // How long a restaurant has to accept a paid order before it is rejected for them
  restaurantResponseMinutes: 5,
  // How long an order may wait for payment before it is cancelled
  unpaidOrderMinutes: 30,
  // How customers may pay (cash on delivery is not built yet)
  paymentMethods: ["PAYSTACK"],
};
