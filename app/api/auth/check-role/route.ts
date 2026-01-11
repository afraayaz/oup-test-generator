import { NextResponse } from 'next/server';
import { getDb, switchToSecondaryFirebase, resetToPrimaryFirebase, isQuotaError } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Check if Firebase is properly initialized
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const { uid, email } = await request.json();

    if (!uid || !email) {
      return NextResponse.json(
        { error: 'Missing uid or email' },
        { status: 400 }
      );
    }

    let userData = null;
    const currentDb = await getDb();

    try {
      // First try to fetch using uid (for newly created users with Firebase Auth)
      let userDoc = await currentDb.collection('users').doc(uid).get();

      if (userDoc.exists) {
        userData = userDoc.data();
      } else {
        // If not found by uid, search by email (for old users without uid)
        const querySnapshot = await currentDb.collection('users').where('email', '==', email).limit(1).get();
        
        if (!querySnapshot.empty) {
          userData = querySnapshot.docs[0].data();
        }
      }

      resetToPrimaryFirebase();
    } catch (error: any) {
      // If quota error and we haven't switched yet, try secondary
      if (isQuotaError(error)) {
        console.warn('⚠️ Quota error in check-role, attempting secondary Firebase');
        switchToSecondaryFirebase();
        
        try {
          const backupDb = await getDb();
          let userDoc = await backupDb.collection('users').doc(uid).get();

          if (userDoc.exists) {
            userData = userDoc.data();
          } else {
            const querySnapshot = await backupDb.collection('users').where('email', '==', email).limit(1).get();
            if (!querySnapshot.empty) {
              userData = querySnapshot.docs[0].data();
            }
          }

          console.log('✅ Successfully fetched user from secondary Firebase');
        } catch (retryError: any) {
          console.error('❌ Secondary Firebase also failed:', retryError.message);
          resetToPrimaryFirebase();
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    if (!userData) {
      console.log(`User document not found for uid: ${uid}, email: ${email}`);
      return NextResponse.json(
        { role: null, message: 'User not found in database' },
        { status: 200 }
      );
    }

    const role = userData.role || null;
    return NextResponse.json(
      { role, email },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking user role:', error);
    return NextResponse.json(
      { error: 'Failed to check user role' },
      { status: 500 }
    );
  }
}
