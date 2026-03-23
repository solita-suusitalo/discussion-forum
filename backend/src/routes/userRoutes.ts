import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
    createUserSchema,
    updateUserSchema,
} from "../middleware/schemas/userSchemas.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as userController from "../controller/userController.js";

const router = Router();

router.get("/", userController.getAll);
router.get("/:id", userController.getById);
router.post("/", validate(createUserSchema), userController.create);
router.put("/:id", requireAuth, validate(updateUserSchema), userController.update);
router.delete("/:id", requireAuth, userController.remove);

export default router;
