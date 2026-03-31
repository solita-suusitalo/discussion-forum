import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { createCommentSchema } from "../middleware/schemas/commentSchemas.js";
import { voteSchema } from "../middleware/schemas/voteSchemas.js";
import { requireAuth } from "../middleware/requireAuth.js";
import * as commentController from "../controllers/commentController.js";
import * as voteController from "../controllers/voteController.js";

// Mounted at /api/posts/:postId/comments — mergeParams required to access :postId
const router = Router({ mergeParams: true });

router.get("/", commentController.getAll);
router.post(
    "/",
    requireAuth,
    validate(createCommentSchema),
    commentController.create
);
router.delete("/:commentId", requireAuth, commentController.remove);

// Comment vote routes
router.put(
    "/:commentId/vote",
    requireAuth,
    validate(voteSchema),
    voteController.voteOnComment
);
router.delete(
    "/:commentId/vote",
    requireAuth,
    voteController.removeCommentVote
);

export default router;
