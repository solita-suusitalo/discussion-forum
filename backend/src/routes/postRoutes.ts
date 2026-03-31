import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
    createPostSchema,
    updatePostSchema,
} from "../middleware/schemas/postSchemas.js";
import { voteSchema } from "../middleware/schemas/voteSchemas.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as postController from "../controllers/postController.js";
import * as voteController from "../controllers/voteController.js";
import commentRoutes from "./commentRoutes.js";

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

// Post vote routes
router.put(
    "/:id/vote",
    requireAuth,
    validate(voteSchema),
    voteController.voteOnPost
);
router.delete("/:id/vote", requireAuth, voteController.removePostVote);

// Nest comment routes under /:postId/comments
router.use("/:postId/comments", commentRoutes);

export default router;
