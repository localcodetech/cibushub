import { Router } from "express";
import validate from "../../middlewares/validate.js";
import {
  createAddressSchema,
  updateAddressSchema,
} from "../../validators/address/address.validator.js";
import {
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from "../../controllers/address/address.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// My saved delivery addresses, default first
// ─────────────────────────────────────────────
router.get("/", listAddresses);

// ─────────────────────────────────────────────
// Save a new address (map pin required)
// ─────────────────────────────────────────────
router.post("/", validate(createAddressSchema), createAddress);

// ─────────────────────────────────────────────
// Edit one of my addresses
// ─────────────────────────────────────────────
router.patch("/:addressId", validate(updateAddressSchema), updateAddress);

// ─────────────────────────────────────────────
// Make this my default address (the others lose the mark)
// ─────────────────────────────────────────────
router.post("/:addressId/default", setDefaultAddress);

// ─────────────────────────────────────────────
// Delete one of my addresses
// ─────────────────────────────────────────────
router.delete("/:addressId", deleteAddress);

export default router;
