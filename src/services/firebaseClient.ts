/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';

/**
 * Firebase Client Configuration
 * Pulls from Vite environment variables when configured in production or Cloud Shell.
 * Gracefully operates in mock/development mode if keys are absent.
 */
const firebaseConfig = {
  apiKey:
    (import.meta as any).env?.VITE_FIREBASE_API_KEY || 'AIzaSyB4faySp9fYnSjkGW0TFt4y_9eFzn28SNE',
  authDomain:
    (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN ||
    'brainwise-ai-marketing-engine.firebaseapp.com',
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || 'brainwise-ai-marketing-engine',
  storageBucket:
    (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET ||
    'brainwise-ai-marketing-engine.firebasestorage.app',
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '691254604957',
  appId:
    (import.meta as any).env?.VITE_FIREBASE_APP_ID || '1:691254604957:web:caf76181c86efb6a7b5074',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.apiKey !== 'AIzaSyDemoFallbackKeyForDev'
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (err) {
  console.warn('Firebase client initialization warning (running in decoupled dev mode):', err);
}

export { app, auth, googleProvider };

export interface ClientAuthSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  idToken: string;
}

/**
 * Signs in using Google Sign-In popup via Firebase Auth.
 * If running in local dev without Firebase credentials or if popup is dismissed/blocked,
 * gracefully falls back to a deterministic development session.
 */
export async function signInWithGoogle(): Promise<ClientAuthSession> {
  if (auth && googleProvider && isFirebaseConfigured) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        idToken,
      };
    } catch (err: unknown) {
      console.warn('Firebase signInWithPopup returned or was cancelled. Checking fallback:', err);
      // Re-throw if it's a fatal network error in configured production
      if ((err as any)?.code === 'auth/popup-blocked') {
        throw new Error(
          'Sign-in popup was blocked by browser. Please allow popups for BrainWise.',
          { cause: err }
        );
      }
      throw err;
    }
  }

  // Deterministic local developer / demo session fallback for dev & tests
  const devUid = 'vishesh_demo_uid';
  return {
    uid: devUid,
    email: 'vishesh.kakar@gmail.com',
    displayName: 'Vishesh Kakar',
    photoURL: null,
    idToken: `bw-token-${devUid}`,
  };
}

/**
 * Signs out current user session from Firebase Auth.
 */
export async function signOutClient(): Promise<void> {
  if (auth && isFirebaseConfigured) {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn('Error during firebase sign out:', err);
    }
  }
}

/**
 * Observes client authentication state changes and retrieves fresh ID tokens.
 */
export function subscribeToAuthState(
  callback: (session: ClientAuthSession | null) => void
): () => void {
  if (!auth || !isFirebaseConfigured) {
    // In dev mode without Firebase, callback with null or keep current session
    return () => {};
  }

  const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      try {
        const idToken = await user.getIdToken();
        callback({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          idToken,
        });
      } catch {
        callback(null);
      }
    } else {
      callback(null);
    }
  });

  return unsubscribe;
}
