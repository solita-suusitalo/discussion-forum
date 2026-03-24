import { z } from "zod";

export const createUserSchema = z.object({
    email: z.email(),
    username: z.string().min(3).max(30),
    password: z.string().min(6),
});

export const updateUserSchema = z.object({
    email: z.email().optional(),
    username: z.string().min(3).max(30).optional(),
    password: z.string().min(6).optional(),
});
