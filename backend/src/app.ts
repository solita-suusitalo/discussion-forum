import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import cors from "cors";

import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();

// credentials: true is required so the browser accepts Set-Cookie from the API.
// origin must be an explicit URL (not '*') when credentials are involved.
app.use(cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());

app.get("/api/healthz", (_req: Request, res: Response) => {
    res.status(200).json({ response: "ok", msg: "Server is running" });
});

app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/auth", authRoutes);

export default app;
