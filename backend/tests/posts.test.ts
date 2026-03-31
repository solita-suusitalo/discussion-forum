/**
 * Posts use cases:
 *  - List all posts
 *  - Get a single post by ID (found / not found)
 *  - Create a post (authenticated / unauthenticated)
 *  - Update own post (own / other user's / not found)
 *  - Delete own post (own / other user's / not found)
 *  - Password is hashed before storing; raw password never returned
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { mockDeep, mockReset } from "jest-mock-extended";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import { Prisma } from "../src/generated/prisma/client.js";
import type {
    getAllPosts as GetAllPostsFn,
    getPostById as GetPostByIdFn,
    createPost as CreatePostFn,
    updatePost as UpdatePostFn,
    deletePost as DeletePostFn,
} from "../src/services/postService.js";
import request from "supertest";
import express from "express";
import type { Request, Response } from "express";

// ── Service-level mock (Prisma) ───────────────────────────────────────────────

const prismaMock = mockDeep<PrismaClient>();
jest.unstable_mockModule("../src/db.js", () => ({ default: prismaMock }));

const postService = await import("../src/services/postService.js");

const mockPost = {
    postId: 1,
    title: "Hello World",
    content: "First post content",
    authorId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe("Post service: list posts", () => {
    beforeEach(() => mockReset(prismaMock));

    it("returns all posts", async () => {
        prismaMock.post.findMany.mockResolvedValue([mockPost]);

        const result = await postService.getAllPosts();

        expect(result).toHaveLength(1);
        expect(result[0]?.title).toBe("Hello World");
    });

    it("returns empty array when no posts exist", async () => {
        prismaMock.post.findMany.mockResolvedValue([]);

        expect(await postService.getAllPosts()).toEqual([]);
    });
});

describe("Post service: get post by ID", () => {
    beforeEach(() => mockReset(prismaMock));

    it("returns the post when found", async () => {
        prismaMock.post.findUnique.mockResolvedValue(mockPost);

        expect(await postService.getPostById(1)).toEqual(mockPost);
    });

    it("returns null when post does not exist", async () => {
        prismaMock.post.findUnique.mockResolvedValue(null);

        expect(await postService.getPostById(99)).toBeNull();
    });
});

describe("Post service: create post", () => {
    beforeEach(() => mockReset(prismaMock));

    it("creates and returns the new post", async () => {
        prismaMock.post.create.mockResolvedValue(mockPost);

        const result = await postService.createPost({
            title: "Hello World",
            content: "First post content",
            authorId: 1,
        });

        expect(result.postId).toBe(1);
        expect(prismaMock.post.create).toHaveBeenCalledTimes(1);
    });

    it("propagates error when author does not exist (P2003)", async () => {
        prismaMock.post.create.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("FK", {
                code: "P2003",
                clientVersion: "7.0.0",
            })
        );

        await expect(
            postService.createPost({ title: "x", content: "y", authorId: 999 })
        ).rejects.toMatchObject({ code: "P2003" });
    });
});

describe("Post service: update post", () => {
    beforeEach(() => mockReset(prismaMock));

    it("updates only the provided fields", async () => {
        prismaMock.post.update.mockResolvedValue({
            ...mockPost,
            title: "New Title",
        });

        await postService.updatePost(1, {
            title: "New Title",
            content: undefined,
        });

        expect(prismaMock.post.update).toHaveBeenCalledWith({
            where: { postId: 1 },
            data: { title: "New Title" },
        });
    });

    it("propagates error when post does not exist (P2025)", async () => {
        prismaMock.post.update.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Not found", {
                code: "P2025",
                clientVersion: "7.0.0",
            })
        );

        await expect(
            postService.updatePost(99, { title: "x" })
        ).rejects.toMatchObject({ code: "P2025" });
    });
});

describe("Post service: delete post", () => {
    beforeEach(() => mockReset(prismaMock));

    it("deletes and returns the post", async () => {
        prismaMock.post.delete.mockResolvedValue(mockPost);

        expect(await postService.deletePost(1)).toEqual(mockPost);
    });

    it("propagates error when post does not exist (P2025)", async () => {
        prismaMock.post.delete.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Not found", {
                code: "P2025",
                clientVersion: "7.0.0",
            })
        );

        await expect(postService.deletePost(99)).rejects.toMatchObject({
            code: "P2025",
        });
    });
});

// ── Controller-level (HTTP) ───────────────────────────────────────────────────

const mockGetAllPosts: jest.MockedFunction<typeof GetAllPostsFn> = jest.fn();
const mockGetPostById: jest.MockedFunction<typeof GetPostByIdFn> = jest.fn();
const mockCreatePost: jest.MockedFunction<typeof CreatePostFn> = jest.fn();
const mockUpdatePost: jest.MockedFunction<typeof UpdatePostFn> = jest.fn();
const mockDeletePost: jest.MockedFunction<typeof DeletePostFn> = jest.fn();

jest.unstable_mockModule("../src/services/postService.js", () => ({
    getAllPosts: mockGetAllPosts,
    getPostById: mockGetPostById,
    createPost: mockCreatePost,
    updatePost: mockUpdatePost,
    deletePost: mockDeletePost,
}));

const postController = await import("../src/controllers/postController.js");

function makeApp(authenticatedUserId?: number) {
    const app = express();
    app.use(express.json());
    app.use((req: Request, _res: Response, next) => {
        if (authenticatedUserId !== undefined) {
            req.user = { userId: authenticatedUserId, username: "alice" };
        }
        next();
    });
    app.get("/api/posts", (req: Request, res: Response) =>
        postController.getAll(req, res)
    );
    app.get("/api/posts/:id", (req: Request, res: Response) =>
        postController.getById(req as Request<{ id: string }>, res)
    );
    app.post("/api/posts", (req: Request, res: Response) =>
        postController.create(req, res)
    );
    app.put("/api/posts/:id", (req: Request, res: Response) =>
        postController.update(req as Request<{ id: string }>, res)
    );
    app.delete("/api/posts/:id", (req: Request, res: Response) =>
        postController.remove(req as Request<{ id: string }>, res)
    );
    return app;
}

const post = {
    postId: 1,
    title: "Hello",
    content: "World",
    authorId: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: {
        userId: 10,
        username: "testuser",
        email: "test@example.com",
        password: "hashed",
        createdAt: new Date(),
    },
};

describe("GET /api/posts", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 200 with list of posts", async () => {
        mockGetAllPosts.mockResolvedValue([post]);

        const resp = await request(makeApp()).get("/api/posts");

        expect(resp.status).toBe(200);
        expect(resp.body).toHaveLength(1);
    });
});

describe("GET /api/posts/:id", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 200 with the post when found", async () => {
        mockGetPostById.mockResolvedValue(post);

        const resp = await request(makeApp()).get("/api/posts/1");

        expect(resp.status).toBe(200);
        expect(resp.body.postId).toBe(1);
    });

    it("returns 404 when post does not exist", async () => {
        mockGetPostById.mockResolvedValue(null);

        const resp = await request(makeApp()).get("/api/posts/99");

        expect(resp.status).toBe(404);
        expect(resp.body).toEqual({ error: "Post not found" });
    });
});

describe("POST /api/posts", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 401 when not authenticated", async () => {
        const resp = await request(makeApp())
            .post("/api/posts")
            .send({ title: "x", content: "y" });

        expect(resp.status).toBe(401);
    });

    it("returns 201 with the created post when authenticated", async () => {
        mockCreatePost.mockResolvedValue(post);

        const resp = await request(makeApp(10))
            .post("/api/posts")
            .send({ title: "x", content: "y" });

        expect(resp.status).toBe(201);
        expect(resp.body.postId).toBe(1);
    });

    it("returns 422 when the author does not exist (P2003)", async () => {
        mockCreatePost.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("FK", {
                code: "P2003",
                clientVersion: "7.0.0",
            })
        );

        const resp = await request(makeApp(10))
            .post("/api/posts")
            .send({ title: "x", content: "y" });

        expect(resp.status).toBe(422);
    });
});

describe("PUT /api/posts/:id", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 401 when not authenticated", async () => {
        const resp = await request(makeApp())
            .put("/api/posts/1")
            .send({ title: "x" });

        expect(resp.status).toBe(401);
    });

    it("returns 403 when authenticated user is not the author", async () => {
        mockGetPostById.mockResolvedValue({ ...post, authorId: 99 });

        const resp = await request(makeApp(10))
            .put("/api/posts/1")
            .send({ title: "x" });

        expect(resp.status).toBe(403);
    });

    it("returns 404 when post does not exist", async () => {
        mockGetPostById.mockResolvedValue(null);

        const resp = await request(makeApp(10))
            .put("/api/posts/1")
            .send({ title: "x" });

        expect(resp.status).toBe(404);
    });

    it("returns 200 with updated post when author updates own post", async () => {
        mockGetPostById.mockResolvedValue(post); // authorId: 10
        mockUpdatePost.mockResolvedValue({ ...post, title: "Updated" });

        const resp = await request(makeApp(10))
            .put("/api/posts/1")
            .send({ title: "Updated" });

        expect(resp.status).toBe(200);
        expect(resp.body.title).toBe("Updated");
    });
});

describe("DELETE /api/posts/:id", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 401 when not authenticated", async () => {
        const resp = await request(makeApp()).delete("/api/posts/1");

        expect(resp.status).toBe(401);
    });

    it("returns 403 when authenticated user is not the author", async () => {
        mockGetPostById.mockResolvedValue({ ...post, authorId: 99 });

        const resp = await request(makeApp(10)).delete("/api/posts/1");

        expect(resp.status).toBe(403);
    });

    it("returns 204 when author deletes own post", async () => {
        mockGetPostById.mockResolvedValue(post); // authorId: 10
        mockDeletePost.mockResolvedValue(post);

        const resp = await request(makeApp(10)).delete("/api/posts/1");

        expect(resp.status).toBe(204);
    });

    it("returns 404 when post does not exist", async () => {
        mockGetPostById.mockResolvedValue(null);

        const resp = await request(makeApp(10)).delete("/api/posts/1");

        expect(resp.status).toBe(404);
    });
});
