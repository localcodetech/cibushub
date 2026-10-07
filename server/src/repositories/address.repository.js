import { Address } from "../models/index.js";

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
export const findOwnedAddress = (id, userId) => {
  return Address.findOne({ where: { id, userId } });
};

export const createAddress = (data) => {
  return Address.create(data);
};

export const updateAddress = (address, changes) => {
  return address.update(changes);
};

export const deleteAddress = (address) => {
  return address.destroy();
};
