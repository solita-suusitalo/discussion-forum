import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import cors from "cors";

import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import authRoutes from "./routes/auth.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/healthz", (_req: Request, res: Response) => {
    res.status(200).json({ response: "ok", msg: "Server is running" });
});

app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/auth", authRoutes);

export default app;
