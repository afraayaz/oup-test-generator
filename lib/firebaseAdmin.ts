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
 *    - Save the JSON file in the project root
 * 
 * 3. The service account JSON file will be automatically loaded
 */

import admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

let isInitialized = false;

// Initialize Firebase Admin SDK
try {
  if (!admin.apps.length) {
    
    // Try to load from environment variables first
    let serviceAccount: admin.ServiceAccount | null = null;
    
    // Approach 1: Load from environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID || 'quiz-app-ff0ab';
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (privateKey && clientEmail) {
      serviceAccount = {
        projectId,
        privateKey,
        clientEmail,
      } as admin.ServiceAccount;
    } else {
      // Approach 2: Load from JSON file
      const possiblePaths = [
        path.join(process.cwd(), 'quiz-app-ff0ab-firebase-adminsdk-fbsvc-e0fea7198d.json'),
        path.join(__dirname, '../quiz-app-ff0ab-firebase-adminsdk-fbsvc-e0fea7198d.json'),
      ];

      for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          serviceAccount = JSON.parse(fileContent) as admin.ServiceAccount;
          break;
        }
      }
    }

    if (serviceAccount) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        isInitialized = true;
      } catch (error: any) {
        isInitialized = false;
      }
    } else {
    }
  } else {
    isInitialized = true;
  }
} catch (error: any) {
  isInitialized = false;
}

// Lazy getters that will throw only when actually used
export const db = isInitialized ? admin.firestore() : (null as any);
export const auth = isInitialized ? admin.auth() : (null as any);

// Fallback Firebase instance (secondary project for quota overflow)
let secondaryDb: any = null;
let secondaryAuth: any = null;
let useSecondaryDb = false;

// Initialize secondary Firebase (optional fallback)
export async function initializeSecondaryFirebase() {
  try {
    if (process.env.FIREBASE_PROJECT_ID_2 && process.env.FIREBASE_PRIVATE_KEY_2 && process.env.FIREBASE_CLIENT_EMAIL_2) {
      const secondaryServiceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID_2,
        privateKey: process.env.FIREBASE_PRIVATE_KEY_2.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL_2,
      } as admin.ServiceAccount;

      let secondaryApp;
      try {
        secondaryApp = admin.app('secondary');
      } catch (e) {
        secondaryApp = admin.initializeApp({
          credential: admin.credential.cert(secondaryServiceAccount),
        }, 'secondary');
      }

      secondaryDb = secondaryApp.firestore();
      secondaryAuth = secondaryApp.auth();
      return true;
    }
  } catch (error: any) {
  }
  return false;
}

// Wrapper to automatically fallback if primary quota is exceeded
export async function getDb() {
  if (useSecondaryDb && secondaryDb) {
    return secondaryDb;
  }
  return db;
}

// Wrapper to automatically fallback if primary quota is exceeded
// NOTE: Auth always uses primary because users are stored there
// Only database switches to secondary for quota overflow
export async function getAuth() {
  // Always return primary auth - don't switch on quota errors
  // Users are only stored in primary Firebase Auth
  return auth;
}

// Fallback handler - call this when you get a quota error
export function switchToSecondaryFirebase() {
  if (secondaryDb) {
    useSecondaryDb = true;
    return true;
  } else {
    return false;
  }
}

// Reset to primary Firebase
export function resetToPrimaryFirebase() {
  useSecondaryDb = false;
}

// Delete Firebase Auth user
export async function deleteFirebaseUser(uid: string): Promise<boolean> {
  try {
    if (!auth) throw new Error('Firebase Admin SDK not initialized');
    await auth.deleteUser(uid);
    return true;
  } catch (error: any) {
    return false;
  }
}

// Create custom claims for user
export async function setUserClaims(uid: string, claims: Record<string, any>): Promise<boolean> {
  try {
    if (!auth) throw new Error('Firebase Admin SDK not initialized');
    await auth.setCustomUserClaims(uid, claims);
    return true;
  } catch (error: any) {
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

// Initialize secondary Firebase on app startup

// Debug: Log initialization status
if (typeof window === 'undefined') {
}

// Global quota error handler wrapper
export function isQuotaError(error: any): boolean {
  return (
    error?.message?.includes('quota') ||
    error?.code === 'RESOURCE_EXHAUSTED' ||
    error?.message?.includes('RESOURCE_EXHAUSTED') ||
    error?.message?.includes('too many requests') ||
    error?.message?.includes('Quota exceeded')
  );
}

// Wrapper function for safe database operations with automatic fallback
export async function withQuotaFallback<T>(
  operation: (db: any) => Promise<T>,
  retryOperation?: (db: any) => Promise<T>
): Promise<T> {
  try {
    // Try with current database (primary or secondary if already switched)
    const currentDb = await getDb();
    return await operation(currentDb);
  } catch (error: any) {
    // If it's a quota error and we haven't switched yet, try secondary
    if (isQuotaError(error) && !useSecondaryDb && secondaryDb) {
      switchToSecondaryFirebase();
      
      try {
        const backupDb = await getDb();
        const result = retryOperation ? await retryOperation(backupDb) : await operation(backupDb);
        return result;
      } catch (retryError: any) {
        // Reset to primary for next attempt
        resetToPrimaryFirebase();
        throw retryError;
      }
    }
    
    throw error;
  }
}

/**
 * Safe write operation with automatic fallback to secondary on quota errors
 * Use this for: uploading questions, creating documents, writing data
 * 
 * Example:
 * await safeWrite(async (db) => {
 *   return db.collection('questions').doc(id).set(questionData);
 * });
 */
export async function safeWrite<T>(
  operation: (db: any) => Promise<T>
): Promise<T> {
  try {
    const currentDb = await getDb();
    const result = await operation(currentDb);
    return result;
  } catch (error: any) {
    // If quota error and not already switched, try secondary
    if (isQuotaError(error) && !useSecondaryDb && secondaryDb) {
      switchToSecondaryFirebase();
      
      try {
        const backupDb = await getDb();
        const result = await operation(backupDb);
        return result;
      } catch (retryError: any) {
        resetToPrimaryFirebase();
        throw retryError;
      }
    }
    throw error;
  }
}

/**
 * Safe read operation with automatic fallback to secondary on quota errors
 * Use this for: fetching questions, loading data, queries
 * 
 * Example:
 * const questions = await safeRead(async (db) => {
 *   return db.collection('questions').get();
 * });
 */
export async function safeRead<T>(
  operation: (db: any) => Promise<T>
): Promise<T> {
  try {
    const currentDb = await getDb();
    return await operation(currentDb);
  } catch (error: any) {
    if (isQuotaError(error) && !useSecondaryDb && secondaryDb) {
      switchToSecondaryFirebase();
      try {
        const backupDb = await getDb();
        return await operation(backupDb);
      } catch (retryError: any) {
        resetToPrimaryFirebase();
        throw retryError;
      }
    }
    throw error;
  }
}
