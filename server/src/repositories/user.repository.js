import { Op } from "sequelize";
import { User } from "../models/index.js";

export const findUserById = (id) => {
  return User.findByPk(id);
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

export const createUser = (data, transaction) => {
  return User.create(data, { transaction });
};
