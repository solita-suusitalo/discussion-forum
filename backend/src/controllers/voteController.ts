import type { Request, Response } from "express";
import * as voteService from "../services/voteService.js";
import { Prisma } from "../generated/prisma/client.js";

export async function voteOnPost(req: Request<{ id: string }>, res: Response) {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const postId = Number(req.params.id);
        const vote = await voteService.upsertPostVote(
            req.user.userId,
            postId,
            req.body.value
        );
        res.json(vote);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2003") {
                res.status(422).json({ error: "Post does not exist" });
                return;
            }
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function removePostVote(
    req: Request<{ id: string }>,
    res: Response
) {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const postId = Number(req.params.id);
        await voteService.deletePostVote(req.user.userId, postId);
        res.status(204).send();
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                res.status(404).json({ error: "Vote not found" });
                return;
            }
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function voteOnComment(
    req: Request<{ postId: string; commentId: string }>,
    res: Response
) {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const commentId = Number(req.params.commentId);
        const vote = await voteService.upsertCommentVote(
            req.user.userId,
            commentId,
            req.body.value
        );
        res.json(vote);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2003") {
                res.status(422).json({ error: "Comment does not exist" });
                return;
            }
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function removeCommentVote(
    req: Request<{ postId: string; commentId: string }>,
    res: Response
) {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const commentId = Number(req.params.commentId);
        await voteService.deleteCommentVote(req.user.userId, commentId);
        res.status(204).send();
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                res.status(404).json({ error: "Vote not found" });
                return;
            }
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
}
