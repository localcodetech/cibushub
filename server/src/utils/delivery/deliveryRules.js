// Pickup and drop-off rules [AC-DEL-03, AC-DEL-06].
// (Step 13 moves these to the super admin's platform settings.)

export const DELIVERY_RULES = {
  // "Picked up" further than this from the restaurant: warn, confirm, flag for admins
  pickupGeofenceMetres: 200,

  // Wrong delivery codes allowed before the code locks and admins are alerted
  maxCodeAttempts: 5,

  // Still locked this long after: admins are alerted again (SMS from Step 12)
  codeLockReminderAfterMs: 15 * 60 * 1000,

  // "Unreachable" / "not at the address" only after the rider has really tried to call [AC-DEL-08]
  minCallsBeforeUnreachable: 2,

  // A door problem can only be reported this close to the drop-off pin (pins are rough)
  doorRadiusMetres: 300,

  // After a door problem, the rider waits this long before the food goes back
  doorWaitMs: 10 * 60 * 1000,

  // A returned delivery pays 150% of the rider's earnings: the trip there plus half for
  // the way back. CibusHub pays the extra half (the customer is not refunded).
  returnPayoutPercent: 150,

  // "Returned" further than this from the restaurant: warn, confirm, flag (like pickup)
  returnGeofenceMetres: 200,
};
