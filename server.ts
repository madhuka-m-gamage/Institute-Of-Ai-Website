import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

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
    try {
      const { prompt, currentExperience, targetGoals } = req.body;
      const ai = getAI();

      if (!ai) {
        // Fallback intelligent counselor response if key isn't provided
        return res.json({
          advice: `Based on your profile (${currentExperience || 'General Tech Enthusiast'}), we recommend the 3-Month Flagship (AI Master for Real Life). You'll build end-to-end automations with Gemini Advanced, Google Workspace, NotebookLM research synthesis, and Custom Gems with zero coding prerequisites.`,
          recommendedCourseId: 'ai-master',
          keyFocusAreas: [
            'Mastering Multimodal Prompt Architectures (Text, Vision, Audio)',
            'Deploying Custom Gems & Workspace Automations in Real Life',
            'Conducting Deep Synthesis with NotebookLM'
          ]
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `You are the Lead Academic & Enterprise Counselor at the prestigious Institute Of AI.
Evaluate the user's background, learning goals, and query to recommend the most optimal curriculum track.

User Background: ${currentExperience || 'Not specified'}
User Career/Business Goals: ${targetGoals || 'AI-enable daily workflows'}
User Question/Prompt: ${prompt || 'Which course fits my needs best?'}

Available Programs at Institute Of AI:
1. "AI Survival - Hands-on Master Class" (3 Days, 12 Hrs): For busy professionals wanting instant productivity leap (ChatGPT, Claude, Gemini, prompt fundamentals).
2. "AI Bridge - Hands-on Master Class" (8 Weeks, 32 Hrs): For practitioners wanting mid-level systematic AI workflow and automation implementation.
3. "AI Master for Real Life" (3 Months, 72 Hrs Flagship): Complete mastery with no coding required. Deep dive into Gemini Advanced, Custom Gems, NotebookLM, Google Workspace App Script, and 1-on-1 capstone project.
4. "Enterprise AI Solutions" (Bespoke): Custom 4-phase corporate workforce transformation, governance, private infrastructure, and team upskilling.

Return a structured, inspiring, and concise recommendation formatted with clear actionable bullet points.`
      });

      return res.json({
        advice: response.text || 'Unable to generate advice at this moment.',
        recommendedCourseId: prompt && prompt.toLowerCase().includes('enterprise') ? 'enterprise-custom' : 'ai-master'
      });
    } catch (err: any) {
      console.error('Error in /api/ai/counselor:', err);
      return res.status(500).json({ error: err.message || 'Failed to contact AI Counselor' });
    }
  });

  // API Route: Intelligent Application Review & Curriculum Personalization
  app.post("/api/ai/evaluate-application", async (req, res) => {
    try {
      const { applicantName, courseTitle, experience, notes } = req.body;
      const ai = getAI();

      if (!ai) {
        return res.json({
          score: 95,
          evaluation: `Candidate ${applicantName || 'Applicant'} shows strong alignment with ${courseTitle || 'the program'}.`,
          recommendations: [
            'Review foundational generative AI paradigms prior to session 1',
            'Prepare your specific workplace routine for capstone transformation'
          ]
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Evaluate this applicant for "${courseTitle}" at Institute Of AI:
Applicant Name: ${applicantName}
Current Background / Experience: ${experience}
Applicant Goals & Notes: ${notes || 'Looking to achieve high-performance real-world AI execution'}

Provide:
1. An objective, inspiring 2-sentence evaluation of their potential.
2. 3 tailored prep recommendations for their onboarding.`
      });

      return res.json({
        evaluation: response.text || 'Profile approved with distinction.',
        score: 96
      });
    } catch (err: any) {
      console.error('Error in /api/ai/evaluate-application:', err);
      return res.status(500).json({ error: err.message || 'Failed to evaluate application' });
    }
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
