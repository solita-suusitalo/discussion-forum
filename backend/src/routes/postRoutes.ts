import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
    createPostSchema,
    updatePostSchema,
} from "../middleware/schemas/postSchemas.js";
import * as postController from "../controller/postController.js";

const router = Router();

router.get("/", postController.getAll);
router.get("/:id", postController.getById);
router.post("/", validate(createPostSchema), postController.create);
router.put("/:id", validate(updatePostSchema), postController.update);
router.delete("/:id", postController.remove);

export default router;
