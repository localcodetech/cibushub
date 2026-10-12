// What each rider status means to an admin, and how its badge looks
export const RIDER_STATUSES = {
  DRAFT: { label: "Not submitted", tone: "neutral" },
  PENDING_APPROVAL: { label: "Waiting for review", tone: "attention" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
};

export const VEHICLE_NAMES = { MOTORBIKE: "Motorbike", BICYCLE: "Bicycle", CAR: "Car" };

export const RIDER_DOCUMENT_NAMES = {
  GHANA_CARD: "Ghana Card",
  DRIVERS_LICENCE: "Driver's licence",
};
