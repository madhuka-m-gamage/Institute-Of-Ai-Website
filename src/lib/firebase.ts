import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  reauthenticateWithPopup,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Sign-in asks for identity only; Gmail access is requested separately when an admin first sends mail.
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
// Google access tokens last one hour; refresh a little early so a long bulk send doesn't hit expiry.
const GMAIL_TOKEN_LIFETIME_MS = 55 * 60 * 1000;

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    return { user: result.user };
  } catch (error: unknown) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const emailPasswordSignIn = async (email: string, pass: string): Promise<User> => {
  try {
    isSigningIn = true;
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return cred.user;
  } catch (error: unknown) {
    console.error('Email sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Incremental authorization: re-authenticates the signed-in Google account asking only for gmail.send.
export const getGmailSendToken = async (): Promise<string> => {
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt) return cachedAccessToken;

  const user = auth.currentUser;
  if (!user || !user.providerData.some((p) => p.providerId === 'google.com')) {
    throw new Error('Sending email requires signing in to the admin console with Google.');
  }

  const gmailProvider = new GoogleAuthProvider();
  gmailProvider.addScope(GMAIL_SEND_SCOPE);
  gmailProvider.setCustomParameters({ login_hint: user.email || '' });

  const result = await reauthenticateWithPopup(user, gmailProvider);
  const token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
  if (!token) throw new Error('Google did not grant permission to send email.');

  cachedAccessToken = token;
  cachedAccessTokenExpiresAt = Date.now() + GMAIL_TOKEN_LIFETIME_MS;
  return token;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedAccessTokenExpiresAt = 0;
};

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore operating in progressive offline cache mode.');
    }
  }
}
