import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { uid, email } = await request.json();

    if (!uid || !email) {
      return NextResponse.json(
        { error: 'Missing uid or email' },
        { status: 400 }
      );
    }

    // First try to fetch using uid (for newly created users with Firebase Auth)
    let userDoc = await db.collection('users').doc(uid).get();
    let userData = null;

    if (userDoc.exists) {
      userData = userDoc.data();
    } else {
      // If not found by uid, search by email (for old users without uid)
      const querySnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
      
      if (!querySnapshot.empty) {
        userData = querySnapshot.docs[0].data();
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
