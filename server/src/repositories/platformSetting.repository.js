import { PlatformSetting, User } from "../models/index.js";

// The settings in force: the newest version
export const findCurrentSettings = (transaction) => {
  return PlatformSetting.findOne({ order: [["id", "DESC"]], transaction });
};

// The newest version, locked: two super admins saving at once get versions one after the other
export const lockCurrentSettings = (transaction) => {
  return PlatformSetting.findOne({
    order: [["id", "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
};

export const createSettingsVersion = (data, transaction) => {
  return PlatformSetting.create(data, { transaction });
};

// The latest versions, newest first, with who made them
export const findSettingsHistory = (limit) => {
  return PlatformSetting.findAll({
    include: [{ model: User, as: "changer", attributes: ["id", "fullName"], paranoid: false }],
    order: [["id", "DESC"]],
    limit,
  });
};
