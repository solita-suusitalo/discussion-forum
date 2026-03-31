import prisma from "../db.js";

export async function getCommentsByPostId(postId: number) {
    return prisma.comment.findMany({
        where: { postId },
        include: {
            author: { select: { userId: true, username: true } },
            votes: { select: { userId: true, value: true } },
        },
        orderBy: { createdAt: "asc" },
    });
}

export async function getCommentById(commentId: number) {
    return prisma.comment.findUnique({ where: { commentId } });
}

export async function createComment(data: {
    content: string;
    postId: number;
    authorId: number;
}) {
    return prisma.$transaction(async (tx) => {
        const comment = await tx.comment.create({
            data,
            include: {
                author: { select: { userId: true, username: true } },
                votes: { select: { userId: true, value: true } },
            },
        });
        await tx.post.update({
            where: { postId: data.postId },
            data: { lastActivityAt: new Date() },
        });
        return comment;
    });
}

export async function deleteComment(commentId: number) {
    return prisma.comment.delete({ where: { commentId } });
}
