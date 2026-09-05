import { jsPDF } from 'jspdf';
import { StudentApplication, getCandidateName } from '../types';
import { COURSES } from '../data/mockData';

export interface AttachableDocument {
  id: string;
  name: string;
  filename: string;
  description: string;
  category: 'syllabus' | 'welcome_guide' | 'grant_letter' | 'enterprise_blueprint';
  badge: string;
  defaultAttached: boolean;
  sizeEstimate: string;
  programTitle: string;
}

/**
 * Resolves the course details matching the application's program.
 */
export function resolveProgramDetails(courseTitleOrId?: string) {
  if (!courseTitleOrId) return COURSES[0];
  const query = courseTitleOrId.toLowerCase().trim();

  // Try matching by exact ID or substring in title
  const found = COURSES.find(
    (c) =>
      c.id.toLowerCase() === query ||
      c.title.toLowerCase().includes(query) ||
      query.includes(c.title.toLowerCase()) ||
      (c.badge && query.includes(c.badge.toLowerCase()))
  );

  return found || COURSES[0];
}

/**
 * Returns available pre-defined PDF documents tailored to the candidate's chosen program.
 */
export function getAvailableDocumentsForProgram(
  courseTitleOrId?: string,
  candidateStatus?: string
): AttachableDocument[] {
  const course = resolveProgramDetails(courseTitleOrId);
  const isAccepted = candidateStatus === 'accepted';
  const isGrant = candidateStatus === 'grant';
  const isEnterprise = course.id === 'enterprise-custom' || (courseTitleOrId && courseTitleOrId.toLowerCase().includes('enterprise'));

  const docs: AttachableDocument[] = [];

  // 1. Program-Specific Official Syllabus PDF
  const sanitizedTitle = course.title.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  docs.push({
    id: `syllabus-${course.id}`,
    name: `Official Syllabus: ${course.title}`,
    filename: `IoAI-Syllabus-${sanitizedTitle}.pdf`,
    description: `Complete curriculum, week-by-week module breakdown, learning objectives, tools & hardware specs for ${course.title}.`,
    category: 'syllabus',
    badge: course.badge || 'Syllabus',
    defaultAttached: true, // Always attached by default for decision emails
    sizeEstimate: '185 KB',
    programTitle: course.title,
  });

  // 2. Admitted Candidate Welcome & Orientation Guide PDF
  docs.push({
    id: `welcome-${course.id}`,
    name: `Cohort Welcome & Orientation Guide`,
    filename: `IoAI-Welcome-Orientation-Guide-2026.pdf`,
    description: `Step-by-step onboarding, Discord server credentials, Google AI Studio sandbox setup, and live kickoff schedule.`,
    category: 'welcome_guide',
    badge: 'Orientation Guide',
    defaultAttached: isAccepted, // Auto-selected if candidate is accepted
    sizeEstimate: '220 KB',
    programTitle: course.title,
  });

  // 3. Academic Tuition Grant & Scholarship Award Letter PDF
  docs.push({
    id: `grant-${course.id}`,
    name: `Academic Tuition Grant & Co-Sponsorship Schedule`,
    filename: `IoAI-Scholarship-Grant-Schedule-${sanitizedTitle}.pdf`,
    description: `Formal scholarship award confirmation, industry co-sponsorship details, and tuition invoice breakdown.`,
    category: 'grant_letter',
    badge: 'Tuition Grant',
    defaultAttached: isGrant,
    sizeEstimate: '140 KB',
    programTitle: course.title,
  });

  // 4. If Enterprise track or Corporate inquiry, provide Executive AI Blueprint
  if (isEnterprise) {
    docs.push({
      id: `enterprise-${course.id}`,
      name: `Corporate AI Transformation Blueprint`,
      filename: `IoAI-Corporate-AI-Transformation-Blueprint.pdf`,
      description: `Executive roadmap, proprietary departmental workflow audits, team Custom Gems architecture & enterprise governance.`,
      category: 'enterprise_blueprint',
      badge: 'Executive Blueprint',
      defaultAttached: true,
      sizeEstimate: '310 KB',
      programTitle: course.title,
    });
  }

  return docs;
}

/**
 * Generates a high-quality PDF using jsPDF for the specified document type and candidate application.
 */
export function generateProgramPDF(
  docId: string,
  application: StudentApplication
): { filename: string; mimeType: string; dataBase64: string; blob: Blob; dataUrl: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const candidateName = getCandidateName(application);
  const course = resolveProgramDetails(application.courseTitle || (application as any).courseName);
  const now = new Date();
  const dateString = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const refId = `IOAI-${course.id.toUpperCase().substring(0, 4)}-${application.id?.substring(0, 6).toUpperCase() || 'REF'}`;

  // Helper drawing functions
  const drawHeader = (title: string, subtitle: string) => {
    // Top banner background
    doc.setFillColor(3, 20, 39); // Deep navy #031427
    doc.rect(0, 0, 210, 38, 'F');

    // Accent line
    doc.setFillColor(65, 228, 192); // Teal #41e4c0
    doc.rect(0, 38, 210, 1.5, 'F');

    // Title & Institute Name
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('INSTITUTE OF AI', 15, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(65, 228, 192);
    doc.text('CENTER FOR ADVANCED MACHINE INTELLIGENCE & APPLIED WORKPLACE AI', 15, 19);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), 15, 29);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(subtitle, 15, 34);

    // Reference ID in top right
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(65, 228, 192);
    doc.text(`REF: ${refId}`, 195, 14, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`ISSUED: ${dateString}`, 195, 19, { align: 'right' });
    doc.text(`STATUS: OFFICIAL ENCLOSURE`, 195, 24, { align: 'right' });
  };

  const drawFooter = (pageNum = 1, totalPages = 1) => {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(15, 282, 195, 282);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Institute of AI • Colombo Tech Park, Sri Lanka • admissions@instituteofai.com • https://instituteofai.com', 15, 287);
    doc.text(`Page ${pageNum} of ${totalPages}`, 195, 287, { align: 'right' });
  };

  // Determine document type by docId
  if (docId.startsWith('syllabus')) {
    // -------------------------------------------------------------
    // DOCUMENT 1: OFFICIAL COURSE SYLLABUS
    // -------------------------------------------------------------
    drawHeader(`SYLLABUS & CURRICULUM: ${course.title}`, `${course.subtitle} • ${course.duration}`);

    let y = 46;

    // Candidate Recipient Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, y, 180, 20, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Candidate Enrollment Dossier: ${candidateName}`, 19, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Registered Email: ${application.email}   |   Program Track: ${course.title} (${course.badge})`, 19, y + 11);
    doc.text(`Duration: ${course.duration}   |   Schedule: ${course.schedule}   |   Tuition: ${course.investment}`, 19, y + 16);

    y += 26;

    // Program Description & Objective
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('1. PROGRAM EXECUTIVE OVERVIEW', 15, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const splitDesc = doc.splitTextToSize(course.description, 180);
    doc.text(splitDesc, 15, y);
    y += splitDesc.length * 4.2 + 4;

    // Core Skills & Competencies
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('2. CORE COMPETENCIES & APPLIED CAPABILITIES', 15, y);
    y += 5;

    course.skills.forEach((skill) => {
      doc.setFillColor(65, 228, 192);
      doc.circle(18, y - 1, 1, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(skill, 22, y);
      y += 4.5;
    });

    y += 3;

    // Detailed Syllabus Modules
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('3. DETAILED MODULE-BY-MODULE BREAKDOWN', 15, y);
    y += 6;

    if (course.syllabusModules && course.syllabusModules.length > 0) {
      course.syllabusModules.forEach((mod) => {
        if (y > 245) {
          drawFooter(1, 2);
          doc.addPage();
          drawHeader(`SYLLABUS: ${course.title} (CONTINUED)`, `${course.subtitle}`);
          y = 48;
        }

        // Module Box Header
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(15, y, 180, 8, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(3, 20, 39);
        doc.text(`${mod.period.toUpperCase()}: ${mod.title}`, 18, y + 5.5);

        y += 11;

        if (mod.description) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          const splitModDesc = doc.splitTextToSize(mod.description, 175);
          doc.text(splitModDesc, 18, y);
          y += splitModDesc.length * 3.8 + 2;
        }

        mod.topics.forEach((topic) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(51, 65, 85);
          const splitTopic = doc.splitTextToSize(`•  ${topic}`, 174);
          doc.text(splitTopic, 20, y);
          y += splitTopic.length * 3.6 + 1.2;
        });

        y += 3;
      });
    }

    // Hardware and Certification Block
    if (y > 230) {
      drawFooter(doc.getNumberOfPages(), doc.getNumberOfPages() + 1);
      doc.addPage();
      drawHeader(`SYLLABUS: ${course.title} (SPECIFICATIONS)`, 'Hardware Requirements & Certification');
      y = 48;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('4. SYSTEM REQUIREMENTS & CERTIFICATE CREDENTIALS', 15, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text('• Hardware: Any modern laptop (Mac/Windows/Linux) with Google Chrome or Brave Browser.', 18, y);
    y += 4.5;
    doc.text('• AI Environment: Dedicated Institute of AI Sandbox & Google AI Studio Gemini API keys provided.', 18, y);
    y += 4.5;
    doc.text('• Certificate: Verifiable digital certificate with cryptographic hash & LinkedIn badge upon Capstone defense.', 18, y);
    y += 10;

    // Academic Registry Signature Block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(3, 20, 39);
    doc.text('Admissions Committee & Academic Registry', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Institute of AI — Center for Advanced Machine Intelligence', 15, y + 4.5);

    drawFooter(doc.getNumberOfPages(), doc.getNumberOfPages());

    const sanitizedTitle = course.title.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const filename = `IoAI-Syllabus-${sanitizedTitle}.pdf`;
    const dataUri = doc.output('datauristring');
    const dataBase64 = dataUri.split(',')[1];
    const blob = doc.output('blob');

    return { filename, mimeType: 'application/pdf', dataBase64, blob, dataUrl: dataUri };
  }

  if (docId.startsWith('welcome')) {
    // -------------------------------------------------------------
    // DOCUMENT 2: ADMITTED CANDIDATE WELCOME & ORIENTATION GUIDE
    // -------------------------------------------------------------
    drawHeader('CANDIDATE WELCOME & ORIENTATION GUIDE', `Welcome to Institute of AI • Cohort 2026 • ${course.title}`);

    let y = 46;

    // Welcome Greeting Box
    doc.setFillColor(236, 253, 245); // Emerald-50
    doc.setDrawColor(167, 243, 208); // Emerald-200
    doc.roundedRect(15, y, 180, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(6, 78, 59);
    doc.text(`Official Welcome: Congratulations, ${candidateName}!`, 19, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 118, 110);
    doc.text(`You have been accepted into the prestigious ${course.title} program.`, 19, y + 13);
    doc.text(`Candidate Ref ID: ${refId}   |   Registered Email: ${application.email}`, 19, y + 19);

    y += 30;

    // 1. Mandatory Checklist Before Day 1
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('1. MANDATORY ADMITTED STUDENT CHECKLIST', 15, y);
    y += 6;

    const checklist = [
      {
        step: 'Step 1: Join Private Discord & WhatsApp Cohort Channel',
        desc: 'Connect with faculty mentors and your cohort peers. Link provided in your acceptance dispatch.',
      },
      {
        step: 'Step 2: Google Workspace & AI Sandbox Activation',
        desc: 'Sign in with your registered Google account to activate your cloud GPU workspace and Gemini API tokens.',
      },
      {
        step: 'Step 3: Add Live Orientation Session to Google Calendar',
        desc: 'Add the scheduled live live kickoff session to your calendar to avoid scheduling conflicts.',
      },
      {
        step: 'Step 4: Complete Pre-Cohort Self-Assessment Quiz',
        desc: 'Takes 10 minutes to help mentors tailor hands-on exercises to your specific domain expertise.',
      },
    ];

    checklist.forEach((item, idx) => {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, y, 180, 14, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(3, 20, 39);
      doc.text(`[ ${idx + 1} ]  ${item.step}`, 19, y + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(item.desc, 23, y + 10.5);

      y += 17;
    });

    y += 3;

    // 2. Program Schedule & Live Lab Hours
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('2. COHORT SCHEDULE & LIVE INTERACTIVE SESSIONS', 15, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`• Program Track: ${course.title} (${course.badge})`, 18, y);
    y += 4.5;
    doc.text(`• Schedule: ${course.schedule}`, 18, y);
    y += 4.5;
    doc.text(`• Live Meeting Platform: Google Meet & Interactive Cloud Code Labs`, 18, y);
    y += 4.5;
    doc.text(`• Recordings Policy: All live sessions recorded and accessible 24/7 with searchable AI summaries.`, 18, y);
    y += 10;

    // 3. Academic Integrity & Support Coordinates
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('3. ACADEMIC ADVISORY & SUPPORT COORDINATES', 15, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text('• Admissions & Registry Desk: admissions@instituteofai.com', 18, y);
    y += 4.5;
    doc.text('• Technical Support & Sandbox Access: support@instituteofai.com', 18, y);
    y += 4.5;
    doc.text('• Academic Director Office: Colombo Tech Park, Sri Lanka', 18, y);

    drawFooter(1, 1);

    const filename = `IoAI-Welcome-Orientation-Guide-2026.pdf`;
    const dataUri = doc.output('datauristring');
    const dataBase64 = dataUri.split(',')[1];
    const blob = doc.output('blob');

    return { filename, mimeType: 'application/pdf', dataBase64, blob, dataUrl: dataUri };
  }

  // -------------------------------------------------------------
  // DOCUMENT 3: TUITION GRANT / SCHOLARSHIP OR ENTERPRISE BLUEPRINT
  // -------------------------------------------------------------
  drawHeader('ACADEMIC TUITION GRANT & SPONSORSHIP SCHEDULE', `Tuition Schedule • ${course.title}`);

  let y = 46;

  doc.setFillColor(254, 243, 199); // Amber-100
  doc.setDrawColor(251, 191, 36); // Amber-400
  doc.roundedRect(15, y, 180, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(120, 53, 15);
  doc.text(`Candidate Grant Allocation: ${candidateName}`, 19, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(146, 64, 14);
  doc.text(`Course Track: ${course.title}   |   Ref: ${refId}`, 19, y + 12);
  doc.text(`Standard Tuition: ${course.investment}   |   Applied Grant: Institutional Co-Sponsorship Awarded`, 19, y + 17.5);

  y += 28;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. GRANT TERMS & ENROLLMENT CONFIRMATION', 15, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('• Co-sponsorship grant covers access to cloud computing clusters, GPU allocations, and live mentoring.', 18, y);
  y += 4.5;
  doc.text('• Registration validity: Must be confirmed within 7 business days from date of issuance.', 18, y);
  y += 4.5;
  doc.text('• Payment methods supported: Online bank transfer, credit card (0% installments available), and corporate invoices.', 18, y);
  y += 10;

  drawFooter(1, 1);

  const filename = `IoAI-Scholarship-Grant-Schedule.pdf`;
  const dataUri = doc.output('datauristring');
  const dataBase64 = dataUri.split(',')[1];
  const blob = doc.output('blob');

  return { filename, mimeType: 'application/pdf', dataBase64, blob, dataUrl: dataUri };
}

/**
 * Initiates an immediate client-side download of the selected program PDF.
 */
export function downloadProgramPDF(docId: string, application: StudentApplication) {
  const { filename, blob } = generateProgramPDF(docId, application);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
