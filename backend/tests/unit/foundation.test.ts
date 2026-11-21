import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError
} from "../../src/shared/errors/AppError";
import { assertObjectId, isValidObjectId } from "../../src/shared/utils/objectId";
import { validate } from "../../src/shared/middlewares/validate";
import { authorizeRole } from "../../src/shared/middlewares/authorizeRole";
import { imageSchema, safeHttpsLinkSchema } from "../../src/shared/utils/cloudinaryUrl";

describe("Foundation utilities & middlewares", () => {
  describe("AppError hierarchy", () => {
    it("sets status, message, and optional code", () => {
      const err = new ForbiddenError("Your access has ended", "SUBSCRIPTION_REQUIRED");
      expect(err).toBeInstanceOf(AppError);
      expect(err.status).toBe(403);
      expect(err.message).toBe("Your access has ended");
      expect(err.code).toBe("SUBSCRIPTION_REQUIRED");
      expect(err.isOperational).toBe(true);
    });

    it("provides standard HTTP status subclasses", () => {
      expect(new BadRequestError().status).toBe(400);
      expect(new UnauthorizedError().status).toBe(401);
      expect(new NotFoundError().status).toBe(404);
      expect(new ConflictError().status).toBe(409);
    });
  });

  describe("ObjectId helpers", () => {
    it("accepts valid 24-char hex ObjectIds and rejects malformed strings", () => {
      const valid = "507f1f77bcf86cd799439011";
      expect(isValidObjectId(valid)).toBe(true);
      expect(assertObjectId(valid, "course ID")).toBe(valid);

      expect(isValidObjectId("not-an-id")).toBe(false);
      expect(isValidObjectId("12345")).toBe(false);
      expect(() => assertObjectId("bad", "course ID")).toThrowError(BadRequestError);
    });
  });

  describe("validate middleware", () => {
    it("strips unknown fields and forwards valid payloads", () => {
      const mw = validate({
        body: z.object({ title: z.string().trim().min(1) })
      });
      const req = { body: { title: "  CHEM113  ", extra: "drop-me" } } as Request;
      const next = vi.fn() as unknown as NextFunction;

      mw(req, {} as Response, next);

      expect(req.body).toEqual({ title: "CHEM113" });
      expect(next).toHaveBeenCalledWith();
    });

    it("forwards BadRequestError when validation fails", () => {
      const mw = validate({
        body: z.object({ title: z.string().min(3, "Title too short") })
      });
      const req = { body: { title: "a" } } as Request;
      const next = vi.fn() as unknown as NextFunction;

      mw(req, {} as Response, next);

      const err = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(err).toBeInstanceOf(BadRequestError);
      expect(err.message).toBe("Title too short");
    });
  });

  describe("authorizeRole middleware", () => {
    it("allows matching role and blocks others", () => {
      const guard = authorizeRole("admin");

      const nextAdmin = vi.fn() as unknown as NextFunction;
      guard(
        { user: { id: "1", role: "admin", subscriptionEndsAt: null, timeZone: "UTC" } } as Request,
        {} as Response,
        nextAdmin
      );
      expect(nextAdmin).toHaveBeenCalledWith();

      const nextStudent = vi.fn() as unknown as NextFunction;
      guard(
        { user: { id: "2", role: "student", subscriptionEndsAt: null, timeZone: "UTC" } } as Request,
        {} as Response,
        nextStudent
      );
      const err = (nextStudent as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(err).toBeInstanceOf(ForbiddenError);
    });
  });

  describe("Cloudinary & link URL schemas", () => {
    it("accepts a valid Cloudinary image URL matching the configured cloud name", () => {
      const result = imageSchema.safeParse({
        url: "https://res.cloudinary.com/test_cloud/image/upload/v1/catalyst/images/sample.png",
        publicId: "catalyst/images/sample",
        alt: "Periodic table diagram"
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-Cloudinary image URLs and non-https links", () => {
      const badImg = imageSchema.safeParse({
        url: "https://evil.example.com/test_cloud/catalyst/x.png",
        publicId: "catalyst/x",
        alt: "Bad host"
      });
      expect(badImg.success).toBe(false);

      expect(safeHttpsLinkSchema.safeParse("https://example.org/notes").success).toBe(true);
      expect(safeHttpsLinkSchema.safeParse("http://example.org/notes").success).toBe(false);
    });
  });
});
