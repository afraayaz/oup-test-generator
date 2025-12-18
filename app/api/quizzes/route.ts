import { NextResponse } from 'next/server';

const PROJECT_ID = 'quiz-app-ff0ab';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/quizzes`;

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
  if (value.doubleValue !== undefined) return value.doubleValue;
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

export async function GET() {
  try {
    const response = await fetch(FIRESTORE_URL);
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Firestore error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    if (!data.documents) {
      return NextResponse.json({ quizzes: [] });
    }
    
    const quizzes = data.documents.map(parseDocument);
    
    return NextResponse.json({ quizzes });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quizzes', details: error.message },
      { status: 500 }
    );
  }
}
