import { Address, User } from "../models/index.js";

// The customer's addresses: the default one first, then the newest
export const findAddressesByUser = (userId) => {
  return Address.findAll({
    where: { userId },
    order: [
      ["isDefault", "DESC"],
      ["createdAt", "DESC"],
    ],
  });
};

// Only finds the address if it belongs to this user
export const findOwnedAddress = (id, userId, transaction) => {
  return Address.findOne({ where: { id, userId }, transaction });
};

export const countAddressesByUser = (userId, transaction) => {
  return Address.count({ where: { userId }, transaction });
};

// The newest address left, to become the default after the default one is deleted
export const findNewestAddress = (userId, transaction) => {
  return Address.findOne({ where: { userId }, order: [["createdAt", "DESC"]], transaction });
};

// Locks the customer's row until the transaction ends, so two address changes
// for the same customer run one after the other (no 11th address, no two defaults)
export const lockAddressOwner = (userId, transaction) => {
  return User.findByPk(userId, { attributes: ["id"], lock: transaction.LOCK.UPDATE, transaction });
};

// Takes the default mark off every address of this customer
export const clearDefaultAddress = (userId, transaction) => {
  return Address.update({ isDefault: false }, { where: { userId, isDefault: true }, transaction });
};

export const createAddress = (data, transaction) => {
  return Address.create(data, { transaction });
};

export const updateAddress = (address, changes, transaction) => {
  return address.update(changes, { transaction });
};

export const deleteAddress = (address, transaction) => {
  return address.destroy({ transaction });
};
