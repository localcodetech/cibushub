import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";
import { normalizeGhanaPhone } from "../../utils/phone.js";
import { saveAuditLog, findLatestAudit } from "../../repositories/auditLog.repository.js";
import {
  findUserById,
  findUsersForAdmin,
  lockUserById,
  updateUser,
} from "../../repositories/user.repository.js";
import { revokeAllUserTokens } from "../../repositories/refreshToken.repository.js";
import { findRestaurantsByOwner } from "../../repositories/restaurant.repository.js";
import {
  findRiderProfileByUserId,
  updateRiderProfile,
} from "../../repositories/rider.repository.js";
import { countCustomerOrders } from "../../repositories/order.repository.js";
import { forgetRider } from "../rider/riderLocationStore.js";
import { disconnectUser } from "../../sockets/disconnectUser.js";
import { notify } from "../notifications/notify.service.js";

// Admin accounts are managed by the super admin, not here [AC-SADM-01]
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

// Search and filter every account, newest first [AC-ADM-02]
export const listUsersForAdmin = async (query) => {
  const { limit, offset } = toLimitAndOffset(query);
  const { rows, count } = await findUsersForAdmin({
    search: query.q,
    // "024 123 4567" also finds "+233241234567"
    phone: query.q ? normalizeGhanaPhone(query.q) : null,
    role: query.role,
    status: query.status,
    limit,
    offset,
  });

  return { users: rows, meta: buildPageMeta(query, count) };
};

// One account, with what goes with its role (orders, restaurants, rider application)
export const getUserForAdmin = async (userId) => {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }

  const details = { ...user.toJSON(), canBeSuspended: !ADMIN_ROLES.includes(user.role) };
  if (user.role === "CUSTOMER") {
    details.orderCount = await countCustomerOrders(user.id);
  }
  if (user.role === "RESTAURANT_OWNER") {
    const restaurants = await findRestaurantsByOwner(user.id);
    details.restaurants = restaurants.map((restaurant) => ({
      id: restaurant.id,
      name: restaurant.name,
      status: restaurant.status,
    }));
  }
  if (user.role === "RIDER") {
    const profile = await findRiderProfileByUserId(user.id);
    details.riderProfile = profile ? { id: profile.id, status: profile.status } : null;
  }
  return details;
};

// Suspend an account, with a reason [AC-ADM-02, AC-ADM-08]. In one transaction: the status
// changes and the audit log records it; a rider is also taken offline. Then they are signed
// out everywhere at once and told by SMS.
export const suspendUser = async (admin, userId, reason) => {
  const user = await sequelize.transaction(async (transaction) => {
    const locked = await lockUserById(userId, transaction);
    if (!locked) {
      throw new AppError(404, "NOT_FOUND", "User not found");
    }
    if (ADMIN_ROLES.includes(locked.role)) {
      throw new AppError(403, "ADMIN_ACCOUNT", "Admin accounts are managed by the super admin");
    }
    if (locked.status === "SUSPENDED") {
      throw new AppError(409, "ALREADY_SUSPENDED", "This account is already suspended");
    }

    const previousStatus = locked.status;
    await updateUser(locked, { status: "SUSPENDED" }, transaction);

    if (locked.role === "RIDER") {
      const profile = await findRiderProfileByUserId(locked.id, transaction);
      if (profile && profile.isOnline) {
        await updateRiderProfile(profile, { isOnline: false, wentOnlineAt: null }, transaction);
      }
    }

    await saveAuditLog(
      {
        actorId: admin.id,
        action: "USER_SUSPENDED",
        targetType: "user",
        targetId: locked.id,
        before: { status: previousStatus },
        after: { status: "SUSPENDED" },
        reason,
        ipAddress: admin.ipAddress,
      },
      transaction,
    );
    return locked;
  });

  // Signed out on every device: no new tokens, and open live connections closed
  await revokeAllUserTokens(user.id);
  disconnectUser(user.id);
  if (user.role === "RIDER") {
    const profile = await findRiderProfileByUserId(user.id);
    if (profile) {
      await forgetRider(profile.id);
    }
  }

  await notify({
    channel: "SMS",
    to: user.phone,
    template: "account.suspended",
    text: `Your CibusHub account has been suspended. Reason: ${reason}. Contact support for help.`,
  });

  return user;
};

// Reactivate a suspended account, with a reason. It goes back to the status it had before
// the suspension (e.g. still waiting for approval), read from the audit log.
export const reactivateUser = async (admin, userId, reason) => {
  const user = await sequelize.transaction(async (transaction) => {
    const locked = await lockUserById(userId, transaction);
    if (!locked) {
      throw new AppError(404, "NOT_FOUND", "User not found");
    }
    if (ADMIN_ROLES.includes(locked.role)) {
      throw new AppError(403, "ADMIN_ACCOUNT", "Admin accounts are managed by the super admin");
    }
    if (locked.status !== "SUSPENDED") {
      throw new AppError(409, "NOT_SUSPENDED", "This account is not suspended");
    }

    const lastSuspension = await findLatestAudit(
      { targetType: "user", targetId: locked.id, action: "USER_SUSPENDED" },
      transaction,
    );
    const statusBefore = lastSuspension?.before?.status || "ACTIVE";

    await updateUser(locked, { status: statusBefore }, transaction);
    await saveAuditLog(
      {
        actorId: admin.id,
        action: "USER_REACTIVATED",
        targetType: "user",
        targetId: locked.id,
        before: { status: "SUSPENDED" },
        after: { status: statusBefore },
        reason,
        ipAddress: admin.ipAddress,
      },
      transaction,
    );
    return locked;
  });

  await notify({
    channel: "SMS",
    to: user.phone,
    template: "account.reactivated",
    text: "Your CibusHub account is active again. You can log in now.",
  });

  return user;
};
