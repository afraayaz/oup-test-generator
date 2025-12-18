import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { uid, email } = await request.json();

    if (!uid || !email) {
      return NextResponse.json(
        { error: 'Missing uid or email' },
        { status: 400 }
      );
    }

    const PROJECT_ID = 'quiz-app-ff0ab';
    const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

    // Fetch user document from Firestore using REST API
    const response = await fetch(`${FIRESTORE_URL}/users/${uid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`User document not found for ${uid}`);
      return NextResponse.json(
        { role: null, message: 'User not found in database' },
        { status: 200 }
      );
    }

    const data = await response.json();
    const role = data.fields?.role?.stringValue || null;

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
