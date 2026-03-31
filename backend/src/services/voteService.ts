import prisma from "../db.js";

export async function upsertPostVote(
    userId: number,
    postId: number,
    value: number
) {
    return prisma.postVote.upsert({
        where: { userId_postId: { userId, postId } },
        update: { value },
        create: { userId, postId, value },
    });
}

export async function deletePostVote(userId: number, postId: number) {
    return prisma.postVote.delete({
        where: { userId_postId: { userId, postId } },
    });
}

export async function upsertCommentVote(
    userId: number,
    commentId: number,
    value: number
) {
    return prisma.commentVote.upsert({
        where: { userId_commentId: { userId, commentId } },
        update: { value },
        create: { userId, commentId, value },
    });
}

export async function deleteCommentVote(userId: number, commentId: number) {
    return prisma.commentVote.delete({
        where: { userId_commentId: { userId, commentId } },
    });
}
