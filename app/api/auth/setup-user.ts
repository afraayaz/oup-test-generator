import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { uid, email, role, displayName, idToken } = await request.json();

    if (!uid || !email || !role || !idToken) {
      return NextResponse.json(
        { error: 'Missing required fields: uid, email, role, or idToken' },
        { status: 400 }
      );
    }

    const PROJECT_ID = 'quiz-app-ff0ab';
    const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

    // Create/update user document in Firestore using authenticated REST API
    const response = await fetch(`${FIRESTORE_URL}/users/${uid}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: {
          email: { stringValue: email },
          role: { stringValue: role },
          uid: { stringValue: uid },
          createdAt: { timestampValue: new Date().toISOString() },
          status: { stringValue: 'active' },
          displayName: { stringValue: displayName || 'User' }
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Firestore error:', errorData);
      return NextResponse.json(
        { error: `Failed to create user record: ${errorData.error?.message || 'Unknown error'}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
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
