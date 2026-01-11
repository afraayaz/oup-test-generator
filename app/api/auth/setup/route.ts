import { NextResponse } from 'next/server';
import { db, getDb, switchToSecondaryFirebase, resetToPrimaryFirebase } from '@/lib/firebaseAdmin';

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

    const { uid, email, role, displayName } = await request.json();

    if (!uid || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: uid, email, or role' },
        { status: 400 }
      );
    }

    // Create/update user document in Firestore using Admin SDK
    await db.collection('users').doc(uid).set({
      email,
      role,
      uid,
      createdAt: new Date().toISOString(),
      status: 'active',
      displayName: displayName || 'User',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    
    return NextResponse.json(
      {
        success: true,
        message: `${role} user record created successfully`,
        user: { uid, email, role }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating user record:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create user record' },
      { status: 500 }
    );
  }
}
