import { NextResponse } from 'next/server';

const PROJECT_ID = 'quiz-app-ff0ab';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
  nullValue?: null;
}

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
}

function parseFirestoreValue(value: FirestoreValue): any {
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

function parseDocument(doc: FirestoreDocument): { id: string; data: Record<string, any> } {
  const pathParts = doc.name.split('/');
  const id = pathParts[pathParts.length - 1];
  
  const data: Record<string, any> = {};
  for (const [key, value] of Object.entries(doc.fields || {})) {
    data[key] = parseFirestoreValue(value);
  }
  
  return { id, data };
}

function toFirestoreValue(value: any): FirestoreValue {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const campusId = searchParams.get('campusId');
    const role = searchParams.get('role');
    
    const response = await fetch(`${FIRESTORE_URL}/users`);
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Firestore error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    if (!data.documents) {
      return NextResponse.json({ users: [] });
    }
    
    let users = data.documents.map(parseDocument).map((doc: { id: string; data: Record<string, any> }) => ({
      id: doc.id,
      ...doc.data
    }));
    
    if (schoolId) {
      users = users.filter((user: any) => user.schoolId === schoolId);
    }
    
    if (campusId) {
      users = users.filter((user: any) => user.campusId === campusId);
    }
    
    if (role) {
      users = users.filter((user: any) => user.role === role);
    }
    
    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      name, 
      email, 
      password,
      role, 
      schoolId, 
      schoolName,
      campusId,
      campusName,
      grade,
      section,
      rollNumber,
      subjects,
      assignedClasses,
      assignedGrades,
      assignedBooks,
      userType
    } = body;
    
    // Validate required fields - school is only required for school users
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are required' },
        { status: 400 }
      );
    }

    if (userType === 'school' && !schoolId) {
      return NextResponse.json(
        { error: 'School is required for school users' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }
    
    const validRoles = ['school_admin', 'teacher', 'student', 'content_manager', 'content_creator', 'oup_admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: school_admin, teacher, student, content_manager, content_creator, oup_admin' },
        { status: 400 }
      );
    }
    
    const existingUsersResponse = await fetch(`${FIRESTORE_URL}/users`);
    if (existingUsersResponse.ok) {
      const existingData = await existingUsersResponse.json();
      if (existingData.documents) {
        const existingUsers = existingData.documents.map(parseDocument);
        const emailExists = existingUsers.some((u: any) => u.data.email === email);
        if (emailExists) {
          return NextResponse.json(
            { error: 'A user with this email already exists' },
            { status: 400 }
          );
        }
      }
    }

    // Create Firebase Auth account
    let uid = '';
    try {
      const firebaseApiKey = 'AIzaSyDdsApeXM5WsHTcx4sLVJ37dAwxOjBMTu8'; // quiz-app-ff0ab API key
      const firebaseAuthUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseApiKey}`;
      
      const authResponse = await fetch(firebaseAuthUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      });

      if (!authResponse.ok) {
        const authError = await authResponse.json();
        throw new Error(authError.error?.message || 'Failed to create Firebase Auth account');
      }

      const authData = await authResponse.json();
      uid = authData.localId;
    } catch (authError: any) {
      return NextResponse.json(
        { error: `Failed to create user account: ${authError.message}` },
        { status: 400 }
      );
    }
    
    const userData: Record<string, any> = {
      uid,
      name,
      email,
      role,
      schoolId: schoolId || '',
      schoolName: schoolName || '',
      campusId: campusId || '',
      campusName: campusName || '',
      userType: userType || 'school',
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      lastActive: ''
    };
    
    if (role === 'student') {
      userData.grade = grade || '';
      userData.section = section || '';
      userData.rollNumber = rollNumber || '';
      userData.class = grade || '';
    }
    
    if (role === 'teacher') {
      userData.subjects = subjects || [];
      userData.assignedClasses = assignedClasses || [];
      userData.assignedGrades = assignedGrades || [];
      userData.assignedBooks = assignedBooks || [];
    }
    
    if (role === 'content_manager' || role === 'content_creator') {
      userData.subjects = subjects || [];
      userData.assignedBooks = assignedBooks || [];
    }
    
    const fields: Record<string, FirestoreValue> = {};
    for (const [key, value] of Object.entries(userData)) {
      fields[key] = toFirestoreValue(value);
    }
    
    const response = await fetch(`${FIRESTORE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Firestore error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
    
    const createdDoc = await response.json();
    const parsed = parseDocument(createdDoc);
    
    return NextResponse.json({ 
      success: true, 
      user: { id: parsed.id, ...parsed.data } 
    });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to create user', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    updateData.updatedAt = new Date().toISOString();
    
    const fields: Record<string, FirestoreValue> = {};
    for (const [key, value] of Object.entries(updateData)) {
      fields[key] = toFirestoreValue(value);
    }
    
    const response = await fetch(`${FIRESTORE_URL}/users/${id}?updateMask.fieldPaths=${Object.keys(updateData).join('&updateMask.fieldPaths=')}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Firestore error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
    
    const updatedDoc = await response.json();
    const parsed = parseDocument(updatedDoc);
    
    return NextResponse.json({ 
      success: true, 
      user: { id: parsed.id, ...parsed.data } 
    });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to update user', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${FIRESTORE_URL}/users/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Firestore error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user', details: error.message },
      { status: 500 }
    );
  }
}
