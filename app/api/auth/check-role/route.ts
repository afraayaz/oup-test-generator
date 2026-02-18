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
    console.log('📊 Starting user lookup for:', email, 'UID:', uid);

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
        console.log('⚠️ Primary database quota exceeded, switching to secondary database...');
        switchToSecondaryFirebase();
        
        try {
          const backupDb = await getDb();
          console.log('🔄 Checking secondary database for user:', email);
          let userDoc = await backupDb.collection('users').doc(uid).get();

          if (userDoc.exists) {
            userData = userDoc.data();
            console.log('✅ Found user in secondary database by UID:', uid);
          } else {
            console.log('🔍 User not found by UID, searching by email in secondary...');
            const querySnapshot = await backupDb.collection('users').where('email', '==', email).limit(1).get();
            if (!querySnapshot.empty) {
              userData = querySnapshot.docs[0].data();
              console.log('✅ Found user in secondary database by email:', email);
            } else {
              console.log('❌ User not found in secondary database');
            }
          }
          
          // Always reset to primary after checking secondary
          resetToPrimaryFirebase();
        } catch (retryError: any) {
          console.error('❌ Error accessing secondary database:', retryError);
          resetToPrimaryFirebase();
          
          // If both databases have quota exceeded, return a specific error
          if (isQuotaError(retryError)) {
            return NextResponse.json(
              { 
                error: 'Both primary and secondary databases have exceeded their quota limits. Please try again later or contact support.',
                quotaExceeded: true 
              },
              { status: 503 }
            );
          }
          
          throw retryError;
        }
      } else {
        throw error;
      }
    }

    const role = userData?.role || null;
    
    console.log('📋 Final result - Email:', email, 'Role:', role, 'UserData exists:', !!userData);
    
    return NextResponse.json({ role, email });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to check user role. Database may be temporarily unavailable.', details: error.message },
      { status: 500 }
    );
  }
}
