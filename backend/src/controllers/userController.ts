import type { Request, Response } from "express";
import * as userService from "../services/userService.js";
import { Prisma } from "../generated/prisma/client.js";

export async function getAll(_req: Request, res: Response) {
    try {
        const users = await userService.getAllUsers();
        res.status(200).json(users);
    } catch {
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getById(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        const user = await userService.getUserById(id);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.status(200).json(user);
    } catch {
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function create(req: Request, res: Response) {
    try {
        const user = await userService.createUser(req.body);
        res.status(201).json(user);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            res.status(409).json({ error: "Email or username already in use" });
            return;
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function update(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (!req.user || req.user.userId !== id) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }
        const user = await userService.updateUser(id, req.body);
        res.status(200).json(user);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                res.status(404).json({ error: "User not found" });
                return;
            }
            if (error.code === "P2002") {
                res.status(409).json({
                    error: "Email or username is already taken",
                });
                return;
            }
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function remove(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (!req.user || req.user.userId !== id) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }
        await userService.deleteUser(id);
        res.status(204).send();
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
        ) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
}
