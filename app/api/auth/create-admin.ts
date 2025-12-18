import { NextResponse } from 'next/server';

/**
 * This is a development helper endpoint to create an admin account
 * 
 * Usage (requires authentication):
 * POST /api/auth/create-admin
 * Body: { email: "admin@example.com", password: "password123" }
 * 
 * For production, use Firebase Admin SDK in a Cloud Function instead
 */

export async function POST(request: Request) {
  try {
    // TODO: Add authentication check here to prevent unauthorized use
    // For now, only allow requests from localhost in development
    
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create user in Firebase Auth using REST API
    const firebaseAuthUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp`;
    
    const authResponse = await fetch(firebaseAuthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    const authData = await authResponse.json();

    if (!authResponse.ok) {
      return NextResponse.json(
        { error: authData.error?.message || 'Failed to create user' },
        { status: 400 }
      );
    }

    // Now create the user record in Firestore with admin role
    const PROJECT_ID = 'quiz-app-ff0ab';
    const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

    const firestoreResponse = await fetch(`${FIRESTORE_URL}/users/${authData.localId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          email: { stringValue: email },
          role: { stringValue: 'Admin' },
          createdAt: { timestampValue: new Date().toISOString() },
          status: { stringValue: 'active' },
          uid: { stringValue: authData.localId },
        },
      }),
    });

    if (!firestoreResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to create user record in Firestore' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Admin account created successfully',
        email,
        userId: authData.localId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating admin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
