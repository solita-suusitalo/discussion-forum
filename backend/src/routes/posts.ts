import { Router } from "express";
import type { Request, Response } from "express";
import * as postService from "../services/postService.js";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
    const posts = await postService.getAllPosts();
    res.json(posts);
});

router.get("/:id", async (req: Request, res: Response) => {
    const post = await postService.getPostById(String(req.params["id"]));
    if (!post) {
        res.status(404).json({ error: "Post not found" });
        return;
    }
    res.json(post);
});

router.post("/", async (req: Request, res: Response) => {
    const post = await postService.createPost(req.body);
    res.status(201).json(post);
});

router.put("/:id", async (req: Request, res: Response) => {
    const post = await postService.updatePost(
        String(req.params["id"]),
        req.body
    );
    if (!post) {
        res.status(404).json({ error: "Post not found" });
        return;
    }
    res.json(post);
});

router.delete("/:id", async (req: Request, res: Response) => {
    await postService.deletePost(String(req.params["id"]));
    res.status(204).send();
});

export default router;
