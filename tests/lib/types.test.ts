import { describe, it, expect } from 'vitest';
import { getCandidateName, getApplicationTimestamp, toMillis } from '../../src/types';

describe('getCandidateName — FB-12/FB-13 (Q9)', () => {
  it('prefers fullName over aliases', () => {
    expect(getCandidateName({ fullName: 'Ada', name: 'Bob' })).toBe('Ada');
  });
  it('derives a name from the email local-part when names are empty', () => {
    expect(getCandidateName({ email: 'jane.doe42@x.com' })).toBe('Jane Doe');
  });
  it('skips non-string names instead of throwing (one bad public doc no longer hides the admin list)', () => {
    expect(getCandidateName({ fullName: 123 as any, applicantName: { x: 1 } as any, name: 'Grace' })).toBe('Grace');
    expect(getCandidateName({ fullName: 123 as any, email: 'x@y.com' })).toBe('Candidate');
  });
  it('checks each alias individually, so a literal "undefined" falls through to the next one', () => {
    expect(getCandidateName({ fullName: 'undefined', applicantName: 'Real Name', email: 'x@y.com' })).toBe('Real Name');
    expect(getCandidateName({ fullName: '  ', applicantName: 'null', candidateName: 'Kai' })).toBe('Kai');
  });
});

describe('getApplicationTimestamp / toMillis — FB-14 (Q9)', () => {
  it('handles Firestore Timestamp-like objects', () => {
    expect(getApplicationTimestamp({ createdAt: { seconds: 10, nanoseconds: 5e6 } })).toBe(10005);
    expect(toMillis({ toDate: () => new Date(42) })).toBe(42);
  });
  it('parses ISO strings', () => {
    expect(getApplicationTimestamp({ createdAt: '2026-01-01T00:00:00.000Z' })).toBe(Date.UTC(2026, 0, 1));
  });
  it('treats small numbers as epoch seconds and large ones as milliseconds', () => {
    expect(getApplicationTimestamp({ createdAt: 1_700_000_000 })).toBe(1_700_000_000_000);
    expect(getApplicationTimestamp({ createdAt: 1_700_000_000_000 })).toBe(1_700_000_000_000);
  });
  it('returns 0 for missing or unparseable values', () => {
    expect(toMillis(undefined)).toBe(0);
    expect(toMillis('not a date')).toBe(0);
    expect(toMillis({})).toBe(0);
  });
  it('trusts a client-supplied future date (legacy docs; new writes use serverTimestamp)', () => {
    expect(getApplicationTimestamp({ createdAt: '2099-01-01T00:00:00Z' })).toBe(Date.UTC(2099, 0, 1));
  });
});
