import sequelize from "../../config/database.js";
import { retryOnDeadlock } from "../../utils/database/retryOnDeadlock.js";
import AppError from "../../utils/AppError.js";
import { hashPassword } from "../../utils/auth/password.js";
import { saveAuditLog } from "../../repositories/auditLog.repository.js";
import {
  createUser,
  findAdminAccounts,
  findUserById,
  findUserByEmailOrPhone,
  lockActiveSuperAdmins,
  lockUserById,
  updateUser,
} from "../../repositories/user.repository.js";
import { revokeAllUserTokens } from "../../repositories/refreshToken.repository.js";
import { disconnectUser } from "../../sockets/disconnectUser.js";
import { notify } from "../notifications/notify.service.js";

// Only super admins manage admin accounts [AC-SADM-01]. The last active super admin can never
// be suspended, demoted or removed [AC-SADM-04], or nobody could run the platform.

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

const audit = (superAdmin, action, target, before, after, reason, transaction) =>
  saveAuditLog(
    {
      actorId: superAdmin.id,
      action,
      targetType: "user",
      targetId: target.id,
      before,
      after,
      reason: reason || null,
      ipAddress: superAdmin.ipAddress,
    },
    transaction,
  );

// The admin account being changed, locked; never one's own (no locking yourself out).
// The active super admins are locked FIRST, always in the same order: two super admins acting
// on each other at the same moment then wait in line instead of deadlocking [AC-SADM-04].
const lockAdminAccount = async (superAdmin, userId, transaction) => {
  if (userId === superAdmin.id) {
    throw new AppError(403, "OWN_ACCOUNT", "You can't change your own admin account here");
  }
  await lockActiveSuperAdmins(transaction);
  const user = await lockUserById(userId, transaction);
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    throw new AppError(404, "NOT_FOUND", "Admin not found");
  }
  return user;
};

// Taking this account away from the active super admins: is anyone left? [AC-SADM-04]
// (The one acting is a super admin too, so this bites when two of them act on each other at
// the same moment: the second one, waiting on the lock, then sees they'd be the last.)
const checkNotLastSuperAdmin = async (user, transaction) => {
  if (user.role !== "SUPER_ADMIN" || user.status !== "ACTIVE") {
    return;
  }
  const activeSuperAdmins = await lockActiveSuperAdmins(transaction);
  const others = activeSuperAdmins.filter((each) => each.id !== user.id);
  if (others.length === 0) {
    throw new AppError(
      409,
      "LAST_SUPER_ADMIN",
      "This is the last active super admin. Make someone else a super admin first",
    );
  }
};

// Signed out on every device at once
const signOutEverywhere = async (userId) => {
  await revokeAllUserTokens(userId);
  disconnectUser(userId);
};

export const listAdmins = () => findAdminAccounts();

// A new admin or super admin, ready to log in [AC-SADM-01]. The phone is trusted (the super
// admin knows this person); the email is confirmed by the usual code after the first login.
export const createAdmin = async (superAdmin, details) => {
  const accountExists = () =>
    new AppError(409, "ACCOUNT_EXISTS", "An account with these details already exists");
  if (await findUserByEmailOrPhone(details.email, details.phone)) {
    throw accountExists();
  }

  let admin;
  try {
    admin = await sequelize.transaction(async (transaction) => {
      const created = await createUser(
        {
          fullName: details.fullName,
          email: details.email,
          phone: details.phone,
          passwordHash: await hashPassword(details.password),
          role: details.role,
          status: "ACTIVE",
          phoneVerifiedAt: new Date(),
        },
        transaction,
      );
      await audit(
        superAdmin,
        "ADMIN_CREATED",
        created,
        null,
        { role: details.role },
        null,
        transaction,
      );
      return created;
    });
  } catch (error) {
    // Also taken by a removed account (kept in the database for its history)
    if (error.name === "SequelizeUniqueConstraintError") {
      throw accountExists();
    }
    throw error;
  }

  // The password is never sent; it is handed over in person
  await notify({
    channel: "SMS",
    to: admin.phone,
    template: "admin.created",
    text: "You now have a CibusHub admin account. Log in with the password you were given, then change it.",
  });

  // Read it again: the saved row still holds the password hash, which must never be sent back
  return findUserById(admin.id);
};

export const suspendAdmin = async (superAdmin, userId, reason) => {
  const admin = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const user = await lockAdminAccount(superAdmin, userId, transaction);
      if (user.status === "SUSPENDED") {
        throw new AppError(409, "ALREADY_SUSPENDED", "This account is already suspended");
      }
      await checkNotLastSuperAdmin(user, transaction);

      await updateUser(user, { status: "SUSPENDED" }, transaction);
      await audit(
        superAdmin,
        "ADMIN_SUSPENDED",
        user,
        { status: "ACTIVE" },
        { status: "SUSPENDED" },
        reason,
        transaction,
      );
      return user;
    }),
  );

  await signOutEverywhere(admin.id);
  return admin;
};

export const reactivateAdmin = async (superAdmin, userId, reason) => {
  return sequelize.transaction(async (transaction) => {
    const user = await lockAdminAccount(superAdmin, userId, transaction);
    if (user.status !== "SUSPENDED") {
      throw new AppError(409, "NOT_SUSPENDED", "This account is not suspended");
    }
    await updateUser(user, { status: "ACTIVE" }, transaction);
    await audit(
      superAdmin,
      "ADMIN_REACTIVATED",
      user,
      { status: "SUSPENDED" },
      { status: "ACTIVE" },
      reason,
      transaction,
    );
    return user;
  });
};

// Admin <-> super admin [AC-SADM-01, AC-SADM-04]
export const changeAdminRole = async (superAdmin, userId, role, reason) => {
  const admin = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const user = await lockAdminAccount(superAdmin, userId, transaction);
      if (user.role === role) {
        throw new AppError(409, "SAME_ROLE", "This account already has that role");
      }
      if (role === "ADMIN") {
        await checkNotLastSuperAdmin(user, transaction);
      }

      const previousRole = user.role;
      await updateUser(user, { role }, transaction);
      await audit(
        superAdmin,
        "ADMIN_ROLE_CHANGED",
        user,
        { role: previousRole },
        { role },
        reason,
        transaction,
      );
      return user;
    }),
  );

  // Their login tokens carry the old role: make them log in again with the new one
  await signOutEverywhere(admin.id);
  return admin;
};

// Remove an admin account (kept in the database, never shown or usable again)
export const removeAdmin = async (superAdmin, userId, reason) => {
  const admin = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const user = await lockAdminAccount(superAdmin, userId, transaction);
      await checkNotLastSuperAdmin(user, transaction);

      await audit(
        superAdmin,
        "ADMIN_REMOVED",
        user,
        { role: user.role, status: user.status },
        null,
        reason,
        transaction,
      );
      // paranoid: sets deleted_at, so the audit history still points at a real row
      await user.destroy({ transaction });
      return user;
    }),
  );

  await signOutEverywhere(admin.id);
  return { id: admin.id, removed: true };
};
