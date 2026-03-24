/**
 * Users use cases:
 *  - Register a new user (password is hashed, not returned)
 *  - Duplicate email/username is rejected
 *  - Get all users (no passwords exposed)
 *  - Get user by ID (found / not found)
 *  - Update own profile (email, username, password re-hashed)
 *  - Can only update or delete own account (ownership enforced)
 *  - Delete own account
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { mockDeep, mockReset } from "jest-mock-extended";
import type { PrismaClient, User } from "../src/generated/prisma/client.js";
import { Prisma } from "../src/generated/prisma/client.js";
import type {
    getAllUsers as GetAllUsersFn,
    getUserById as GetUserByIdFn,
    createUser as CreateUserFn,
    updateUser as UpdateUserFn,
    deleteUser as DeleteUserFn,
} from "../src/services/userService.js";
import request from "supertest";
import express from "express";
import type { Request, Response } from "express";

// ── Service-level mock (Prisma) ───────────────────────────────────────────────

const prismaMock = mockDeep<PrismaClient>();
jest.unstable_mockModule("../src/db.js", () => ({ default: prismaMock }));

const userService = await import("../src/services/userService.js");

const mockUser = {
    userId: 1,
    email: "alice@example.com",
    username: "alice",
    createdAt: new Date(),
};

describe("User service: register", () => {
    beforeEach(() => mockReset(prismaMock));

    it("hashes the password before storing — raw password is never passed to the DB", async () => {
        prismaMock.user.create.mockResolvedValue(mockUser as unknown as User);

        await userService.createUser({
            email: "alice@example.com",
            username: "alice",
            password: "plaintext",
        });

        const storedPassword = (
            prismaMock.user.create.mock.calls[0]?.[0] as {
                data: { password: string };
            }
        )?.data?.password;
        expect(storedPassword).not.toBe("plaintext");
        expect(storedPassword).toMatch(/^\$2/); // bcrypt hash
    });

    it("returns user without password field", async () => {
        prismaMock.user.create.mockResolvedValue(mockUser as unknown as User);

        const result = await userService.createUser({
            email: "alice@example.com",
            username: "alice",
            password: "plaintext",
        });

        expect(result).not.toHaveProperty("password");
    });

    it("propagates error on duplicate email or username (P2002)", async () => {
        prismaMock.user.create.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Unique", {
                code: "P2002",
                clientVersion: "7.0.0",
            })
        );

        await expect(
            userService.createUser({
                email: "alice@example.com",
                username: "alice",
                password: "x",
            })
        ).rejects.toMatchObject({ code: "P2002" });
    });
});

describe("User service: get users", () => {
    beforeEach(() => mockReset(prismaMock));

    it("returns a list of users without passwords", async () => {
        prismaMock.user.findMany.mockResolvedValue([
            mockUser,
        ] as unknown as User[]);

        const result = await userService.getAllUsers();

        expect(result).toHaveLength(1);
        result.forEach((u) => expect(u).not.toHaveProperty("password"));
    });

    it("returns null when user is not found by ID", async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        expect(await userService.getUserById(99)).toBeNull();
    });
});

describe("User service: update profile", () => {
    beforeEach(() => mockReset(prismaMock));

    it("only sends the provided fields to the DB", async () => {
        prismaMock.user.update.mockResolvedValue(mockUser as unknown as User);

        await userService.updateUser(1, { username: "newname" });

        const data = (
            prismaMock.user.update.mock.calls[0]?.[0] as {
                data: Record<string, unknown>;
            }
        )?.data;
        expect(data).toHaveProperty("username", "newname");
        expect(data).not.toHaveProperty("email");
        expect(data).not.toHaveProperty("password");
    });

    it("re-hashes password when a new one is provided", async () => {
        prismaMock.user.update.mockResolvedValue(mockUser as unknown as User);

        await userService.updateUser(1, { password: "newpassword" });

        const storedPassword = (
            prismaMock.user.update.mock.calls[0]?.[0] as {
                data: { password: string };
            }
        )?.data?.password;
        expect(storedPassword).toMatch(/^\$2/);
        expect(storedPassword).not.toBe("newpassword");
    });
});

// ── Controller-level (HTTP) ───────────────────────────────────────────────────

const mockGetAllUsers: jest.MockedFunction<typeof GetAllUsersFn> = jest.fn();
const mockGetUserById: jest.MockedFunction<typeof GetUserByIdFn> = jest.fn();
const mockCreateUser: jest.MockedFunction<typeof CreateUserFn> = jest.fn();
const mockUpdateUser: jest.MockedFunction<typeof UpdateUserFn> = jest.fn();
const mockDeleteUser: jest.MockedFunction<typeof DeleteUserFn> = jest.fn();

jest.unstable_mockModule("../src/services/userService.js", () => ({
    getAllUsers: mockGetAllUsers,
    getUserById: mockGetUserById,
    createUser: mockCreateUser,
    updateUser: mockUpdateUser,
    deleteUser: mockDeleteUser,
}));

const userController = await import("../src/controllers/userController.js");

const user = {
    userId: 1,
    email: "alice@example.com",
    username: "alice",
    createdAt: new Date(),
};

function makeApp(authenticatedUserId?: number) {
    const app = express();
    app.use(express.json());
    app.use((req: Request, _res: Response, next) => {
        if (authenticatedUserId !== undefined) {
            req.user = { userId: authenticatedUserId, username: "alice" };
        }
        next();
    });
    app.get("/api/users", (req: Request, res: Response) =>
        userController.getAll(req, res)
    );
    app.get("/api/users/:id", (req: Request, res: Response) =>
        userController.getById(req, res)
    );
    app.post("/api/users", (req: Request, res: Response) =>
        userController.create(req, res)
    );
    app.put("/api/users/:id", (req: Request, res: Response) =>
        userController.update(req, res)
    );
    app.delete("/api/users/:id", (req: Request, res: Response) =>
        userController.remove(req, res)
    );
    return app;
}

describe("GET /api/users", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 200 with list of users (no passwords)", async () => {
        mockGetAllUsers.mockResolvedValue([user]);

        const resp = await request(makeApp()).get("/api/users");

        expect(resp.status).toBe(200);
        expect(resp.body).toHaveLength(1);
        expect(resp.body[0]).not.toHaveProperty("password");
    });
});

describe("GET /api/users/:id", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 200 with user when found", async () => {
        mockGetUserById.mockResolvedValue(user);

        const resp = await request(makeApp()).get("/api/users/1");

        expect(resp.status).toBe(200);
        expect(resp.body.userId).toBe(1);
    });

    it("returns 404 when user does not exist", async () => {
        mockGetUserById.mockResolvedValue(null);

        const resp = await request(makeApp()).get("/api/users/99");

        expect(resp.status).toBe(404);
        expect(resp.body).toEqual({ error: "User not found" });
    });
});

describe("POST /api/users (register)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 201 with created user (no password in response)", async () => {
        mockCreateUser.mockResolvedValue(user);

        const resp = await request(makeApp()).post("/api/users").send({
            email: "alice@example.com",
            username: "alice",
            password: "secret123",
        });

        expect(resp.status).toBe(201);
        expect(resp.body).not.toHaveProperty("password");
    });

    it("returns 409 when email or username is already taken", async () => {
        mockCreateUser.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Unique", {
                code: "P2002",
                clientVersion: "7.0.0",
            })
        );

        const resp = await request(makeApp()).post("/api/users").send({
            email: "alice@example.com",
            username: "alice",
            password: "secret123",
        });

        expect(resp.status).toBe(409);
        expect(resp.body).toEqual({
            error: "Email or username already in use",
        });
    });
});

describe("PUT /api/users/:id (update profile)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 403 when not authenticated", async () => {
        const resp = await request(makeApp())
            .put("/api/users/1")
            .send({ username: "new" });

        expect(resp.status).toBe(403);
    });

    it("returns 403 when updating another user's profile", async () => {
        const resp = await request(makeApp(2))
            .put("/api/users/1")
            .send({ username: "new" });

        expect(resp.status).toBe(403);
    });

    it("returns 200 with updated user when updating own profile", async () => {
        mockUpdateUser.mockResolvedValue({ ...user, username: "newname" });

        const resp = await request(makeApp(1))
            .put("/api/users/1")
            .send({ username: "newname" });

        expect(resp.status).toBe(200);
        expect(resp.body.username).toBe("newname");
    });

    it("returns 409 when updated email or username is already taken", async () => {
        mockUpdateUser.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Unique", {
                code: "P2002",
                clientVersion: "7.0.0",
            })
        );

        const resp = await request(makeApp(1))
            .put("/api/users/1")
            .send({ email: "taken@example.com" });

        expect(resp.status).toBe(409);
    });
});

describe("DELETE /api/users/:id", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 403 when not authenticated", async () => {
        const resp = await request(makeApp()).delete("/api/users/1");

        expect(resp.status).toBe(403);
    });

    it("returns 403 when deleting another user's account", async () => {
        const resp = await request(makeApp(2)).delete("/api/users/1");

        expect(resp.status).toBe(403);
    });

    it("returns 204 when deleting own account", async () => {
        mockDeleteUser.mockResolvedValue(undefined as unknown as User);

        const resp = await request(makeApp(1)).delete("/api/users/1");

        expect(resp.status).toBe(204);
    });

    it("returns 404 when user does not exist", async () => {
        mockDeleteUser.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("Not found", {
                code: "P2025",
                clientVersion: "7.0.0",
            })
        );

        const resp = await request(makeApp(1)).delete("/api/users/1");

        expect(resp.status).toBe(404);
    });
});
