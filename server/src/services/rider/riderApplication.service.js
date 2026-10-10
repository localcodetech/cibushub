import AppError from "../../utils/AppError.js";
import { DOCUMENT_MIME_TYPES, checkFileType } from "../../utils/upload/checkFileType.js";
import { deleteFromCloudinary, uploadPrivateDocument } from "../upload/cloudinary.service.js";
import { replaceMyAvatar } from "../profile/profile.service.js";
import { findUserById } from "../../repositories/user.repository.js";
import {
  createRiderDocument,
  createRiderProfile,
  findRiderDocumentByType,
  findRiderDocuments,
  findRiderProfileByGhanaCard,
  findRiderProfileByUserId,
  updateRiderDocument,
  updateRiderProfile,
} from "../../repositories/rider.repository.js";
import { MOTORISED_VEHICLES } from "../../models/rider/riderProfile.model.js";
import { emitAdminAlert } from "../../sockets/emitAdminAlert.js";

// The rider can change their application only while filling it in, or after a rejection
const EDITABLE_STATUSES = ["DRAFT", "REJECTED"];

// What is still needed before "Submit for review" works [AC-RIDER-01]:
// a photo, the Ghana Card, and a driver's licence for motorbikes and cars
const findMissing = (profile, user, documents) => {
  const has = (documentType) => documents.some((doc) => doc.documentType === documentType);
  const missing = [];

  if (!profile) {
    missing.push("DETAILS");
  }
  if (!user.avatarUrl) {
    missing.push("PHOTO");
  }
  if (!has("GHANA_CARD")) {
    missing.push("GHANA_CARD");
  }
  if ((!profile || MOTORISED_VEHICLES.includes(profile.vehicleType)) && !has("DRIVERS_LICENCE")) {
    missing.push("DRIVERS_LICENCE");
  }
  return missing;
};

// What the rider sees: never the Cloudinary IDs or links of their documents
const toRiderView = (profile, user, documents) => ({
  status: profile ? profile.status : "NOT_STARTED",
  vehicleType: profile ? profile.vehicleType : null,
  plateNumber: profile ? profile.plateNumber : null,
  ghanaCardNumber: profile ? profile.ghanaCardNumber : null,
  rejectionReason: profile ? profile.rejectionReason : null,
  submittedAt: profile ? profile.submittedAt : null,
  approvedAt: profile ? profile.approvedAt : null,
  photoUrl: user.avatarUrl,
  documents: documents.map((doc) => ({
    documentType: doc.documentType,
    format: doc.format,
    updatedAt: doc.updatedAt,
  })),
  missing: findMissing(profile, user, documents),
  canEdit: !profile || EDITABLE_STATUSES.includes(profile.status),
});

const loadApplication = async (userId) => {
  const user = await findUserById(userId);
  const profile = await findRiderProfileByUserId(userId);
  const documents = profile ? await findRiderDocuments(profile.id) : [];
  return { user, profile, documents };
};

// Under review or approved: the details are locked (an approved rider asks an admin to change them)
const assertEditable = (profile) => {
  if (profile && !EDITABLE_STATUSES.includes(profile.status)) {
    throw new AppError(
      409,
      "APPLICATION_LOCKED",
      profile.status === "PENDING_APPROVAL"
        ? "Your application is being reviewed and can't be changed now"
        : "Your rider details can't be changed now. Contact support to update them",
    );
  }
};

const ghanaCardTaken = () =>
  new AppError(
    409,
    "GHANA_CARD_TAKEN",
    "This Ghana Card is already registered to another rider. Contact support if this is your card",
  );

// MySQL names the clashing index (rider_profiles_ghana_card_unique) or column in error.fields
const isGhanaCardClash = (error) =>
  error.name === "SequelizeUniqueConstraintError" &&
  Object.keys(error.fields || {}).some((field) => field.includes("ghana_card"));

// One Ghana Card, one rider. (The database's unique index catches two saves at the same moment.)
const assertGhanaCardFree = async (ghanaCardNumber, userId) => {
  const holder = await findRiderProfileByGhanaCard(ghanaCardNumber);
  if (holder && holder.userId !== userId) {
    throw ghanaCardTaken();
  }
};

export const getMyRiderApplication = async (userId) => {
  const { user, profile, documents } = await loadApplication(userId);
  return toRiderView(profile, user, documents);
};

// Vehicle and Ghana Card details: creates the application the first time [AC-RIDER-01]
export const saveRiderDetails = async (userId, details) => {
  const existing = await findRiderProfileByUserId(userId);
  assertEditable(existing);
  await assertGhanaCardFree(details.ghanaCardNumber, userId);

  const changes = {
    vehicleType: details.vehicleType,
    // A bicycle has no plate
    plateNumber: MOTORISED_VEHICLES.includes(details.vehicleType) ? details.plateNumber : null,
    ghanaCardNumber: details.ghanaCardNumber,
  };

  try {
    if (existing) {
      await updateRiderProfile(existing, changes);
    } else {
      await createRiderProfile({ userId, ...changes });
    }
  } catch (error) {
    // Only the Ghana Card clash gets this message; anything else is a real error
    if (isGhanaCardClash(error)) {
      throw ghanaCardTaken();
    }
    throw error;
  }

  return getMyRiderApplication(userId);
};

// The rider's photo is their profile photo, so it shows everywhere (e.g. to the restaurant)
export const saveRiderPhoto = async (userId, file) => {
  assertEditable(await findRiderProfileByUserId(userId));
  await replaceMyAvatar(userId, file);

  return getMyRiderApplication(userId);
};

// Ghana Card or driver's licence, kept private [AC-RIDER-01, AC-IMG-03]
export const saveRiderDocument = async (userId, documentType, file) => {
  const profile = await findRiderProfileByUserId(userId);
  if (!profile) {
    throw new AppError(409, "DETAILS_REQUIRED", "Fill in your vehicle details first");
  }
  assertEditable(profile);
  await checkFileType(file.buffer, DOCUMENT_MIME_TYPES);

  const uploaded = await uploadPrivateDocument(file.buffer, `riders/${profile.id}/documents`);
  const existing = await findRiderDocumentByType(profile.id, documentType);

  if (existing) {
    const oldPublicId = existing.publicId;
    await updateRiderDocument(existing, uploaded);
    // Only after the new one is saved, so the rider is never left without it
    await deleteFromCloudinary(oldPublicId, "authenticated");
  } else {
    await createRiderDocument({ riderProfileId: profile.id, documentType, ...uploaded });
  }

  return getMyRiderApplication(userId);
};

// "Submit for review": everything must be there; then admins are told [AC-RIDER-01]
export const submitRiderApplication = async (userId) => {
  const { user, profile, documents } = await loadApplication(userId);
  assertEditable(profile);

  const missing = findMissing(profile, user, documents);
  if (missing.length > 0) {
    throw new AppError(
      400,
      "APPLICATION_INCOMPLETE",
      "Some details are still missing",
      missing.map((item) => ({ field: item, message: "Required" })),
    );
  }

  await updateRiderProfile(profile, {
    status: "PENDING_APPROVAL",
    submittedAt: new Date(),
    rejectionReason: null,
  });

  emitAdminAlert("RIDER_APPLIED", { riderProfileId: profile.id, fullName: user.fullName });

  return getMyRiderApplication(userId);
};
