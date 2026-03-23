import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { loginSchema } from "../middleware/schemas/authSchemas.js";
import * as authController from "../controller/authController.js";

const router = Router();

router.post("/login", validate(loginSchema), authController.login);
router.post("/logout", authController.logout);

export default router;
