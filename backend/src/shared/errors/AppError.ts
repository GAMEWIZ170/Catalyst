export class AppError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly isOperational = true;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", code?: string) {
    super(400, message, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Please log in to continue", code?: string) {
    super(401, message, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do this", code?: string) {
    super(403, message, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", code?: string) {
    super(404, message, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", code?: string) {
    super(409, message, code);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests. Please try again later", code?: string) {
    super(429, message, code);
  }
}
