import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../middleware/validate.js";
import { loginSchema } from "../middleware/schemas/authSchemas.js";
import * as authController from "../controllers/authController.js";

const router = Router();

const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    validate: { xForwardedForHeader: false },
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts, please try again later" },
});

router.post(
    "/login",
    loginRateLimit,
    validate(loginSchema),
    authController.login
);
router.post("/logout", authController.logout);

export default router;
