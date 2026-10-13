import sequelize from "../../config/database.js";
import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import AppError from "../../utils/AppError.js";
import { verifyPassword } from "../../utils/auth/password.js";
import {
  findUserByIdWithPassword,
  lockUserById,
  updateUser,
} from "../../repositories/user.repository.js";
import { saveAuditLog } from "../../repositories/auditLog.repository.js";
import { findRestaurantsByOwner } from "../../repositories/restaurant.repository.js";
import {
  findRiderProfileByUserId,
  updateRiderProfile,
} from "../../repositories/rider.repository.js";
import {
  anonymiseCustomerOrders,
  countActiveDeliveries,
  countOpenOrders,
  countPendingRefunds,
  deleteRiderRecords,
  deleteUserRecords,
} from "../../repositories/accountErasure.repository.js";
import { deleteFromCloudinary } from "../upload/cloudinary.service.js";
import { forgetRider } from "../rider/riderLocationStore.js";
import { disconnectUser } from "../../sockets/disconnectUser.js";
import { notify } from "../notifications/notify.service.js";
import { accountDeletedEmail } from "../notifications/templates/emails.js";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

const blocked = (code, message) => new AppError(409, code, message);

// What has to be finished before an account can go [AC-CUST-11]. Throws the reason, in words
// the person can act on.
const checkNothingInProgress = async (user, transaction) => {
  if (ADMIN_ROLES.includes(user.role)) {
    throw new AppError(403, "ADMIN_ACCOUNT", "Admin accounts are removed by the super admin");
  }

  // A restaurant has customers, money and tax records of its own: support closes it first
  if (user.role === "RESTAURANT_OWNER") {
    const restaurants = await findRestaurantsByOwner(user.id);
    if (restaurants.length > 0) {
      throw blocked(
        "ACCOUNT_HAS_RESTAURANTS",
        "Your account has restaurants. Contact support to close them, then the account can be deleted",
      );
    }
  }

  if ((await countOpenOrders(user.id)) > 0) {
    throw blocked(
      "ACCOUNT_HAS_OPEN_ORDERS",
      "You have an order in progress. You can delete your account once it's delivered or cancelled",
    );
  }
  if ((await countPendingRefunds(user.id)) > 0) {
    throw blocked(
      "ACCOUNT_HAS_PENDING_REFUND",
      "A refund is still on its way to you. You can delete your account once it arrives",
    );
  }

  if (user.role === "RIDER") {
    const profile = await findRiderProfileByUserId(user.id, transaction);
    if (profile && (await countActiveDeliveries(profile.id)) > 0) {
      throw blocked(
        "ACCOUNT_HAS_ACTIVE_DELIVERY",
        "Finish your delivery first, then you can delete your account",
      );
    }
  }
};

// Removes one person's data [AC-CUST-11]. In one transaction: the checks, the account itself
// (anonymised, then soft-deleted), their records, and an audit entry. Then, outside it: the
// files on Cloudinary, live connections, and one last email to the old address.
//   actor: { id, ipAddress, reason } (the person themselves, or the admin acting on a request)
const eraseAccount = async (userId, actor) => {
  const erased = await sequelize.transaction(async (transaction) => {
    const user = await lockUserById(userId, transaction);
    if (!user) {
      throw new AppError(404, "NOT_FOUND", "User not found");
    }
    await checkNothingInProgress(user, transaction);

    // Kept for after the transaction: the files to delete and where to send the notice
    const before = { email: user.email, avatarPublicId: user.avatarPublicId, role: user.role };

    await deleteUserRecords(user.id, transaction);
    await anonymiseCustomerOrders(user.id, transaction);

    let riderFiles = [];
    let riderProfileId = null;
    const profile = await findRiderProfileByUserId(user.id, transaction);
    if (profile) {
      riderProfileId = profile.id;
      riderFiles = await deleteRiderRecords(profile.id, transaction);
      await updateRiderProfile(
        profile,
        {
          // Required and unique: a placeholder that can never match a real card
          ghanaCardNumber: "DEL-" + profile.id.replace(/-/g, "").slice(0, 16),
          plateNumber: null,
          isOnline: false,
          wentOnlineAt: null,
        },
        transaction,
      );
    }

    // The account row stays (orders and reviews point to it) with nothing personal left.
    // The email must stay unique and never deliver: .invalid is reserved for exactly that.
    await updateUser(
      user,
      {
        fullName: "Deleted user",
        email: `deleted-${user.id}@deleted.invalid`,
        phone: null,
        passwordHash: null,
        avatarUrl: null,
        avatarPublicId: null,
        emailVerifiedAt: null,
        emailBouncedAt: null,
        phoneVerifiedAt: null,
        lastLoginAt: null,
        marketingOptIn: false,
        marketingOptInChangedAt: new Date(),
        status: "SUSPENDED",
      },
      transaction,
    );
    // Soft delete: hidden everywhere, and the session check no longer finds it
    await user.destroy({ transaction });

    await saveAuditLog(
      {
        actorId: actor.id,
        action: "ACCOUNT_DELETED",
        targetType: "user",
        targetId: user.id,
        before: { role: before.role },
        after: { deleted: true },
        reason: actor.reason,
        ipAddress: actor.ipAddress,
      },
      transaction,
    );

    return { ...before, riderFiles, riderProfileId };
  });

  // Outside the transaction: none of these can be rolled back, so they come last. The account
  // is already gone, so a failure here is logged, never shown as "deleting failed".
  try {
    await deleteFromCloudinary(erased.avatarPublicId);
    for (const publicId of erased.riderFiles) {
      await deleteFromCloudinary(publicId, "authenticated");
    }
    if (erased.riderProfileId) {
      await forgetRider(erased.riderProfileId);
    }
    disconnectUser(userId);
    await redis.del(`profile:pending-phone:${userId}`, `profile:pending-email:${userId}`);

    await notify({
      channel: "EMAIL",
      to: erased.email,
      template: "account.deleted",
      ...accountDeletedEmail(),
    });
  } catch (error) {
    logger.error({ err: error, userId }, "Account deleted, but a clean-up step failed");
  }

  logger.info({ userId, byAdmin: actor.id !== userId }, "Account deleted");
};

// The person deletes their own account. Their password proves it's really them; a Google /
// Apple account without a password confirms with the typed word alone (checked by the validator).
export const deleteMyAccount = async (userId, password, ipAddress) => {
  const user = await findUserByIdWithPassword(userId);
  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "Please log in to continue");
  }

  if (user.passwordHash) {
    const isCorrect = password ? await verifyPassword(password, user.passwordHash) : false;
    if (!isCorrect) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", [
        {
          field: "password",
          message: password ? "Password is incorrect" : "Enter your password",
        },
      ]);
    }
  }

  await eraseAccount(userId, {
    id: userId,
    ipAddress,
    reason: "Deleted by the account holder",
  });
};

// An admin deletes an account for someone who asked by email or phone [AC-CUST-11]
export const deleteAccountForAdmin = async (admin, userId, reason) => {
  await eraseAccount(userId, { id: admin.id, ipAddress: admin.ipAddress, reason });
};
