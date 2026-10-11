import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";
import { signedDocumentUrl } from "../upload/cloudinary.service.js";
import { forgetRider } from "./riderLocationStore.js";
import { updateUser } from "../../repositories/user.repository.js";
import { saveAuditLog } from "../../repositories/auditLog.repository.js";
import {
  findRiderDocuments,
  findRiderProfileForAdmin,
  findRiderProfilesForAdmin,
  updateRiderProfile,
} from "../../repositories/rider.repository.js";
import {
  notifyRiderApproved,
  notifyRiderRejected,
  notifyRiderSuspended,
} from "../notifications/riderReviewed.service.js";

// For each new status: the statuses a rider is allowed to come from [AC-RIDER-02]
const ALLOWED_PREVIOUS_STATUSES = {
  APPROVED: ["PENDING_APPROVAL", "SUSPENDED"],
  REJECTED: ["PENDING_APPROVAL"],
  SUSPENDED: ["APPROVED"],
};

// What an admin sees: the application and the rider's account
const toAdminView = (profile) => ({
  id: profile.id,
  status: profile.status,
  vehicleType: profile.vehicleType,
  plateNumber: profile.plateNumber,
  ghanaCardNumber: profile.ghanaCardNumber,
  rejectionReason: profile.rejectionReason,
  submittedAt: profile.submittedAt,
  approvedAt: profile.approvedAt,
  rider: {
    id: profile.user.id,
    fullName: profile.user.fullName,
    phone: profile.user.phone,
    email: profile.user.email,
    photoUrl: profile.user.avatarUrl,
    accountStatus: profile.user.status,
  },
});

// The review queue, oldest submission first [AC-RIDER-02]
export const listRidersForAdmin = async (query) => {
  const { limit, offset } = toLimitAndOffset(query);
  const { rows, count } = await findRiderProfilesForAdmin({ status: query.status, limit, offset });

  return { riders: rows.map(toAdminView), meta: buildPageMeta(query, count) };
};

const loadRider = async (riderId, transaction) => {
  const profile = await findRiderProfileForAdmin(riderId, transaction);
  if (!profile) {
    throw new AppError(404, "NOT_FOUND", "Rider not found");
  }
  return profile;
};

export const getRiderForAdmin = async (riderId) => {
  return toAdminView(await loadRider(riderId));
};

// The Ghana Card and licence, each with a link that works for 5 minutes [AC-IMG-03]
export const listRiderDocumentsForAdmin = async (riderId) => {
  const profile = await loadRider(riderId);
  const documents = await findRiderDocuments(profile.id);

  return documents.map((document) => ({
    documentType: document.documentType,
    format: document.format,
    updatedAt: document.updatedAt,
    url: signedDocumentUrl(document.publicId, document.format),
  }));
};

// Moves the rider to a new status inside one transaction, with an audit line [AC-ADM-07].
// The row is locked, so two admins clicking at once can't both act on it.
const changeRiderStatus = async ({ riderId, newStatus, admin, reason, changes = {} }) => {
  return sequelize.transaction(async (transaction) => {
    const profile = await loadRider(riderId, transaction);
    const previousStatus = profile.status;

    if (!ALLOWED_PREVIOUS_STATUSES[newStatus].includes(previousStatus)) {
      throw new AppError(
        409,
        "INVALID_STATUS_TRANSITION",
        `A rider who is ${previousStatus} cannot be changed to ${newStatus}`,
      );
    }

    await updateRiderProfile(profile, { status: newStatus, ...changes }, transaction);

    // The first approval also unlocks the rider's account [AC-AUTH-05]
    if (newStatus === "APPROVED" && profile.user.status === "PENDING_APPROVAL") {
      await updateUser(profile.user, { status: "ACTIVE" }, transaction);
    }

    await saveAuditLog(
      {
        actorId: admin.id,
        action: `RIDER_${newStatus}`,
        targetType: "rider",
        targetId: profile.id,
        before: { status: previousStatus },
        after: { status: newStatus },
        reason: reason || null,
        ipAddress: admin.ipAddress,
      },
      transaction,
    );

    return profile;
  });
};

// Approve a pending rider, or reinstate a suspended one: only approved riders can go online
export const approveRider = async (riderId, admin) => {
  const profile = await changeRiderStatus({
    riderId,
    newStatus: "APPROVED",
    admin,
    changes: { approvedAt: new Date(), rejectionReason: null },
  });

  await notifyRiderApproved(profile.user);
  return getRiderForAdmin(riderId);
};

// Reject with a reason the rider sees; they can fix it and submit again
export const rejectRider = async (riderId, reason, admin) => {
  const profile = await changeRiderStatus({
    riderId,
    newStatus: "REJECTED",
    admin,
    reason,
    changes: { rejectionReason: reason },
  });

  await notifyRiderRejected(profile.user, reason);
  return getRiderForAdmin(riderId);
};

// Suspend an approved rider: taken offline at once, no more offers until reinstated
export const suspendRider = async (riderId, reason, admin) => {
  const profile = await changeRiderStatus({
    riderId,
    newStatus: "SUSPENDED",
    admin,
    reason,
    changes: { isOnline: false, wentOnlineAt: null },
  });
  await forgetRider(profile.id);

  await notifyRiderSuspended(profile.user, reason);
  return getRiderForAdmin(riderId);
};
