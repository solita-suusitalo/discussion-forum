import prisma from "../db.js";
import type { Post, Prisma } from "../generated/prisma/client.js";

// Lightweight shape used in the posts list
const postSummaryInclude = {
    include: {
        author: { select: { userId: true, username: true } },
        _count: { select: { comments: true } },
    },
} as const;
export type PostSummary = Prisma.PostGetPayload<typeof postSummaryInclude>;

// Full shape used in the single-post detail view
const postDetailInclude = {
    include: {
        author: { select: { userId: true, username: true } },
        _count: { select: { comments: true } },
        comments: {
            include: {
                author: { select: { userId: true, username: true } },
                votes: { select: { userId: true, value: true } },
            },
            orderBy: { createdAt: "asc" as const },
        },
        votes: { select: { userId: true, value: true } },
    },
} as const;
export type PostDetail = Prisma.PostGetPayload<typeof postDetailInclude>;

export async function getAllPosts(): Promise<PostSummary[]> {
    return prisma.post.findMany({
        ...postSummaryInclude,
        orderBy: { lastActivityAt: "desc" },
    });
}

export async function getPostById(id: number): Promise<PostDetail | null> {
    return prisma.post.findUnique({
        where: { postId: id },
        ...postDetailInclude,
    });
}

export async function createPost(
    data: Omit<Post, "postId" | "createdAt" | "updatedAt" | "lastActivityAt">
): Promise<Post> {
    return prisma.post.create({ data });
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
