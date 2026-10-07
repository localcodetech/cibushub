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
  return User.findOne({
    where: {
      [Op.or]: [{ email }, { phone }],
    },
  });
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
