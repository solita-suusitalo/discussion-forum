/**
 * Comments use cases:
 *  - List comments for a post
 *  - Create a comment (authenticated / unauthenticated)
 *  - Delete own comment (own / other user's / not found)
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { mockDeep, mockReset } from "jest-mock-extended";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import { Prisma } from "../src/generated/prisma/client.js";
import type {
    getCommentsByPostId as GetCommentsByPostIdFn,
    createComment as CreateCommentFn,
    deleteComment as DeleteCommentFn,
    getCommentById as GetCommentByIdFn,
} from "../src/services/commentService.js";
import request from "supertest";
import express from "express";
import type { Request, Response } from "express";

// ── Service-level mock (Prisma) ───────────────────────────────────────────────

const prismaMock = mockDeep<PrismaClient>();
jest.unstable_mockModule("../src/db.js", () => ({ default: prismaMock }));

// $transaction executes the callback synchronously with the same mock client
prismaMock.$transaction.mockImplementation(
    async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock)
);

const commentService = await import("../src/services/commentService.js");

const mockComment = {
    commentId: 1,
    content: "Great post!",
    postId: 1,
    authorId: 2,
    createdAt: new Date(),
};

describe("Comment service: list comments", () => {
    beforeEach(() => mockReset(prismaMock));

    it("returns comments for a post", async () => {
        prismaMock.comment.findMany.mockResolvedValue([mockComment]);

        const result = await commentService.getCommentsByPostId(1);

        expect(result).toHaveLength(1);
        expect(result[0]?.content).toBe("Great post!");
        expect(prismaMock.comment.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { postId: 1 } })
        );
    });

    it("returns empty array when post has no comments", async () => {
        prismaMock.comment.findMany.mockResolvedValue([]);

        expect(await commentService.getCommentsByPostId(99)).toEqual([]);
    });
});

describe("Comment service: get comment by ID", () => {
    beforeEach(() => mockReset(prismaMock));

    it("returns the comment when found", async () => {
        prismaMock.comment.findUnique.mockResolvedValue(mockComment);

        expect(await commentService.getCommentById(1)).toEqual(mockComment);
    });

    it("returns null when comment does not exist", async () => {
        prismaMock.comment.findUnique.mockResolvedValue(null);

        expect(await commentService.getCommentById(99)).toBeNull();
    });
});

describe("Comment service: create comment", () => {
    beforeEach(() => {
        mockReset(prismaMock);
        prismaMock.$transaction.mockImplementation(
            async (fn: (tx: typeof prismaMock) => Promise<unknown>) =>
                fn(prismaMock)
        );
    });

    it("creates a comment and bumps post lastActivityAt", async () => {
        prismaMock.comment.create.mockResolvedValue(mockComment);
        prismaMock.post.update.mockResolvedValue({} as never);

        const result = await commentService.createComment({
            content: "Great post!",
            postId: 1,
            authorId: 2,
        });

        expect(result).toEqual(mockComment);
        expect(prismaMock.comment.create).toHaveBeenCalledTimes(1);
        expect(prismaMock.post.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { postId: 1 },
                data: expect.objectContaining({
                    lastActivityAt: expect.any(Date),
                }),
            })
        );
    });

    it("propagates error when post does not exist (P2003)", async () => {
        prismaMock.comment.create.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("FK", {
                code: "P2003",
                clientVersion: "7.0.0",
            })
        );

        await expect(
            commentService.createComment({
                content: "x",
                postId: 999,
                authorId: 1,
            })
        ).rejects.toMatchObject({ code: "P2003" });
    });
});

describe("Comment service: delete comment", () => {
    beforeEach(() => mockReset(prismaMock));

    it("deletes and returns the comment", async () => {
        prismaMock.comment.delete.mockResolvedValue(mockComment);

        expect(await commentService.deleteComment(1)).toEqual(mockComment);
    });

    it("propagates error when comment does not exist (P2025)", async () => {
        prismaMock.comment.delete.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Not found", {
                code: "P2025",
                clientVersion: "7.0.0",
            })
        );

        await expect(commentService.deleteComment(99)).rejects.toMatchObject({
            code: "P2025",
        });
    });
});

// ── Controller-level (HTTP) ───────────────────────────────────────────────────

const mockGetCommentsByPostId: jest.MockedFunction<
    typeof GetCommentsByPostIdFn
> = jest.fn();
const mockCreateComment: jest.MockedFunction<typeof CreateCommentFn> =
    jest.fn();
const mockDeleteComment: jest.MockedFunction<typeof DeleteCommentFn> =
    jest.fn();
const mockGetCommentById: jest.MockedFunction<typeof GetCommentByIdFn> =
    jest.fn();

jest.unstable_mockModule("../src/services/commentService.js", () => ({
    getCommentsByPostId: mockGetCommentsByPostId,
    createComment: mockCreateComment,
    deleteComment: mockDeleteComment,
    getCommentById: mockGetCommentById,
}));

const commentController =
    await import("../src/controllers/commentController.js");

function makeApp(authenticatedUserId?: number) {
    const app = express();
    app.use(express.json());
    app.use((req: Request, _res: Response, next) => {
        if (authenticatedUserId !== undefined) {
            req.user = { userId: authenticatedUserId, username: "alice" };
        }
        next();
    });
    app.get("/api/posts/:postId/comments", (req: Request, res: Response) =>
        commentController.getAll(req as Request<{ postId: string }>, res)
    );
    app.post("/api/posts/:postId/comments", (req: Request, res: Response) =>
        commentController.create(req as Request<{ postId: string }>, res)
    );
    app.delete(
        "/api/posts/:postId/comments/:commentId",
        (req: Request, res: Response) =>
            commentController.remove(
                req as Request<{ postId: string; commentId: string }>,
                res
            )
    );
    return app;
}

const comment = {
    commentId: 1,
    content: "Great post!",
    postId: 1,
    authorId: 10,
    createdAt: new Date(),
    author: { userId: 10, username: "alice" },
    votes: [],
};

describe("GET /api/posts/:postId/comments", () => {
    beforeEach(() => jest.clearAllMocks());

    it("returns 200 with list of comments", async () => {
        mockGetCommentsByPostId.mockResolvedValue([comment]);

        const resp = await request(makeApp()).get("/api/posts/1/comments");

        expect(resp.status).toBe(200);
        expect(resp.body).toHaveLength(1);
        expect(resp.body[0].content).toBe("Great post!");
    });

    it("returns 200 with empty array when no comments", async () => {
        mockGetCommentsByPostId.mockResolvedValue([]);

        const resp = await request(makeApp()).get("/api/posts/1/comments");

        expect(resp.status).toBe(200);
        expect(resp.body).toEqual([]);
    });
});

describe("POST /api/posts/:postId/comments", () => {
    beforeEach(() => jest.clearAllMocks());

    it("returns 401 when not authenticated", async () => {
        const resp = await request(makeApp())
            .post("/api/posts/1/comments")
            .send({ content: "hello" });

        expect(resp.status).toBe(401);
    });

    it("returns 201 with created comment when authenticated", async () => {
        mockCreateComment.mockResolvedValue(comment);

        const resp = await request(makeApp(10))
            .post("/api/posts/1/comments")
            .send({ content: "hello" });

        expect(resp.status).toBe(201);
        expect(resp.body.commentId).toBe(1);
        expect(mockCreateComment).toHaveBeenCalledWith({
            content: "hello",
            postId: 1,
            authorId: 10,
        });
    });

    it("returns 422 when the post does not exist (P2003)", async () => {
        mockCreateComment.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("FK", {
                code: "P2003",
                clientVersion: "7.0.0",
            })
        );

        const resp = await request(makeApp(10))
            .post("/api/posts/1/comments")
            .send({ content: "hello" });

        expect(resp.status).toBe(422);
    });
});

describe("DELETE /api/posts/:postId/comments/:commentId", () => {
    beforeEach(() => jest.clearAllMocks());

    it("returns 401 when not authenticated", async () => {
        const resp = await request(makeApp()).delete("/api/posts/1/comments/1");

        expect(resp.status).toBe(401);
    });

    it("returns 404 when comment does not exist", async () => {
        mockGetCommentById.mockResolvedValue(null);

        const resp = await request(makeApp(10)).delete(
            "/api/posts/1/comments/99"
        );

        expect(resp.status).toBe(404);
    });

    it("returns 403 when deleting someone else's comment", async () => {
        mockGetCommentById.mockResolvedValue({
            ...comment,
            authorId: 99,
        });

        const resp = await request(makeApp(10)).delete(
            "/api/posts/1/comments/1"
        );

        expect(resp.status).toBe(403);
    });

    it("returns 204 when comment owner deletes their comment", async () => {
        mockGetCommentById.mockResolvedValue(comment); // authorId: 10
        mockDeleteComment.mockResolvedValue(comment);

        const resp = await request(makeApp(10)).delete(
            "/api/posts/1/comments/1"
        );

        expect(resp.status).toBe(204);
    });
});
