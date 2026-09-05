import { StudentApplication, getCandidateName } from '../types';

export interface CsvExportOptions {
  filename?: string;
  scopeLabel?: string;
  preset?: 'standard' | 'comprehensive' | 'contact_only';
  includeNotes?: boolean;
  includeGoals?: boolean;
  includeDecisionAudit?: boolean;
}

/**
 * Clean & escape string values for safe CSV format (RFC 4180 compliant)
 */
export function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  // If cell contains commas, quotes, or newlines, wrap in quotes and escape internal quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Format ISO or arbitrary date string into human readable UTC/local format
 */
export function formatCsvDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().replace('T', ' ').substring(0, 19);
  } catch {
    return dateStr || '';
  }
}

/**
 * Generates RFC-compliant CSV text with UTF-8 BOM for maximum compatibility
 * across Microsoft Excel, Google Sheets, LibreOffice, and Apple Numbers.
 */
export function generateCandidateCsv(
  applications: StudentApplication[],
  options: CsvExportOptions = {}
): { csvString: string; filename: string; count: number; statusSummary: Record<string, number> } {
  const {
    preset = 'comprehensive',
    includeNotes = true,
    includeGoals = true,
    includeDecisionAudit = true,
    scopeLabel = 'All',
  } = options;

  let headers: string[] = [];

  if (preset === 'contact_only') {
    headers = [
      'Application ID',
      'Candidate Name',
      'Email Address',
      'Phone Number',
      'Program Title',
      'Program ID',
      'Status',
      'Submission Date',
    ];
  } else if (preset === 'standard') {
    headers = [
      'Application ID',
      'Candidate Full Name',
      'Email Address',
      'Phone Number',
      'Program / Track',
      'Program ID',
      'Admissions Status',
      'Applied At (UTC)',
      'Decision Dispatched',
      'Review Date',
      'Reviewer Email',
      'Technical Background',
    ];
  } else {
    // Comprehensive
    headers = [
      'Application ID',
      'Candidate Full Name',
      'First Name',
      'Last Name',
      'Email Address',
      'Phone Number',
      'Program / Track',
      'Program ID',
      'Admissions Status',
      'Applied At (UTC)',
      'Reviewed At (UTC)',
      'Reviewed By (Admin)',
      'Decision Letter Sent',
      'Last Decision Status',
      'Last Decision Email Date',
      'Dispatched Enclosures / PDFs',
      'Technical Background / Role',
      'Experience Level',
      'Python Proficiency',
    ];

    if (includeGoals) {
      headers.push('Candidate Goal Statement / Motivation');
    }
    if (includeNotes) {
      headers.push('Internal Admin Evaluation Notes');
    }
  }

  const statusSummary: Record<string, number> = {
    total: applications.length,
    accepted: 0,
    under_review: 0,
    submitted: 0,
    waitlisted: 0,
    rejected: 0,
  };

  const rows = applications.map((app) => {
    const name = getCandidateName(app);
    const parts = name.split(' ');
    const firstName = parts[0] || name;
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
    const status = app.status || 'submitted';
    const courseTitle = app.courseTitle || (app as any).courseName || 'Applied AI Track';
    const courseId = app.courseId || (app as any).programId || '';

    // Track summary
    if (status in statusSummary) {
      statusSummary[status]++;
    } else {
      statusSummary.submitted++;
    }

    if (preset === 'contact_only') {
      return [
        escapeCsvCell(app.id),
        escapeCsvCell(name),
        escapeCsvCell(app.email || ''),
        escapeCsvCell(app.phone || ''),
        escapeCsvCell(courseTitle),
        escapeCsvCell(courseId),
        escapeCsvCell(status.toUpperCase()),
        escapeCsvCell(formatCsvDate(app.createdAt)),
      ].join(',');
    }

    if (preset === 'standard') {
      return [
        escapeCsvCell(app.id),
        escapeCsvCell(name),
        escapeCsvCell(app.email || ''),
        escapeCsvCell(app.phone || ''),
        escapeCsvCell(courseTitle),
        escapeCsvCell(courseId),
        escapeCsvCell(status.toUpperCase()),
        escapeCsvCell(formatCsvDate(app.createdAt)),
        escapeCsvCell(app.decisionLetterSent ? 'YES' : 'NO'),
        escapeCsvCell(formatCsvDate(app.reviewedAt)),
        escapeCsvCell(app.reviewedBy || ''),
        escapeCsvCell(app.background || (app as any).currentRole || ''),
      ].join(',');
    }

    // Comprehensive
    const rowValues = [
      escapeCsvCell(app.id),
      escapeCsvCell(name),
      escapeCsvCell(firstName),
      escapeCsvCell(lastName),
      escapeCsvCell(app.email || ''),
      escapeCsvCell(app.phone || ''),
      escapeCsvCell(courseTitle),
      escapeCsvCell(courseId),
      escapeCsvCell(status.toUpperCase()),
      escapeCsvCell(formatCsvDate(app.createdAt)),
      escapeCsvCell(formatCsvDate(app.reviewedAt)),
      escapeCsvCell(app.reviewedBy || ''),
      escapeCsvCell(app.decisionLetterSent ? 'YES' : 'NO'),
      escapeCsvCell(app.lastDecisionStatus ? app.lastDecisionStatus.toUpperCase() : ''),
      escapeCsvCell(formatCsvDate(app.lastDecisionEmailAt)),
      escapeCsvCell(app.lastAttachedFiles && app.lastAttachedFiles.length > 0 ? app.lastAttachedFiles.join('; ') : 'None'),
      escapeCsvCell(app.background || (app as any).currentRole || ''),
      escapeCsvCell(app.experienceLevel || ''),
      escapeCsvCell(app.pythonProficiency || ''),
    ];

    if (includeGoals) {
      rowValues.push(escapeCsvCell(app.goals || ''));
    }
    if (includeNotes) {
      rowValues.push(escapeCsvCell(app.notes || ''));
    }

    return rowValues.join(',');
  });

  // Prepend UTF-8 BOM character (\uFEFF)
  const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');

  const dateTag = new Date().toISOString().split('T')[0];
  const cleanScope = scopeLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = options.filename || `IoAI_Candidate_Report_${cleanScope}_${dateTag}.csv`;

  return {
    csvString: csvContent,
    filename,
    count: applications.length,
    statusSummary,
  };
}

/**
 * Triggers a browser download of a CSV file given the string payload.
 */
export function downloadCsvString(filename: string, csvString: string): boolean {
  try {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to trigger CSV download:', err);
    return false;
  }
}
