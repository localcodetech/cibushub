// What each restaurant status means to an admin, and how its badge looks
export const RESTAURANT_STATUSES = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PENDING_APPROVAL: { label: "Waiting for review", tone: "attention" },
  APPROVED: { label: "Live", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
};

export const DOCUMENT_NAMES = {
  BUSINESS_REGISTRATION: "Business registration",
  FDA_CERTIFICATE: "FDA certificate",
  GHANA_CARD: "Owner's Ghana Card",
  OPERATING_LICENCE: "Operating licence",
};
