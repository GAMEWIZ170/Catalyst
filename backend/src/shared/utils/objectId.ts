import mongoose from "mongoose";
import { z } from "zod";
import { BadRequestError } from "../errors/AppError";

export const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const objectIdSchema = z
  .string()
  .regex(OBJECT_ID_REGEX, "Invalid ID format");

export function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && OBJECT_ID_REGEX.test(id) && mongoose.isObjectIdOrHexString(id);
}

export function assertObjectId(id: unknown, label = "ID"): string {
  if (!isValidObjectId(id)) {
    throw new BadRequestError(`Invalid ${label}`);
  }
  return id;
}
