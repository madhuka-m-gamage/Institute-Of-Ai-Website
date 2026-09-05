import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

export interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}

export async function handleCounselorRequest(body: any): Promise<HandlerResult> {
  try {
    const { prompt, currentExperience, targetGoals } = body || {};
    const ai = getAI();

    if (!ai) {
      // Fallback intelligent counselor response if key isn't provided
      return {
        status: 200,
        body: {
          advice: `Based on your profile (${currentExperience || 'General Tech Enthusiast'}), we recommend the 3-Month Flagship (AI Master for Real Life). You'll build end-to-end automations with Gemini Advanced, Google Workspace, NotebookLM research synthesis, and Custom Gems with zero coding prerequisites.`,
          recommendedCourseId: 'ai-master',
          keyFocusAreas: [
            'Mastering Multimodal Prompt Architectures (Text, Vision, Audio)',
            'Deploying Custom Gems & Workspace Automations in Real Life',
            'Conducting Deep Synthesis with NotebookLM'
          ]
        },
      };
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

    return {
      status: 200,
      body: {
        advice: response.text || 'Unable to generate advice at this moment.',
        recommendedCourseId: prompt && prompt.toLowerCase().includes('enterprise') ? 'enterprise-custom' : 'ai-master'
      },
    };
  } catch (err: any) {
    console.error('Error in /api/ai/counselor:', err);
    return { status: 500, body: { error: err.message || 'Failed to contact AI Counselor' } };
  }
}

export async function handleEvaluateApplicationRequest(body: any): Promise<HandlerResult> {
  try {
    const { applicantName, courseTitle, experience, notes } = body || {};
    const ai = getAI();

    if (!ai) {
      return {
        status: 200,
        body: {
          score: 95,
          evaluation: `Candidate ${applicantName || 'Applicant'} shows strong alignment with ${courseTitle || 'the program'}.`,
          recommendations: [
            'Review foundational generative AI paradigms prior to session 1',
            'Prepare your specific workplace routine for capstone transformation'
          ]
        },
      };
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

    return {
      status: 200,
      body: {
        evaluation: response.text || 'Profile approved with distinction.',
        score: 96
      },
    };
  } catch (err: any) {
    console.error('Error in /api/ai/evaluate-application:', err);
    return { status: 500, body: { error: err.message || 'Failed to evaluate application' } };
  }
}
