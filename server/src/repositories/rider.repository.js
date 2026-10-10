import { Op } from "sequelize";
import { RiderDocument, RiderProfile, User } from "../models/index.js";

// What admins see of the rider's account next to the application
const WITH_ACCOUNT = {
  model: User,
  as: "user",
  attributes: ["id", "fullName", "email", "phone", "avatarUrl", "status"],
};

export const findRiderProfileByUserId = (userId, transaction) => {
  return RiderProfile.findOne({ where: { userId }, transaction });
};

export const createRiderProfile = (data) => {
  return RiderProfile.create(data);
};

export const updateRiderProfile = (profile, changes, transaction) => {
  return profile.update(changes, { transaction });
};

export const findRiderDocumentByType = (riderProfileId, documentType) => {
  return RiderDocument.findOne({ where: { riderProfileId, documentType } });
};

export const findRiderDocuments = (riderProfileId) => {
  return RiderDocument.findAll({
    where: { riderProfileId },
    order: [["documentType", "ASC"]],
  });
};

export const createRiderDocument = (data) => {
  return RiderDocument.create(data);
};

export const updateRiderDocument = (document, changes) => {
  return document.update(changes);
};

// Is this Ghana Card already on another rider's application?
export const findRiderProfileByGhanaCard = (ghanaCardNumber) => {
  return RiderProfile.findOne({ where: { ghanaCardNumber } });
};

// One application with the rider's account, for admins (lock it when changing it)
export const findRiderProfileForAdmin = (id, transaction) => {
  return RiderProfile.findByPk(id, {
    include: [WITH_ACCOUNT],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
};

// The review queue: submitted applications, oldest first. Drafts only when asked for.
export const findRiderProfilesForAdmin = ({ status, limit, offset }) => {
  return RiderProfile.findAndCountAll({
    where: status ? { status } : { status: { [Op.ne]: "DRAFT" } },
    include: [WITH_ACCOUNT],
    order: [
      ["submittedAt", "ASC"],
      ["createdAt", "ASC"],
    ],
    limit,
    offset,
  });
};

// Every rider who is online right now (for the stale-rider sweep)
export const findOnlineRiderProfiles = () => {
  return RiderProfile.findAll({ where: { isOnline: true } });
};

// Approved, online riders among these ids (with their account, for messages)
export const findAvailableRiderProfiles = (ids, transaction) => {
  return RiderProfile.findAll({
    where: { id: { [Op.in]: ids }, status: "APPROVED", isOnline: true },
    transaction,
  });
};
