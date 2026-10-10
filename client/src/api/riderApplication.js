import { api } from "@/lib/api";

// Every call to the rider's /rider/application endpoints lives here [AC-RIDER-01].
// The application looks like:
//   { status: "NOT_STARTED" | "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SUSPENDED",
//     vehicleType, plateNumber, ghanaCardNumber, rejectionReason, submittedAt, approvedAt,
//     photoUrl, documents: [{ documentType, format, updatedAt }],
//     missing: ["DETAILS", "PHOTO", "GHANA_CARD", "DRIVERS_LICENCE"], canEdit }

export const getMyApplicationRequest = async () => {
  const result = await api.get("/rider/application");
  return result.data;
};

// details = { vehicleType, plateNumber?, ghanaCardNumber }
export const saveRiderDetailsRequest = async (details) => {
  const result = await api.put("/rider/application", details);
  return result.data;
};

// A file goes inside FormData, under the field name the server reads
export const uploadRiderPhotoRequest = async (file) => {
  const form = new FormData();
  form.append("image", file);
  const result = await api.put("/rider/application/photo", form);
  return result.data;
};

// documentType: "GHANA_CARD" or "DRIVERS_LICENCE" (an image or a PDF)
export const uploadRiderDocumentRequest = async (documentType, file) => {
  const form = new FormData();
  form.append("document", file);
  const result = await api.put("/rider/application/documents/" + documentType, form);
  return result.data;
};

export const submitApplicationRequest = async () => {
  const result = await api.post("/rider/application/submit");
  return result.data;
};
