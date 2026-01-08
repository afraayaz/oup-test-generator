import { Suspense } from 'react';
import AssignedQuizzesClient from './AssignedQuizzesClient';

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

// Get current student ID from session/context
async function getStudentId() {
  // This would normally come from your auth/session system
  // For now, we'll pass it through the component
  return null;
}

async function getAssignedQuizzes(studentId: string) {
  try {
    if (!studentId) {
      return [];
    }

    // Get assignments for this student
    const assignmentsUrl = `${FIRESTORE_URL}/quizAssignments?pageSize=100`;
    const assignmentsResponse = await fetch(assignmentsUrl, { cache: 'no-store' });
    
    if (!assignmentsResponse.ok) {
      console.error('Failed to fetch assignments:', assignmentsResponse.status);
      return [];
    }
    
    const assignmentsData = await assignmentsResponse.json();
    const assignmentDocs = assignmentsData.documents || [];
    
    // Filter assignments for this student
    const studentAssignments = assignmentDocs
      .filter((doc: any) => {
        const fields = doc.fields || {};
        return parseValue(fields.studentId) === studentId;
      })
      .map((doc: any) => {
        const fields = doc.fields || {};
        return {
          assignmentId: doc.name.split('/').pop(),
          quizId: parseValue(fields.quizId),
          quizTitle: parseValue(fields.quizTitle),
          assignedAt: parseValue(fields.assignedAt),
          status: parseValue(fields.status),
          score: parseValue(fields.score),
          timeLimitMinutes: parseValue(fields.timeLimitMinutes),
          schedule: parseValue(fields.schedule),
        };
      });

    if (studentAssignments.length === 0) {
      return [];
    }

    // Fetch full quiz details for assigned quizzes
    const quizzesUrl = `${FIRESTORE_URL}/quizzes?pageSize=500`;
    const quizzesResponse = await fetch(quizzesUrl, { cache: 'no-store' });
    
    if (!quizzesResponse.ok) {
      return studentAssignments;
    }
    
    const quizzesData = await quizzesResponse.json();
    const quizzesDocs = quizzesData.documents || [];
    
    return studentAssignments
      .map((assignment: any) => {
        const quizDoc = quizzesDocs.find((doc: any) => 
          doc.name.split('/').pop() === assignment.quizId
        );
        
        if (!quizDoc) {
          return {
            id: assignment.assignmentId,
            quizId: assignment.quizId,
            title: assignment.quizTitle,
            status: assignment.status,
            assignedAt: assignment.assignedAt,
            score: assignment.score,
            quizFormat: 'Online',
            totalQuestions: 0,
            totalMarks: 0,
            timeLimitMinutes: assignment.timeLimitMinutes || 30,
            schedule: assignment.schedule || null,
          };
        }

        const fields = quizDoc.fields || {};
        return {
          id: assignment.assignmentId,
          quizId: assignment.quizId,
          title: parseValue(fields.title) || assignment.quizTitle,
          quizType: parseValue(fields.quizType),
          quizFormat: parseValue(fields.quizFormat) || 'Online',
          class: parseValue(fields.class),
          subject: parseValue(fields.subject),
          book: parseValue(fields.book),
          chapters: parseValue(fields.chapters) || [],
          isMarked: parseValue(fields.isMarked),
          timeLimitMinutes: assignment.timeLimitMinutes || parseValue(fields.timeLimitMinutes) || 30,
          schedule: assignment.schedule || parseValue(fields.schedule) || null,
          totalQuestions: parseValue(fields.totalQuestions) || 0,
          totalMarks: parseValue(fields.totalMarks) || 0,
          status: assignment.status,
          assignedAt: assignment.assignedAt,
          score: assignment.score,
        };
      })
      .filter((quiz: any) => quiz.quizFormat === 'Online');
  } catch (error) {
    console.error('Error fetching assigned quizzes:', error);
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

import AssignedPage from './AssignedPage';

export default function AssignedQuizzesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AssignedPage />
    </Suspense>
  );
}
