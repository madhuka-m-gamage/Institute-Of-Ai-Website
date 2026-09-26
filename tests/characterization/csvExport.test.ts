import { describe, it, expect } from 'vitest';
import { escapeCsvCell, formatCsvDate, generateCandidateCsv } from '../../src/admin/services/csvExport';

describe('CHARACTERIZATION CSV formula injection — ADM-7, flips in Charge Q10', () => {
  it('quotes and doubles quotes (RFC 4180)', () => {
    expect(escapeCsvCell('a "b", c')).toBe('"a ""b"", c"');
  });
  it.each(['=HYPERLINK("http://evil")', '+1+1', '-2+3', '@SUM(A1)'])('BUG: leaves leading formula char in %s', (v) => {
    expect(escapeCsvCell(v).startsWith(`"${v[0]}`)).toBe(true);
  });
  it('BUG: applicant-supplied formula reaches the generated CSV verbatim', () => {
    const { csvString } = generateCandidateCsv([
      { id: 'a1', fullName: '=cmd|"/c calc"!A1', email: 'e@x.com', courseId: 'c', status: 'submitted' } as any,
    ]);
    expect(csvString).toContain('"=cmd|""/c calc""!A1"');
  });
});

describe('CSV dates — FB-15 (Q9)', () => {
  it('formats ISO dates as UTC "YYYY-MM-DD HH:MM:SS"', () => {
    expect(formatCsvDate('2026-01-02T03:04:05.000Z')).toBe('2026-01-02 03:04:05');
  });
  it('formats a Firestore Timestamp createdAt instead of writing "[object Object]"', () => {
    const ts = { seconds: 1767323045, nanoseconds: 0, toDate: () => new Date(Date.UTC(2026, 0, 2, 3, 4, 5)) };
    const { csvString } = generateCandidateCsv([{ id: 't', email: 'e@x.com', createdAt: ts } as any]);
    expect(csvString).not.toContain('[object Object]');
    expect(csvString).toContain('2026-01-02 03:04:05');
  });
  it('leaves missing or unparseable dates blank', () => {
    expect(formatCsvDate(undefined)).toBe('');
    expect(formatCsvDate('not a date')).toBe('');
  });
});
