import prisma from "../db.js";
import type { Post, Prisma } from "../generated/prisma/client.js";

const postWithAuthor = {
    include: {
        author: {
            select: { userId: true, username: true },
        },
    },
} as const;
export type PostWithAuthor = Prisma.PostGetPayload<typeof postWithAuthor>;

export async function getAllPosts(): Promise<PostWithAuthor[]> {
    return prisma.post.findMany(postWithAuthor);
}

export async function getPostById(id: number): Promise<PostWithAuthor | null> {
    return prisma.post.findUnique({
        where: { postId: id },
        ...postWithAuthor,
    });
}

export async function createPost(
    data: Omit<Post, "postId" | "createdAt" | "updatedAt">
): Promise<Post> {
    return prisma.post.create({
        data,
    });
}

export async function updatePost(
    id: number,
    data: { title?: string | undefined; content?: string | undefined }
): Promise<Post> {
    const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
    ) as Partial<Pick<Post, "title" | "content">>;
    return prisma.post.update({
        where: { postId: id },
        data: cleanData,
    });
}

export async function deletePost(id: number): Promise<Post> {
    return prisma.post.delete({
        where: { postId: id },
    });
}
