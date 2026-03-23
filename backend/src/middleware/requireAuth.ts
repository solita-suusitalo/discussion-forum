import type { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";

declare module "express" {
    interface Request {
        user?: { userId: number; username: string };
    }
}

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    const token = header.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        res.status(500).json({ error: "Internal Server Error" });
        return;
    }

    try {
        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(secret)
        );
        req.user = {
            userId: Number(payload.sub),
            username: payload["username"] as string,
        };
        next();
    } catch {
        res.status(401).json({ error: "Unauthorized" });
    }
}
