import AppError from "../../utils/AppError.js";
import {
  createAddress,
  deleteAddress,
  findAddressesByUser,
  findOwnedAddress,
  updateAddress,
} from "../../repositories/address.repository.js";

// Someone else's address looks exactly like one that does not exist
const getMyAddress = async (addressId, userId) => {
  const address = await findOwnedAddress(addressId, userId);

  if (!address) {
    throw new AppError(404, "NOT_FOUND", "Address not found");
  }

  return address;
};

export const listMyAddresses = (userId) => {
  return findAddressesByUser(userId);
};

// [AC-CUST-03, AC-CUST-04]
export const addAddress = (userId, data) => {
  return createAddress({ ...data, userId });
};

export const editAddress = async (addressId, userId, changes) => {
  const address = await getMyAddress(addressId, userId);

  return updateAddress(address, changes);
};

export const removeAddress = async (addressId, userId) => {
  const address = await getMyAddress(addressId, userId);

  await deleteAddress(address);
};
