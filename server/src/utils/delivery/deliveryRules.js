// Pickup and drop-off rules [AC-DEL-03, AC-DEL-06].
// (Step 13 moves these to the super admin's platform settings.)

export const DELIVERY_RULES = {
  // "Picked up" further than this from the restaurant: warn, confirm, flag for admins
  pickupGeofenceMetres: 200,

  // Wrong delivery codes allowed before the code locks and admins are alerted
  maxCodeAttempts: 5,

  // Still locked this long after: admins are alerted again (SMS from Step 12)
  codeLockReminderAfterMs: 15 * 60 * 1000,

  // "Customer unreachable" only after the rider has really tried to call [AC-DEL-08]
  minCallsBeforeUnreachable: 2,
};
