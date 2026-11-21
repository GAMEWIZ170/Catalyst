import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import * as dbConfig from "../../src/config/db";
import { createApp } from "../../src/app";

describe("Health, readiness, request IDs, and error handling", () => {
  const app = createApp();

  it("GET /health returns 200 with ok status and x-request-id header", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.uptime).toBe("number");
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  it("propagates an incoming x-request-id header", async () => {
    const res = await request(app).get("/health").set("x-request-id", "req-trace-123");

    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toBe("req-trace-123");
  });

  it("GET /ready returns 503 when DB is disconnected and 200 when connected", async () => {
    vi.spyOn(dbConfig, "isDBReady").mockReturnValueOnce(false);
    const notReady = await request(app).get("/ready");
    expect(notReady.status).toBe(503);
    expect(notReady.body).toEqual({ status: "not_ready", db: "disconnected" });

    vi.spyOn(dbConfig, "isDBReady").mockReturnValueOnce(true);
    const ready = await request(app).get("/ready");
    expect(ready.status).toBe(200);
    expect(ready.body).toEqual({ status: "ready", db: "connected" });
  });

  it("returns 404 JSON for unknown routes", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  it("returns 400 JSON for malformed JSON payloads", async () => {
    const res = await request(app)
      .post("/api/v1/anything")
      .set("Content-Type", "application/json")
      .send("{ broken json");

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/malformed json/i);
  });
});
