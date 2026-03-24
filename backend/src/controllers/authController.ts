import type { Request, Response } from "express";
import * as authService from "../services/authService.js";

export async function login(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        if (!result) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        res.json(result);
    } catch {
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function logout(_req: Request, res: Response) {
    try {
        await authService.logout();
        res.status(204).send();
    } catch {
        res.status(500).json({ error: "Internal Server Error" });
    }
}
