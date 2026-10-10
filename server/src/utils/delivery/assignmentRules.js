// How riders are found for a delivery [AC-ASSIGN-02 to AC-ASSIGN-06].
// (Step 13 moves these to the super admin's platform settings.)

export const ASSIGNMENT_RULES = {
  // First search around the restaurant, then once more, wider
  searchRadiusKm: 5,
  
  widenedRadiusKm: 10,

  // Each rider has this long to answer an offer
  offerSeconds: 60,
  // A rider whose last location is older than this is not asked
  freshLocationMs: 2 * 60 * 1000,

  // Still no rider after this long: admins are alerted and the customer is told
  alertAfterMs: 10 * 60 * 1000,
};
