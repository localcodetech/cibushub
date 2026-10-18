import { Router } from "express";
import validate from "../middlewares/validate.js";
import { publicListDishesSchema } from "../validators/restaurant/publicListDishes.validator.js";
import { searchDishes } from "../controllers/restaurant/publicDishes.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Dish search: the same dish from every kitchen that cooks it (no login needed)
// ─────────────────────────────────────────────
router.get("/", validate(publicListDishesSchema, "query"), searchDishes);

export default router;
