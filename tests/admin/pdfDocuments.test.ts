// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { resolveProgramDetails, getAvailableDocumentsForProgram, generateProgramPDF } from '../../src/admin/services/pdfDocuments';
import type { StudentApplication } from '../../src/types';

const app = (overrides: Partial<StudentApplication>): StudentApplication => ({
  id: 'a1', fullName: 'Ada Lovelace', email: 'ada@x.com', courseId: 'ai-master', courseTitle: 'AI Master for Real Life',
  status: 'accepted', ...overrides,
});

describe('PDF course matching — Q11 (ADM-13)', () => {
  it('resolves by exact course id before anything else', () => {
    // The title here would fuzzy-match a different course; the id must win.
    expect(resolveProgramDetails('ai-bridge', 'AI Survival & Mastery')?.id).toBe('ai-bridge');
  });
  it('falls back to an exact (case-insensitive) title when the id is missing', () => {
    expect(resolveProgramDetails(undefined, 'ai survival & mastery')?.id).toBe('ai-survival');
  });
  it('does not guess from partial matches or silently default to the first course', () => {
    expect(resolveProgramDetails(undefined, 'Mastery')).toBeUndefined();
    expect(resolveProgramDetails('unknown-course', undefined)).toBeUndefined();
  });
  it('offers no documents for an unknown course, and refuses to generate one', () => {
    expect(getAvailableDocumentsForProgram(undefined, 'Nonexistent Course', 'accepted')).toEqual([]);
    expect(() => generateProgramPDF('syllabus-x', app({ courseId: 'nope', courseTitle: 'Nope' }))).toThrow(/course/i);
  });
  it('generates the syllabus for the applicant\'s own course', () => {
    const pdf = generateProgramPDF('syllabus-ai-bridge', app({ courseId: 'ai-bridge', courseTitle: 'AI Survival & Mastery' }));
    expect(pdf.filename).toContain('Applied-AI-Practitioner');
  });
});

describe('PDF documents — Q11 (ADM-12)', () => {
  it('no longer offers the enterprise blueprint, which was generated as a tuition-grant letter', () => {
    const ids = getAvailableDocumentsForProgram('enterprise-custom', undefined, 'accepted').map((d) => d.id);
    expect(ids.some((id) => id.startsWith('enterprise-'))).toBe(false);
  });
  it('refuses an unknown document type instead of falling through to the grant letter', () => {
    expect(() => generateProgramPDF('enterprise-enterprise-custom', app({ courseId: 'enterprise-custom' }))).toThrow(/unknown document/i);
  });
  it('still generates the grant letter when asked for it', () => {
    expect(generateProgramPDF('grant-ai-master', app({})).filename).toContain('Scholarship-Grant');
  });
});
