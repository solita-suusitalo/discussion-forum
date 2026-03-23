import type { Request, Response } from "express";
import * as postService from "../services/postService.js";
import { Prisma } from "../generated/prisma/client.js";

export async function getAll(_req: Request, res: Response) {
    try {
        const posts = await postService.getAllPosts();
        res.json(posts);
    } catch {
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getById(req: Request<{ id: string }>, res: Response) {
    try {
        const id = Number(req.params.id);
        const post = await postService.getPostById(id);
        if (!post) {
            res.status(404).json({ error: "Post not found" });
            return;
        }
        res.json(post);
    } catch {
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function create(req: Request, res: Response) {
    try {
        const body = req.body;
        const post = await postService.createPost(body);
        res.status(201).json(post);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2003") {
                res.status(422).json({
                    error: "Referenced author does not exist",
                });
                return;
            }
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function update(req: Request<{ id: string }>, res: Response) {
    try {
        const id = Number(req.params.id);
        const body = req.body;
        const post = await postService.updatePost(id, body);
        if (!post) {
            res.status(404).json({ error: "Post not found" });
            return;
        }
        res.json(post);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                res.status(404).json({ error: "Post not found" });
                return;
            }
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function remove(req: Request<{ id: string }>, res: Response) {
    try {
        const id = Number(req.params.id);
        await postService.deletePost(id);
        res.status(204).send();
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                res.status(404).json({ error: "Post not found" });
                return;
            }
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
}
