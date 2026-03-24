/**
 * Auth use cases:
 *  - Login with valid credentials → issues a JWT
 *  - Login with unknown email → rejected
 *  - Login with wrong password → rejected
 *  - Logout → succeeds (stateless, no-op)
 */

import {
    describe,
    it,
    expect,
    jest,
    beforeEach,
    afterEach,
} from "@jest/globals";
import { mockDeep, mockReset } from "jest-mock-extended";
import type { PrismaClient } from "../src/generated/prisma/client.js";
import type {
    login as LoginFn,
    logout as LogoutFn,
} from "../src/services/authService.js";
import request from "supertest";
import express from "express";
import type { Request, Response } from "express";

// ── Service-level mock (Prisma) ───────────────────────────────────────────────

const prismaMock = mockDeep<PrismaClient>();
jest.unstable_mockModule("../src/db.js", () => ({ default: prismaMock }));

const authService = await import("../src/services/authService.js");

const TEST_SECRET = "test-secret-that-is-long-enough-for-hs256";

const mockUser = {
    userId: 1,
    email: "alice@example.com",
    username: "alice",
    password: "", // filled per test
    createdAt: new Date(),
    posts: [],
};

describe("Auth: login service", () => {
    beforeEach(() => {
        mockReset(prismaMock);
        process.env.JWT_SECRET = TEST_SECRET;
    });
    afterEach(() => {
        delete process.env.JWT_SECRET;
    });

    it("returns a JWT token when credentials are correct", async () => {
        const bcrypt = await import("bcryptjs");
        const hashed = await bcrypt.hash("password123", 10);
        prismaMock.user.findUnique.mockResolvedValue({
            ...mockUser,
            password: hashed,
        });

        const result = await authService.login(
            "alice@example.com",
            "password123"
        );

        expect(result).not.toBeNull();
        expect(result).toHaveProperty("token");
        expect(typeof result!.token).toBe("string");
    });

    it("returns null when email is not registered", async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        const result = await authService.login(
            "nobody@example.com",
            "password123"
        );

        expect(result).toBeNull();
    });

    it("returns null when password is wrong", async () => {
        const bcrypt = await import("bcryptjs");
        const hashed = await bcrypt.hash("correctpassword", 10);
        prismaMock.user.findUnique.mockResolvedValue({
            ...mockUser,
            password: hashed,
        });

        const result = await authService.login(
            "alice@example.com",
            "wrongpassword"
        );

        expect(result).toBeNull();
    });

    it("throws when JWT_SECRET is missing", async () => {
        const bcrypt = await import("bcryptjs");
        const hashed = await bcrypt.hash("password123", 10);
        prismaMock.user.findUnique.mockResolvedValue({
            ...mockUser,
            password: hashed,
        });
        delete process.env.JWT_SECRET;

        await expect(
            authService.login("alice@example.com", "password123")
        ).rejects.toThrow("JWT_SECRET");
    });
});

describe("Auth: logout service", () => {
    it("resolves without error (stateless JWT, no server-side state)", async () => {
        await expect(authService.logout()).resolves.toBeUndefined();
    });
});

// ── Controller-level (HTTP) ───────────────────────────────────────────────────

const mockLogin: jest.MockedFunction<typeof LoginFn> = jest.fn();
const mockLogout: jest.MockedFunction<typeof LogoutFn> = jest.fn();
jest.unstable_mockModule("../src/services/authService.js", () => ({
    login: mockLogin,
    logout: mockLogout,
}));

const authController = await import("../src/controllers/authController.js");

function makeApp() {
    const app = express();
    app.use(express.json());
    app.post("/api/auth/login", (req: Request, res: Response) =>
        authController.login(req, res)
    );
    app.post("/api/auth/logout", (req: Request, res: Response) =>
        authController.logout(req, res)
    );
    return app;
}

describe("POST /api/auth/login", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 200 with token on valid credentials", async () => {
        mockLogin.mockResolvedValue({ token: "jwt-token" });

        const resp = await request(makeApp())
            .post("/api/auth/login")
            .send({ email: "alice@example.com", password: "password123" });

        expect(resp.status).toBe(200);
        expect(resp.body).toEqual({ token: "jwt-token" });
    });

    it("returns 401 on invalid credentials", async () => {
        mockLogin.mockResolvedValue(null);

        const resp = await request(makeApp())
            .post("/api/auth/login")
            .send({ email: "alice@example.com", password: "wrong" });

        expect(resp.status).toBe(401);
        expect(resp.body).toEqual({ error: "Invalid credentials" });
    });
});

describe("POST /api/auth/logout", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("returns 204 No Content", async () => {
        mockLogout.mockResolvedValue(undefined);

        const resp = await request(makeApp()).post("/api/auth/logout");

        expect(resp.status).toBe(204);
    });
});
