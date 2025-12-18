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
    
    const response = await fetch(`${FIRESTORE_URL}/campuses`);
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Firestore error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    if (!data.documents) {
      return NextResponse.json({ campuses: [] });
    }
    
    let campuses = data.documents.map(parseDocument).map((doc: { id: string; data: Record<string, any> }) => ({
      id: doc.id,
      ...doc.data
    }));
    
    if (schoolId) {
      campuses = campuses.filter((campus: any) => campus.schoolId === schoolId);
    }
    
    return NextResponse.json({ campuses });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campuses', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, schoolId, schoolName, address, city } = body;
    
    if (!name || !schoolId) {
      return NextResponse.json(
        { error: 'Campus name and school are required' },
        { status: 400 }
      );
    }
    
    const campusData = {
      name,
      schoolId,
      schoolName: schoolName || '',
      address: address || '',
      city: city || '',
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalUsers: 0,
      totalStudents: 0,
      totalTeachers: 0,
      totalSchoolAdmins: 0,
      totalContentManagers: 0
    };
    
    const fields: Record<string, FirestoreValue> = {};
    for (const [key, value] of Object.entries(campusData)) {
      fields[key] = toFirestoreValue(value);
    }

    // Get Authorization header from request
    const authHeader = request.headers.get('authorization');
    
    const response = await fetch(`${FIRESTORE_URL}/campuses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
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
      campus: { id: parsed.id, ...parsed.data } 
    });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to create campus', details: error.message },
      { status: 500 }
    );
  }
}
