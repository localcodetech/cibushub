import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import {
  clearDefaultAddress,
  countAddressesByUser,
  createAddress,
  deleteAddress,
  findAddressesByUser,
  findNewestAddress,
  findOwnedAddress,
  lockAddressOwner,
  updateAddress,
} from "../../repositories/address.repository.js";

const MAX_ADDRESSES = 10;

// Someone else's address looks exactly like one that does not exist
const getMyAddress = async (addressId, userId, transaction) => {
  const address = await findOwnedAddress(addressId, userId, transaction);

  if (!address) {
    throw new AppError(404, "NOT_FOUND", "Address not found");
  }

  return address;
};

export const listMyAddresses = (userId) => {
  return findAddressesByUser(userId);
};

// [AC-CUST-03, AC-CUST-04, AC-CUST-07, AC-CUST-08]
export const addAddress = (userId, data) => {
  return sequelize.transaction(async (transaction) => {
    await lockAddressOwner(userId, transaction);

    const count = await countAddressesByUser(userId, transaction);
    if (count >= MAX_ADDRESSES) {
      throw new AppError(
        409,
        "ADDRESS_LIMIT_REACHED",
        `You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another`,
      );
    }

    // The first address is the default, so checkout always has one to pre-select
    return createAddress({ ...data, userId, isDefault: count === 0 }, transaction);
  });
};

export const editAddress = async (addressId, userId, changes) => {
  const address = await getMyAddress(addressId, userId);

  return updateAddress(address, changes);
};

// Exactly one default address [AC-CUST-07]
export const makeDefaultAddress = (addressId, userId) => {
  return sequelize.transaction(async (transaction) => {
    await lockAddressOwner(userId, transaction);
    const address = await getMyAddress(addressId, userId, transaction);

    await clearDefaultAddress(userId, transaction);
    return updateAddress(address, { isDefault: true }, transaction);
  });
};

// Deleting the default hands the mark to the newest address left [AC-CUST-07]
export const removeAddress = (addressId, userId) => {
  return sequelize.transaction(async (transaction) => {
    await lockAddressOwner(userId, transaction);
    const address = await getMyAddress(addressId, userId, transaction);
    const wasDefault = address.isDefault;

    await deleteAddress(address, transaction);

    if (wasDefault) {
      const newest = await findNewestAddress(userId, transaction);
      if (newest) {
        await updateAddress(newest, { isDefault: true }, transaction);
      }
    }
  });
};
