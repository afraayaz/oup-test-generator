import { NextResponse } from 'next/server';

const FIREBASE_PROJECT_ID = 'quiz-app-ff0ab';

function parseFirestoreValue(value: any): any {
  if (value === null || value === undefined) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(parseFirestoreValue);
  }
  if ('mapValue' in value) {
    const result: any = {};
    const fields = value.mapValue.fields || {};
    for (const key in fields) {
      result[key] = parseFirestoreValue(fields[key]);
    }
    return result;
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId') || 'student_1';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/quizAttempts?pageSize=${limit}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firestore error:', errorText);
      return NextResponse.json({ attempts: [] });
    }

    const data = await response.json();
    const documents = data.documents || [];

    const attempts = documents.map((doc: any) => {
      const fields = doc.fields || {};
      const id = doc.name.split('/').pop();

      return {
        id,
        quizId: parseFirestoreValue(fields.quizId),
        quizTitle: parseFirestoreValue(fields.quizTitle),
        subject: parseFirestoreValue(fields.subject),
        class: parseFirestoreValue(fields.class),
        score: parseFirestoreValue(fields.score),
        totalMarks: parseFirestoreValue(fields.totalMarks),
        percentage: parseFirestoreValue(fields.percentage),
        studentId: parseFirestoreValue(fields.studentId),
        completedAt: parseFirestoreValue(fields.completedAt),
        timeTaken: parseFirestoreValue(fields.timeTaken),
        answers: parseFirestoreValue(fields.answers),
      };
    });

    const sortedAttempts = attempts.sort((a: any, b: any) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({ attempts: sortedAttempts });
  } catch (error) {
    console.error('Error fetching quiz attempts:', error);
    return NextResponse.json({ attempts: [] });
  }
}
