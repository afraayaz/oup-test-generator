/**
 * Firebase Admin SDK setup for server-side operations
 * 
 * Setup instructions:
 * 
 * 1. Install firebase-admin:
 *    npm install firebase-admin
 * 
 * 2. Download your Firebase service account key:
 *    - Go to Firebase Console > Project Settings > Service Accounts
 *    - Click "Generate New Private Key"
 *    - Save the JSON file securely
 * 
 * 3. Add to your environment variables (.env.local):
 *    FIREBASE_PROJECT_ID=quiz-app-ff0ab
 *    FIREBASE_PRIVATE_KEY=your_private_key_here
 *    FIREBASE_CLIENT_EMAIL=your_client_email_here
 */

import admin from 'firebase-admin';

let isInitialized = false;

// Initialize Firebase Admin SDK
try {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'quiz-app-ff0ab';
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!privateKey || !clientEmail) {
      console.warn('⚠️ Firebase Admin SDK credentials not found in environment variables');
    } else {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey,
            clientEmail,
          } as admin.ServiceAccount),
        });
        isInitialized = true;
        console.log('✅ Firebase Admin SDK initialized');
      } catch (error: any) {
        console.error('❌ Error initializing Firebase Admin SDK:', error.message);
      }
    }
  }
} catch (error: any) {
  console.warn('⚠️ Firebase Admin SDK initialization skipped:', error.message);
}

// Lazy getters that will throw only when actually used
export const db = isInitialized ? admin.firestore() : (null as any);
export const auth = isInitialized ? admin.auth() : (null as any);

// Delete Firebase Auth user
export async function deleteFirebaseUser(uid: string): Promise<boolean> {
  try {
    if (!auth) throw new Error('Firebase Admin SDK not initialized');
    await auth.deleteUser(uid);
    console.log(`✅ Successfully deleted Firebase Auth user: ${uid}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error deleting Firebase Auth user ${uid}:`, error.message);
    return false;
  }
}

// Create custom claims for user
export async function setUserClaims(uid: string, claims: Record<string, any>): Promise<boolean> {
  try {
    if (!auth) throw new Error('Firebase Admin SDK not initialized');
    await auth.setCustomUserClaims(uid, claims);
    console.log(`✅ Custom claims set for user ${uid}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error setting custom claims for user ${uid}:`, error.message);
    return false;
  }
}

// Get user by email
export async function getUserByEmail(email: string) {
  try {
    if (!auth) throw new Error('Firebase Admin SDK not initialized');
    const user = await auth.getUserByEmail(email);
    return user;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return null;
    }
    throw error;
  }
}
