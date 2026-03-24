import {
    describe,
    it,
    expect,
    jest,
    beforeEach,
    afterEach,
} from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { SignJWT } from "jose";
import { requireAuth } from "../../src/middleware/requireAuth.js";

const TEST_SECRET = "test-secret-that-is-long-enough-for-hs256";

async function makeValidToken(payload: {
    userId: number;
    username: string;
}): Promise<string> {
    return new SignJWT({ username: payload.username })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(String(payload.userId))
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode(TEST_SECRET));
}

function makeReqRes(authHeader?: string): {
    req: Request;
    res: Response;
    next: NextFunction;
    statusCode: () => number | undefined;
    jsonBody: () => unknown;
} {
    let _statusCode: number | undefined;
    let _jsonBody: unknown;

    const req = {
        headers: authHeader ? { authorization: authHeader } : {},
    } as unknown as Request;

    const res = {
        status(code: number) {
            _statusCode = code;
            return res;
        },
        json(data: unknown) {
            _jsonBody = data;
            return res;
        },
    } as unknown as Response;

    const next = jest.fn() as unknown as NextFunction;

    return {
        req,
        res,
        next,
        statusCode: () => _statusCode,
        jsonBody: () => _jsonBody,
    };
}

describe("requireAuth middleware", () => {
    const originalSecret = process.env.JWT_SECRET;

    beforeEach(() => {
        process.env.JWT_SECRET = TEST_SECRET;
    });

    afterEach(() => {
        process.env.JWT_SECRET = originalSecret;
    });

    it("returns 401 when Authorization header is missing", async () => {
        const { req, res, next, statusCode } = makeReqRes();

        await requireAuth(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(statusCode()).toBe(401);
    });

    it("returns 401 when Authorization header has no Bearer prefix", async () => {
        const { req, res, next, statusCode } = makeReqRes("Token abc123");

        await requireAuth(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(statusCode()).toBe(401);
    });

    it("returns 401 for an invalid JWT token", async () => {
        const { req, res, next, statusCode } = makeReqRes(
            "Bearer this.is.invalid"
        );

        await requireAuth(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(statusCode()).toBe(401);
    });

    it("returns 401 for a token signed with a different secret", async () => {
        const token = await makeValidToken({ userId: 1, username: "alice" });
        // Tamper: replace with wrong-secret token
        const { req, res, next, statusCode } = makeReqRes(
            `Bearer ${token}X` // corrupt the signature
        );

        await requireAuth(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(statusCode()).toBe(401);
    });

    it("calls next() and attaches req.user for a valid token", async () => {
        const token = await makeValidToken({ userId: 42, username: "alice" });
        const { req, res, next } = makeReqRes(`Bearer ${token}`);

        await requireAuth(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.user).toEqual({ userId: 42, username: "alice" });
    });

    it("returns 500 when JWT_SECRET env var is not set", async () => {
        delete process.env.JWT_SECRET;
        const { req, res, next, statusCode } = makeReqRes("Bearer sometoken");

        await requireAuth(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(statusCode()).toBe(500);
    });
});
