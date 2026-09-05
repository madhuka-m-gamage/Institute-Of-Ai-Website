import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface ApplicationInput {
  applicantName?: string;
  fullName?: string;
  name?: string;
  candidateName?: string;
  email: string;
  phone?: string;
  courseId: string;
  courseTitle: string;
  experience: string;
  notes?: string;
}

export interface ApplicantAnalysis {
  proficiencyEvaluation: string;
  customizedRecommendations: string[];
  readinessScore: number;
}

export interface WorkflowResult {
  success: boolean;
  emailSubject: string;
  emailBody: string;
  applicantAnalysis: ApplicantAnalysis;
  sentAt: string;
}

/**
 * Generates tailored onboarding roadmap & study recommendations based on course & experience.
 */
function generateCourseRecommendations(courseId: string, experience: string): {
  recommendations: string[];
  score: number;
  evaluation: string;
} {
  const isBeginner = experience.toLowerCase().includes('beginner');
  const isAdvanced = experience.toLowerCase().includes('advanced') || experience.toLowerCase().includes('expert');

  if (courseId === 'enterprise-custom' || courseId === 'agentic-systems') {
    return {
      score: 99,
      evaluation: `Enterprise / Corporate Inquiry (${experience}): Customized corporate upskilling and organizational transformation roadmap will be tailored by our Lead Faculty Architect.`,
      recommendations: [
        'Schedule a 30-minute Organizational Discovery & Workflow Audit session',
        'Collate team software stack licenses (Google Workspace, Microsoft Copilot, Slack/Teams)',
        'Identify target department pilot teams (Leadership, Sales/Marketing, Operations, HR)',
        'Receive custom multi-tier proposal and tailored curriculum draft within 24 hours'
      ],
    };
  }

  if (courseId === 'ai-master') {
    return {
      score: isAdvanced ? 98 : isBeginner ? 88 : 94,
      evaluation: `Candidate demonstrates outstanding readiness for the 3-Month Flagship (AI Master for Real Life). No coding background required; profile (${experience}) is prime for mastering Gemini Advanced, Custom Gems, NotebookLM research, and AI-driven Google Apps Script automations.`,
      recommendations: [
        'Ensure active Google account access for Google Gemini Advanced & Google Workspace environment setup',
        'Review the Month 1 syllabus breakdown (Foundations, Gmail/Docs/Sheets/Slides AI, and Real-Life Roleplays)',
        'Identify 1-2 major workplace bottlenecks or reporting routines for your Month 3 1-on-1 Capstone Project',
        'Join the private cohort WhatsApp networking group upon enrollment confirmation'
      ],
    };
  }

  if (courseId === 'ai-bridge') {
    return {
      score: isAdvanced ? 97 : isBeginner ? 91 : 94,
      evaluation: `Applicant background (${experience}) is prime for the 8-Week Applied AI Practitioner & Workflow Builder accelerator. Ideal foundation for mastering precision RTCC prompting, NotebookLM private research hubs, multimodal creation, and Custom Gems automation.`,
      recommendations: [
        'Set up access to Google Gemini and Google Workspace productivity apps',
        'Gather 2-3 lengthy reports or organizational PDFs for Week 3 NotebookLM private grounding labs',
        'Identify 3 repetitive manual tasks to automate using custom Gems during the Weeks 7-8 Capstone',
        'Review the 4-Phase 8-week syllabus roadmap in your Workspace Hub'
      ],
    };
  }

  // Default: ai-survival or general (1-Week 3-Day Intensive Workshop)
  return {
    score: 95,
    evaluation: `Applicant profile (${experience}) is prime for the 1-Week intensive workshop sprint. Focuses on immediate workplace busywork elimination and irreplaceability mastery.`,
    recommendations: [
      'Create free accounts on the Big Three: OpenAI ChatGPT, Google Gemini, and Anthropic Claude',
      'Download and review "The 4-Part Prompt Formula (Context + Task + Tone + Format)" cheatsheet',
      'Prepare 2 real-world workplace documents (e.g. lengthy PDF or draft email) for Day 2 live optimization',
      'Review priority placement criteria for the 3-Month AI Master Flagship',
    ],
  };
}

/**
 * Zero-API-Key Admissions & Onboarding Workflow Engine.
 * Generates personalized confirmation emails and candidate evaluations deterministically,
 * then persists the application record into Firestore.
 */
export async function processApplicationWorkflow(
  input: ApplicationInput
): Promise<WorkflowResult> {
  const sentAt = new Date().toISOString();
  const rawName = (input.fullName || input.applicantName || input.name || input.candidateName || '').trim();
  let resolvedName = rawName;
  if (!resolvedName || resolvedName.toLowerCase() === 'undefined' || resolvedName.toLowerCase() === 'null') {
    if (input.email && input.email.includes('@')) {
      const localPart = input.email.split('@')[0].replace(/[._+-]+/g, ' ').replace(/[0-9]+/g, '').trim();
      resolvedName = localPart ? localPart.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : 'Candidate';
    } else {
      resolvedName = 'Candidate';
    }
  }

  const analysis = generateCourseRecommendations(input.courseId, input.experience);

  const emailSubject = `Welcome to Institute of AI: Enrollment Confirmation — ${input.courseTitle}`;
  const emailBody = `Dear ${resolvedName},

Thank you for applying for enrollment in the ${input.courseTitle} program at the Institute of AI.

We have successfully processed your candidate registration. Based on your reported background (${input.experience}), our admissions system has prepared your tailored onboarding trajectory and assigned you an initial readiness score of ${analysis.score}/100.

Program Details & Next Milestones:
• Enrolled Course: ${input.courseTitle}
• Registered Contact: ${input.email}${input.phone ? ` (Phone: ${input.phone})` : ''}
• Verification Status: Candidate Record Active & Enqueued

Immediate Action Items:
1. Verify access to your student Workspace Hub in the portal.
2. Review the preparatory reading materials and software requirements.
3. Keep an eye on your inbox for faculty introduction notes and lab access credentials.

We look forward to welcoming you to the Institute of AI cohort.

Warm regards,

Admissions Committee & Academic Faculty
Institute of AI
https://institute-of-ai.org`;

  const result: WorkflowResult = {
    success: true,
    emailSubject,
    emailBody,
    applicantAnalysis: {
      proficiencyEvaluation: analysis.evaluation,
      customizedRecommendations: analysis.recommendations,
      readinessScore: analysis.score,
    },
    sentAt,
  };

  // Persist record to Firestore for audit logging & student tracking
  try {
    await addDoc(collection(db, 'application_workflows'), {
      applicantName: resolvedName,
      fullName: resolvedName,
      email: input.email,
      courseId: input.courseId,
      courseTitle: input.courseTitle,
      experience: input.experience,
      generatedEmailSubject: result.emailSubject,
      generatedEmailBody: result.emailBody,
      analysis: result.applicantAnalysis,
      triggeredByUserId: auth.currentUser?.uid || 'anonymous',
      sentAt,
      status: 'DISPATCHED',
    });
  } catch (firestoreErr) {
    console.warn('Firestore workflow log warning:', firestoreErr);
  }

  return result;
}
