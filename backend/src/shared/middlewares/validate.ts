import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodTypeAny } from "zod";
import { BadRequestError } from "../errors/AppError";

export interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.params) {
      const parsed = schemas.params.safeParse(req.params);
      if (!parsed.success) {
        next(new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid URL parameters"));
        return;
      }
      req.params = parsed.data;
    }

    if (schemas.query) {
      const parsed = schemas.query.safeParse(req.query);
      if (!parsed.success) {
        next(new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid query parameters"));
        return;
      }
    }

    if (schemas.body) {
      const parsed = schemas.body.safeParse(req.body);
      if (!parsed.success) {
        next(new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid request body"));
        return;
      }
      req.body = parsed.data;
    }

    next();
  };
}
