import { RiderDocument, RiderProfile } from "../models/index.js";

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
