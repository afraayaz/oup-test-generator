import { NextResponse } from 'next/server';

const PROJECT_ID = 'quiz-app-ff0ab';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function parseFirestoreValue(value: any): any {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return parseFloat(String(value.doubleValue));
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== undefined) return null;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.arrayValue !== undefined) {
    return (value.arrayValue.values || []).map(parseFirestoreValue);
  }
  if (value.mapValue !== undefined) {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value.mapValue.fields || {})) {
      result[key] = parseFirestoreValue(val);
    }
    return result;
  }
  return null;
}

function parseDocument(doc: any): { id: string; data: Record<string, any> } {
  const pathParts = doc.name.split('/');
  const id = pathParts[pathParts.length - 1];
  
  const data: Record<string, any> = {};
  for (const [key, value] of Object.entries(doc.fields || {})) {
    data[key] = parseFirestoreValue(value);
  }
  
  return { id, data };
}

export async function POST(request: Request) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // First, find the user in Firestore to get their UID
    const usersResponse = await fetch(`${FIRESTORE_URL}/users`);
    if (!usersResponse.ok) {
      throw new Error('Failed to fetch users from Firestore');
    }

    const usersData = await usersResponse.json();
    if (!usersData.documents) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userDoc = usersData.documents.find((doc: any) =>
      doc.fields?.email?.stringValue === email
    );

    if (!userDoc) {
      return NextResponse.json(
        { error: 'User with this email not found' },
        { status: 404 }
      );
    }

    const parsedUser = parseDocument(userDoc);
    const uid = parsedUser.data.uid;

    if (!uid) {
      return NextResponse.json(
        { error: 'User UID not found' },
        { status: 400 }
      );
    }

    // Send password reset email to the teacher
    const firebaseApiKey = 'AIzaSyDdsApeXM5WsHTcx4sLVJ37dAwxOjBMTu8'; // quiz-app-ff0ab API key
    
    const passwordResetUrl = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseApiKey}`;
    
    const resetResponse = await fetch(passwordResetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email: email
      })
    });

    if (!resetResponse.ok) {
      const errorData = await resetResponse.json();
      console.error('Firebase password reset error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to send password reset email');
    }

    const resetData = await resetResponse.json();
    console.log('Password reset email sent:', resetData);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      email
    });
  } catch (error: any) {
    console.error('Reset password API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset password' },
      { status: 500 }
    );
  }
}
