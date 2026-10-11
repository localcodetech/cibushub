// What each rider status means to an admin, and how its badge looks
export const RIDER_STATUSES = {
  DRAFT: { label: "Not submitted", tone: "muted" },
  PENDING_APPROVAL: { label: "Waiting for review", tone: "gold" },
  APPROVED: { label: "Approved", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  SUSPENDED: { label: "Suspended", tone: "red" },
};

export const VEHICLE_NAMES = { MOTORBIKE: "Motorbike", BICYCLE: "Bicycle", CAR: "Car" };

export const RIDER_DOCUMENT_NAMES = {
  GHANA_CARD: "Ghana Card",
  DRIVERS_LICENCE: "Driver's licence",
};
