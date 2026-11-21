export type UserRole = "student" | "admin";

export interface AuthUser {
  id: string;
  role: UserRole;
  subscriptionEndsAt: Date | null;
  timeZone: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
