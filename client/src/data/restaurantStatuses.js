// What each restaurant status means to an admin, and how its badge looks
export const RESTAURANT_STATUSES = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PENDING_APPROVAL: { label: "Waiting for review", tone: "attention" },
  APPROVED: { label: "Live", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
};

// In the order they are shown: the two required ones first
export const DOCUMENT_NAMES = {
  BUSINESS_REGISTRATION: "Business registration",
  TAX_CERTIFICATE: "Tax certificate (GRA TIN)",
  FDA_CERTIFICATE: "FDA certificate",
  GHANA_CARD: "Owner's Ghana Card",
  OPERATING_LICENCE: "Operating licence",
};

// A restaurant can only go live once our team has verified both. Must match
// REQUIRED_DOCUMENT_TYPES on the server.
export const REQUIRED_DOCUMENTS = ["BUSINESS_REGISTRATION", "TAX_CERTIFICATE"];

// Where our team's check of one document stands, and how its badge looks
export const DOCUMENT_STATUSES = {
  PENDING: { label: "Being checked", tone: "attention" },
  VERIFIED: { label: "Verified", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
};

// The required documents that are missing or not verified yet
export const unverifiedRequiredDocuments = (documents) => {
  return REQUIRED_DOCUMENTS.filter((documentType) => {
    const document = documents.find((each) => each.documentType === documentType);
    return !document || document.verificationStatus !== "VERIFIED";
  });
};
