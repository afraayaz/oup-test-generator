import { Suspense } from 'react';
import AssignedQuizzesClient from './AssignedQuizzesClient';

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

function parseValue(val: FirestoreValue | undefined): any {
  if (!val) return null;
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return parseInt(val.integerValue);
  if (val.doubleValue !== undefined) return val.doubleValue;
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.nullValue !== undefined) return null;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.arrayValue !== undefined) {
    return (val.arrayValue.values || []).map(parseValue);
  }
  if (val.mapValue !== undefined) {
    const result: Record<string, any> = {};
    for (const [key, v] of Object.entries(val.mapValue.fields || {})) {
      result[key] = parseValue(v);
    }
    return result;
  }
  return null;
}

async function getQuizzes() {
  try {
    const response = await fetch(FIRESTORE_URL, { cache: 'no-store' });
    
    if (!response.ok) {
      console.error('Failed to fetch quizzes:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.documents) {
      return [];
    }
    
    return data.documents
      .map((doc: any) => {
        const pathParts = doc.name.split('/');
        const id = pathParts[pathParts.length - 1];
        const fields = doc.fields || {};
        
        const getData = (key: string) => parseValue(fields[key]);
        
        return {
          id,
          title: getData('title') || 'Untitled Quiz',
          quizType: getData('quizType') || 'Quiz',
          quizFormat: getData('quizFormat') || 'Online',
          class: getData('class') || '',
          subject: getData('subject') || '',
          book: getData('book') || '',
          chapters: getData('chapters') || [],
          isMarked: getData('isMarked') || false,
          timeLimitMinutes: getData('timeLimitMinutes') || 30,
          schedule: getData('schedule') || { startAt: null, endAt: null },
          totalQuestions: getData('totalQuestions') || 0,
          totalMarks: getData('totalMarks') || 0,
          status: getData('status') || 'draft',
          createdAt: getData('createdAt'),
        };
      })
      .filter((quiz: any) => quiz.quizFormat === 'Online');
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return [];
  }
}

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mb-4"></div>
      <p className="text-gray-500">Loading quizzes...</p>
    </div>
  );
}

export default async function AssignedQuizzesPage() {
  const quizzes = await getQuizzes();
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AssignedQuizzesClient initialQuizzes={quizzes} />
    </Suspense>
  );
}
