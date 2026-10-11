import { Op } from "sequelize";
import { User } from "../models/index.js";

export const findUserById = (id, transaction) => {
  return User.findByPk(id, { transaction });
};

export const findUserByPhone = (phone) => {
  return User.findOne({ where: { phone } });
};

export const findUserByEmail = (email) => {
  return User.findOne({ where: { email } });
};

export const findUserByEmailOrPhone = (email, phone) => {
  // Only search by values we have. { phone: null } would match every
  // Google / Apple user who hasn't added a phone yet.
  const conditions = [];
  if (email) {
    conditions.push({ email });
  }
  if (phone) {
    conditions.push({ phone });
  }
  if (conditions.length === 0) {
    return null;
  }

  return User.findOne({ where: { [Op.or]: conditions } });
};

export const findUserForLogin = (identifier) => {
  return User.scope("withPassword").findOne({
    where: {
      [Op.or]: [{ email: identifier }, { phone: identifier }],
    },
  });
};

export const findUserByIdWithPassword = (id) => {
  return User.scope("withPassword").findByPk(id);
};

export const createUser = (data, transaction) => {
  return User.create(data, { transaction });
};

export const updateUser = (user, changes, transaction) => {
  return user.update(changes, { transaction });
};

// Admins: accounts newest first [AC-ADM-02].
//   search: part of a name or email; phone: an exact +233 number (from the same text)
export const findUsersForAdmin = ({ search, phone, role, status, limit, offset }) => {
  const where = {};
  if (role) {
    where.role = role;
  }
  if (status) {
    where.status = status;
  }
  if (search) {
    const like = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
    const anyOf = [{ fullName: { [Op.like]: like } }, { email: { [Op.like]: like } }];
    if (phone) {
      anyOf.push({ phone });
    }
    where[Op.or] = anyOf;
  }
  return User.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });
};

// One user's row, locked until the transaction ends (two admins can't both act on it)
export const lockUserById = (id, transaction) => {
  return User.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
};

// Everyone who should hear about an admin alert
export const findActiveAdmins = () => {
  return User.findAll({ where: { role: ["ADMIN", "SUPER_ADMIN"], status: "ACTIVE" } });
};
