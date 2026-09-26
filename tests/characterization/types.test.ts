import { describe, it, expect } from 'vitest';
import { getCandidateName, getApplicationTimestamp } from '../../src/types';

describe('CHARACTERIZATION getCandidateName — FB-12/FB-13, flips in Charge Q9', () => {
  it('prefers fullName over aliases', () => {
    expect(getCandidateName({ fullName: 'Ada', name: 'Bob' })).toBe('Ada');
  });
  it('derives a name from the email local-part when names are empty', () => {
    expect(getCandidateName({ email: 'jane.doe42@x.com' })).toBe('Jane Doe');
  });
  it('BUG FB-12: throws on a non-string name (one bad public doc breaks the admin list)', () => {
    expect(() => getCandidateName({ fullName: 123 as any })).toThrow(TypeError);
  });
  it('BUG FB-13: literal "undefined" in fullName skips valid alias fields', () => {
    expect(getCandidateName({ fullName: 'undefined', applicantName: 'Real Name', email: 'x@y.com' })).toBe('Candidate');
  });
});

describe('CHARACTERIZATION getApplicationTimestamp — FB-14, flips in Charge Q9', () => {
  it('handles Firestore Timestamp-like objects', () => {
    expect(getApplicationTimestamp({ createdAt: { seconds: 10, nanoseconds: 5e6 } })).toBe(10005);
  });
  it('parses ISO strings', () => {
    expect(getApplicationTimestamp({ createdAt: '2026-01-01T00:00:00.000Z' })).toBe(Date.UTC(2026, 0, 1));
  });
  it('BUG FB-14: numbers are assumed to be milliseconds (epoch seconds pass through unscaled)', () => {
    expect(getApplicationTimestamp({ createdAt: 1_700_000_000 })).toBe(1_700_000_000);
  });
  it('trusts a client-supplied future date', () => {
    expect(getApplicationTimestamp({ createdAt: '2099-01-01T00:00:00Z' })).toBe(Date.UTC(2099, 0, 1));
  });
});
