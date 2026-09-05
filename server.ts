import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { handleCounselorRequest, handleEvaluateApplicationRequest } from "./api/_lib/aiHandlers";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "Institute Of AI API", timestamp: new Date().toISOString() });
  });

  // API Route: Gemini Course Matching & Career Counseling
  app.post("/api/ai/counselor", async (req, res) => {
    const { status, body } = await handleCounselorRequest(req.body);
    res.status(status).json(body);
  });

  // API Route: Intelligent Application Review & Curriculum Personalization
  app.post("/api/ai/evaluate-application", async (req, res) => {
    const { status, body } = await handleEvaluateApplicationRequest(req.body);
    res.status(status).json(body);
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Institute Of AI server running on http://localhost:${PORT}`);
  });
}

startServer();
