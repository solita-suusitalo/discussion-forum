/**
 * Votes use cases:
 *  - Upvote / downvote a post (upsert — repeated call changes the vote)
 *  - Remove a post vote (own / non-existent)
 *  - Upvote / downvote a comment
 *  - Remove a comment vote (own / non-existent)
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { mockDeep, mockReset } from "jest-mock-extended";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import { Prisma } from "../src/generated/prisma/client.js";
import type {
    upsertPostVote as UpsertPostVoteFn,
    deletePostVote as DeletePostVoteFn,
    upsertCommentVote as UpsertCommentVoteFn,
    deleteCommentVote as DeleteCommentVoteFn,
} from "../src/services/voteService.js";
import request from "supertest";
import express from "express";
import type { Request, Response } from "express";

// ── Service-level mock (Prisma) ───────────────────────────────────────────────

const prismaMock = mockDeep<PrismaClient>();
jest.unstable_mockModule("../src/db.js", () => ({ default: prismaMock }));

const voteService = await import("../src/services/voteService.js");

const mockPostVote = { userId: 1, postId: 1, value: 1 };
const mockCommentVote = { userId: 1, commentId: 1, value: -1 };

describe("Vote service: upsert post vote", () => {
    beforeEach(() => mockReset(prismaMock));

    it("creates a new vote when none exists", async () => {
        prismaMock.postVote.upsert.mockResolvedValue(mockPostVote);

        const result = await voteService.upsertPostVote(1, 1, 1);

        expect(result).toEqual(mockPostVote);
        expect(prismaMock.postVote.upsert).toHaveBeenCalledTimes(1);
    });

    it("updates the vote when one already exists", async () => {
        const updated = { ...mockPostVote, value: -1 };
        prismaMock.postVote.upsert.mockResolvedValue(updated);

        const result = await voteService.upsertPostVote(1, 1, -1);

        expect(result.value).toBe(-1);
    });

    it("propagates error when post does not exist (P2003)", async () => {
        prismaMock.postVote.upsert.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("FK", {
                code: "P2003",
                clientVersion: "7.0.0",
            })
        );

        await expect(
            voteService.upsertPostVote(1, 999, 1)
        ).rejects.toMatchObject({ code: "P2003" });
    });
});

describe("Vote service: delete post vote", () => {
    beforeEach(() => mockReset(prismaMock));

    it("deletes the vote", async () => {
        prismaMock.postVote.delete.mockResolvedValue(mockPostVote);

        await expect(voteService.deletePostVote(1, 1)).resolves.not.toThrow();
    });

    it("propagates error when vote does not exist (P2025)", async () => {
        prismaMock.postVote.delete.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Not found", {
                code: "P2025",
                clientVersion: "7.0.0",
            })
        );

        await expect(voteService.deletePostVote(1, 999)).rejects.toMatchObject({
            code: "P2025",
        });
    });
});

describe("Vote service: upsert comment vote", () => {
    beforeEach(() => mockReset(prismaMock));

    it("creates a new comment vote", async () => {
        prismaMock.commentVote.upsert.mockResolvedValue(mockCommentVote);

        const result = await voteService.upsertCommentVote(1, 1, -1);

        expect(result).toEqual(mockCommentVote);
    });

    it("propagates error when comment does not exist (P2003)", async () => {
        prismaMock.commentVote.upsert.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("FK", {
                code: "P2003",
                clientVersion: "7.0.0",
            })
        );

        await expect(
            voteService.upsertCommentVote(1, 999, 1)
        ).rejects.toMatchObject({ code: "P2003" });
    });
});

describe("Vote service: delete comment vote", () => {
    beforeEach(() => mockReset(prismaMock));

    it("deletes the comment vote", async () => {
        prismaMock.commentVote.delete.mockResolvedValue(mockCommentVote);

        await expect(
            voteService.deleteCommentVote(1, 1)
        ).resolves.not.toThrow();
    });

    it("propagates error when vote does not exist (P2025)", async () => {
        prismaMock.commentVote.delete.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Not found", {
                code: "P2025",
                clientVersion: "7.0.0",
            })
        );

        await expect(
            voteService.deleteCommentVote(1, 999)
        ).rejects.toMatchObject({ code: "P2025" });
    });
});

// ── Controller-level (HTTP) ───────────────────────────────────────────────────

const mockUpsertPostVote: jest.MockedFunction<typeof UpsertPostVoteFn> =
    jest.fn();
const mockDeletePostVote: jest.MockedFunction<typeof DeletePostVoteFn> =
    jest.fn();
const mockUpsertCommentVote: jest.MockedFunction<typeof UpsertCommentVoteFn> =
    jest.fn();
const mockDeleteCommentVote: jest.MockedFunction<typeof DeleteCommentVoteFn> =
    jest.fn();

jest.unstable_mockModule("../src/services/voteService.js", () => ({
    upsertPostVote: mockUpsertPostVote,
    deletePostVote: mockDeletePostVote,
    upsertCommentVote: mockUpsertCommentVote,
    deleteCommentVote: mockDeleteCommentVote,
}));

const voteController = await import("../src/controllers/voteController.js");

function makeApp(authenticatedUserId?: number) {
    const app = express();
    app.use(express.json());
    app.use((req: Request, _res: Response, next) => {
        if (authenticatedUserId !== undefined) {
            req.user = { userId: authenticatedUserId, username: "alice" };
        }
        next();
    });
    app.put("/api/posts/:id/vote", (req: Request, res: Response) =>
        voteController.voteOnPost(req as Request<{ id: string }>, res)
    );
    app.delete("/api/posts/:id/vote", (req: Request, res: Response) =>
        voteController.removePostVote(req as Request<{ id: string }>, res)
    );
    app.put(
        "/api/posts/:postId/comments/:commentId/vote",
        (req: Request, res: Response) =>
            voteController.voteOnComment(
                req as Request<{ postId: string; commentId: string }>,
                res
            )
    );
    app.delete(
        "/api/posts/:postId/comments/:commentId/vote",
        (req: Request, res: Response) =>
            voteController.removeCommentVote(
                req as Request<{ postId: string; commentId: string }>,
                res
            )
    );
    return app;
}

describe("PUT /api/posts/:id/vote", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 401 when not authenticated", async () => {
        const resp = await request(makeApp())
            .put("/api/posts/1/vote")
            .send({ value: 1 });

        expect(resp.status).toBe(401);
    });

    it("returns 200 with the vote when authenticated", async () => {
        mockUpsertPostVote.mockResolvedValue(mockPostVote);

        const resp = await request(makeApp(1))
            .put("/api/posts/1/vote")
            .send({ value: 1 });

        expect(resp.status).toBe(200);
        expect(resp.body.value).toBe(1);
        expect(mockUpsertPostVote).toHaveBeenCalledWith(1, 1, 1);
    });

    it("returns 422 when the post does not exist (P2003)", async () => {
        mockUpsertPostVote.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("FK", {
                code: "P2003",
                clientVersion: "7.0.0",
            })
        );

        const resp = await request(makeApp(1))
            .put("/api/posts/999/vote")
            .send({ value: 1 });

        expect(resp.status).toBe(422);
    });
});

describe("DELETE /api/posts/:id/vote", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 401 when not authenticated", async () => {
        const resp = await request(makeApp()).delete("/api/posts/1/vote");

        expect(resp.status).toBe(401);
    });

    it("returns 204 when vote is removed", async () => {
        mockDeletePostVote.mockResolvedValue(mockPostVote);

        const resp = await request(makeApp(1)).delete("/api/posts/1/vote");

        expect(resp.status).toBe(204);
    });

    it("returns 404 when no vote exists (P2025)", async () => {
        mockDeletePostVote.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Not found", {
                code: "P2025",
                clientVersion: "7.0.0",
            })
        );

        const resp = await request(makeApp(1)).delete("/api/posts/1/vote");

        expect(resp.status).toBe(404);
    });
});

describe("PUT /api/posts/:postId/comments/:commentId/vote", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 401 when not authenticated", async () => {
        const resp = await request(makeApp())
            .put("/api/posts/1/comments/1/vote")
            .send({ value: -1 });

        expect(resp.status).toBe(401);
    });

    it("returns 200 with the comment vote when authenticated", async () => {
        mockUpsertCommentVote.mockResolvedValue(mockCommentVote);

        const resp = await request(makeApp(1))
            .put("/api/posts/1/comments/1/vote")
            .send({ value: -1 });

        expect(resp.status).toBe(200);
        expect(resp.body.value).toBe(-1);
        expect(mockUpsertCommentVote).toHaveBeenCalledWith(1, 1, -1);
    });
});

describe("DELETE /api/posts/:postId/comments/:commentId/vote", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 401 when not authenticated", async () => {
        const resp = await request(makeApp()).delete(
            "/api/posts/1/comments/1/vote"
        );

        expect(resp.status).toBe(401);
    });

    it("returns 204 when vote is removed", async () => {
        mockDeleteCommentVote.mockResolvedValue(mockCommentVote);

        const resp = await request(makeApp(1)).delete(
            "/api/posts/1/comments/1/vote"
        );

        expect(resp.status).toBe(204);
    });

    it("returns 404 when no vote exists (P2025)", async () => {
        mockDeleteCommentVote.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Not found", {
                code: "P2025",
                clientVersion: "7.0.0",
            })
        );

        const resp = await request(makeApp(1)).delete(
            "/api/posts/1/comments/1/vote"
        );

        expect(resp.status).toBe(404);
    });
});
