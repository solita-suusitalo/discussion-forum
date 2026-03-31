import type { Request, Response } from "express";
import * as commentService from "../services/commentService.js";
import { Prisma } from "../generated/prisma/client.js";

export async function getAll(req: Request<{ postId: string }>, res: Response) {
    try {
        const postId = Number(req.params.postId);
        const comments = await commentService.getCommentsByPostId(postId);
        res.json(comments);
    } catch {
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function create(req: Request<{ postId: string }>, res: Response) {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const postId = Number(req.params.postId);
        const comment = await commentService.createComment({
            content: req.body.content,
            postId,
            authorId: req.user.userId,
        });
        res.status(201).json(comment);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2003") {
                res.status(422).json({
                    error: "Referenced post or user does not exist",
                });
                return;
            }
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function remove(
    req: Request<{ postId: string; commentId: string }>,
    res: Response
) {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const commentId = Number(req.params.commentId);
        const existing = await commentService.getCommentById(commentId);
        if (!existing) {
            res.status(404).json({ error: "Comment not found" });
            return;
        }
        if (existing.authorId !== req.user.userId) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }
        await commentService.deleteComment(commentId);
        res.status(204).send();
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                res.status(404).json({ error: "Comment not found" });
                return;
            }
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
}
