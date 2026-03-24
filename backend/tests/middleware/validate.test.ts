import { describe, it, expect, jest } from "@jest/globals";
import type { Request, Response, NextFunction } from "express";
import { validate } from "../../src/middleware/validate.js";
import { z } from "zod";

function makeReqRes(body: unknown): {
    req: Request;
    res: Response;
    next: NextFunction;
    statusCode: () => number | undefined;
    jsonBody: () => unknown;
} {
    let _statusCode: number | undefined;
    let _jsonBody: unknown;

    const req = { body } as Request;
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

const schema = z.object({
    email: z.email(),
    age: z.number().min(1),
});

describe("validate middleware", () => {
    it("calls next() and assigns parsed body when valid", () => {
        const { req, res, next } = makeReqRes({
            email: "user@example.com",
            age: 25,
        });

        validate(schema)(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.body).toEqual({ email: "user@example.com", age: 25 });
    });

    it("returns 400 with field errors when required field is missing", () => {
        const { req, res, next, statusCode, jsonBody } = makeReqRes({
            email: "user@example.com",
            // age missing
        });

        validate(schema)(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(statusCode()).toBe(400);
        const body = jsonBody() as {
            errors: { fieldErrors: Record<string, string[]> };
        };
        expect(body.errors.fieldErrors).toHaveProperty("age");
    });

    it("returns 400 with field errors for invalid email", () => {
        const { req, res, next, statusCode, jsonBody } = makeReqRes({
            email: "not-an-email",
            age: 25,
        });

        validate(schema)(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(statusCode()).toBe(400);
        const body = jsonBody() as {
            errors: { fieldErrors: Record<string, string[]> };
        };
        expect(body.errors.fieldErrors).toHaveProperty("email");
    });

    it("strips extra fields not in the schema", () => {
        const { req, res, next } = makeReqRes({
            email: "user@example.com",
            age: 25,
            extra: "should be stripped",
        });

        validate(schema)(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.body).not.toHaveProperty("extra");
    });
});
