import { Router } from "express";
import type { Request, Response } from "express";
import * as authService from "../services/authService.js";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    if (!result) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
    }
    res.json(result);
});

router.post("/logout", async (_req: Request, res: Response) => {
    await authService.logout();
    res.status(204).send();
});

export default router;
