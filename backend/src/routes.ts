import { Router, type Request, type Response } from "express";
import { isDBReady } from "./config/db";

const router = Router();

// Liveness probe: answers immediately if the Node process is alive.
router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    uptime: Math.floor(process.uptime())
  });
});

// Readiness probe: verifies the database connection before load balancers send traffic.
router.get("/ready", (_req: Request, res: Response) => {
  if (!isDBReady()) {
    res.status(503).json({ status: "not_ready", db: "disconnected" });
    return;
  }
  res.status(200).json({ status: "ready", db: "connected" });
});

// API v1 modules will be mounted here across Milestones 2-6.
const apiV1 = Router();
router.use("/api/v1", apiV1);

export { router as rootRouter, apiV1 };
