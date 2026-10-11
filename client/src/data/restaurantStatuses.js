// What each restaurant status means to an admin, and how its badge looks
export const RESTAURANT_STATUSES = {
  DRAFT: { label: "Draft", tone: "muted" },
  PENDING_APPROVAL: { label: "Waiting for review", tone: "gold" },
  APPROVED: { label: "Live", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  SUSPENDED: { label: "Suspended", tone: "red" },
};

export const DOCUMENT_NAMES = {
  BUSINESS_REGISTRATION: "Business registration",
  FDA_CERTIFICATE: "FDA certificate",
  GHANA_CARD: "Owner's Ghana Card",
  OPERATING_LICENCE: "Operating licence",
};
