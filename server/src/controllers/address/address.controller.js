import {
  addAddress,
  editAddress,
  listMyAddresses,
  removeAddress,
} from "../../services/address/address.service.js";
import { sendSuccess } from "../../utils/response.js";

export const listAddresses = async (req, res) => {
  const addresses = await listMyAddresses(req.user.id);

  return sendSuccess(res, addresses);
};

export const createAddress = async (req, res) => {
  const address = await addAddress(req.user.id, req.validated.body);

  return sendSuccess(res, address, 201);
};

export const updateAddress = async (req, res) => {
  const address = await editAddress(req.params.addressId, req.user.id, req.validated.body);

  return sendSuccess(res, address);
};

export const deleteAddress = async (req, res) => {
  await removeAddress(req.params.addressId, req.user.id);

  return sendSuccess(res, null);
};
