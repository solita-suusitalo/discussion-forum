import { Router } from "express";
import type { Request, Response } from "express";
import * as userService from "../services/userService.js";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
    const users = await userService.getAllUsers();
    res.json(users);
});

router.get("/:id", async (req: Request, res: Response) => {
    const user = await userService.getUserById(String(req.params["id"]));
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    res.json(user);
});

router.post("/", async (req: Request, res: Response) => {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
});

router.put("/:id", async (req: Request, res: Response) => {
    const user = await userService.updateUser(
        String(req.params["id"]),
        req.body
    );
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    res.json(user);
});

router.delete("/:id", async (req: Request, res: Response) => {
    await userService.deleteUser(String(req.params["id"]));
    res.status(204).send();
});

export default router;
