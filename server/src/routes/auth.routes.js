import { Router } from "express";
import validate from "../middlewares/validate.js";
import { registerSchema } from "../validators/auth.validator.js";
import { register } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", validate(registerSchema), register);

export default router;
