import { z } from "zod";

export const createPostSchema = z.object({
    title: z.string().min(1).max(200),
    content: z.string().min(1),
    authorId: z.number().int().positive(),
});

export const updatePostSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
});
