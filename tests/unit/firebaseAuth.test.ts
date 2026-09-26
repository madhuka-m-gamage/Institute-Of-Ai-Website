import { describe, it, expect, vi, beforeEach } from 'vitest';

const { providers, reauthenticateWithPopup, signInWithPopup, auth } = vi.hoisted(() => {
  const providers: Array<{ scopes: string[]; params: Record<string, string> }> = [];
  return {
    providers,
    reauthenticateWithPopup: vi.fn(),
    signInWithPopup: vi.fn(),
    auth: { currentUser: null as null | { email: string; providerData: { providerId: string }[] } },
  };
});

vi.mock('firebase/app', () => ({ initializeApp: () => ({}) }));
vi.mock('firebase/firestore', () => ({ getFirestore: () => ({}), doc: vi.fn(), getDocFromServer: vi.fn() }));
vi.mock('firebase/auth', () => {
  class GoogleAuthProvider {
    scopes: string[] = [];
    params: Record<string, string> = {};
    constructor() { providers.push(this); }
    addScope(s: string) { this.scopes.push(s); }
    setCustomParameters(p: Record<string, string>) { this.params = p; }
    static credentialFromResult(r: { token: string }) { return { accessToken: r.token }; }
  }
  return {
    getAuth: () => auth,
    GoogleAuthProvider,
    signInWithPopup,
    reauthenticateWithPopup,
    signInWithEmailAndPassword: vi.fn(),
    onAuthStateChanged: vi.fn(),
    signOut: vi.fn(),
  };
});

import { googleSignIn, getGmailSendToken, clearGmailSendToken, logout } from '../../src/lib/firebase';

const GMAIL_SEND = 'https://www.googleapis.com/auth/gmail.send';
const googleUser = { email: 'owner@gmail.com', providerData: [{ providerId: 'google.com' }] };

beforeEach(async () => {
  reauthenticateWithPopup.mockReset();
  signInWithPopup.mockReset();
  auth.currentUser = googleUser;
  await logout();
  vi.useRealTimers();
});

describe('Q4: Google sign-in requests identity only (GWS-3/FB-6)', () => {
  it('the sign-in provider adds no Workspace scopes and does not force consent', async () => {
    signInWithPopup.mockResolvedValue({ user: googleUser, token: 'id-only' });
    await googleSignIn();
    const signInProvider = signInWithPopup.mock.calls[0][1];
    expect(signInProvider.scopes).toEqual([]);
    expect(signInProvider.params.prompt ?? '').not.toContain('consent');
  });
});

describe('Q4: gmail.send is requested incrementally, on first send', () => {
  it('re-authenticates the same Google account asking only for gmail.send', async () => {
    reauthenticateWithPopup.mockResolvedValue({ token: 'gmail-token' });
    await expect(getGmailSendToken()).resolves.toBe('gmail-token');
    const [user, provider] = reauthenticateWithPopup.mock.calls[0];
    expect(user).toBe(googleUser);
    expect(provider.scopes).toEqual([GMAIL_SEND]);
    expect(provider.params.login_hint).toBe('owner@gmail.com');
  });

  it('reuses the token until it is about to expire', async () => {
    vi.useFakeTimers();
    reauthenticateWithPopup.mockResolvedValueOnce({ token: 't1' }).mockResolvedValueOnce({ token: 't2' });
    expect(await getGmailSendToken()).toBe('t1');
    expect(await getGmailSendToken()).toBe('t1');
    expect(reauthenticateWithPopup).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(56 * 60 * 1000);
    expect(await getGmailSendToken()).toBe('t2');
  });

  it('explains that email/password accounts must use Google to send', async () => {
    auth.currentUser = { email: 'staff@x.com', providerData: [{ providerId: 'password' }] };
    await expect(getGmailSendToken()).rejects.toThrow(/Google/);
    expect(reauthenticateWithPopup).not.toHaveBeenCalled();
  });

  it('asks again after the token is cleared (e.g. Gmail rejected it)', async () => {
    reauthenticateWithPopup.mockResolvedValue({ token: 't1' });
    await getGmailSendToken();
    clearGmailSendToken();
    await getGmailSendToken();
    expect(reauthenticateWithPopup).toHaveBeenCalledTimes(2);
  });

  it('forgets the token on logout', async () => {
    reauthenticateWithPopup.mockResolvedValue({ token: 't1' });
    await getGmailSendToken();
    await logout();
    await getGmailSendToken();
    expect(reauthenticateWithPopup).toHaveBeenCalledTimes(2);
  });
});
