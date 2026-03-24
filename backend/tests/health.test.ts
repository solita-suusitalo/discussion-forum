import request from "supertest";
import app from "../src/app.js";
import { describe, it, expect } from "@jest/globals";

describe("GET /healthz", () => {
    it("returns 200 and JSON msg", async () => {
        const resp = await request(app).get("/api/healthz");
        expect(resp.status).toBe(200);
        expect(resp.body.msg).toBe("Server is running");
    });
});
