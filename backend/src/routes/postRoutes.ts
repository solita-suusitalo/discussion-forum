import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
    createPostSchema,
    updatePostSchema,
} from "../middleware/schemas/postSchemas.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as postController from "../controllers/postController.js";

const router = Router();

router.get("/", postController.getAll);
router.get("/:id", postController.getById);
router.post(
    "/",
    requireAuth,
    validate(createPostSchema),
    postController.create
);
router.put(
    "/:id",
    requireAuth,
    validate(updatePostSchema),
    postController.update
);
router.delete("/:id", requireAuth, postController.remove);

export default router;
