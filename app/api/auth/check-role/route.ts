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

    // First try to fetch using uid (for newly created users with Firebase Auth)
    let response = await fetch(`${FIRESTORE_URL}/users/${uid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let userData = null;

    if (response.ok) {
      // Found by uid
      const data = await response.json();
      userData = data;
    } else {
      // If not found by uid, search by email (for old users without uid)
      const usersResponse = await fetch(`${FIRESTORE_URL}/users?pageSize=1000`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        const userDocs = usersData.documents || [];
        const userDoc = userDocs.find((doc: any) => {
          const emailValue = doc.fields?.email?.stringValue;
          return emailValue === email;
        });

        if (userDoc) {
          userData = userDoc;
        }
      }
    }

    if (!userData) {
      console.log(`User document not found for uid: ${uid}, email: ${email}`);
      return NextResponse.json(
        { role: null, message: 'User not found in database' },
        { status: 200 }
      );
    }

    const role = userData.fields?.role?.stringValue || null;

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
