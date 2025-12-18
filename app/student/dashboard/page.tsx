import DashboardClient from './DashboardClient';

const FIREBASE_PROJECT_ID = 'quiz-app-ff0ab';

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

function parseFirestoreValue(value: FirestoreValue): any {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue, 10);
  if (value.doubleValue !== undefined) return typeof value.doubleValue === 'string' ? parseFloat(value.doubleValue) : value.doubleValue;
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

async function fetchUserProfile() {
  try {
    // Try to fetch with a filter for student role using structured query
    // First, attempt to fetch all users with student role by checking documents
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users?pageSize=100`;
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      return { name: 'Student', email: '' };
    }
    
    const data = await response.json();
    const documents = data.documents || [];
    
    if (documents.length === 0) {
      return { name: 'Student', email: '' };
    }

    // Find the first student user with role='student'
    for (const doc of documents) {
      const fields = doc.fields || {};
      const role = parseFirestoreValue(fields.role || {});
      
      if (role === 'student') {
        const userName = parseFirestoreValue(fields.name || {}) || 'Student';
        // Extract just the first name if it contains a space
        const firstName = userName.split(' ')[0] || 'Student';
        return {
          name: firstName,
          email: parseFirestoreValue(fields.email || {}) || ''
        };
      }
    }

    // If no student found, return default
    return { name: 'Student', email: '' };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { name: 'Student', email: '' };
  }
}

async function fetchQuizAttempts() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/quizAttempts?pageSize=50`;
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    const documents = data.documents || [];
    
    return documents.map((doc: any) => {
      const fields = doc.fields || {};
      const id = doc.name.split('/').pop();
      
      return {
        id,
        quizId: parseFirestoreValue(fields.quizId || {}) || '',
        quizTitle: parseFirestoreValue(fields.quizTitle || {}) || 'Quiz',
        subject: parseFirestoreValue(fields.subject || {}) || '',
        class: parseFirestoreValue(fields.class || {}) || '',
        score: parseFirestoreValue(fields.score || {}) || 0,
        totalMarks: parseFirestoreValue(fields.totalMarks || {}) || 0,
        percentage: parseFirestoreValue(fields.percentage || {}) || 0,
        completedAt: parseFirestoreValue(fields.completedAt || {}),
      };
    }).sort((a: any, b: any) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error fetching quiz attempts:', error);
    return [];
  }
}

async function fetchQuizzes() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/quizzes?pageSize=100`;
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    const documents = data.documents || [];
    
    return documents.map((doc: any) => {
      const fields = doc.fields || {};
      const id = doc.name.split('/').pop();
      
      const data: Record<string, any> = {};
      for (const [key, val] of Object.entries(fields)) {
        data[key] = parseFirestoreValue(val as FirestoreValue);
      }
      
      return { id, data };
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return [];
  }
}

export default async function StudentDashboardPage() {
  const [quizAttempts, allQuizzes, userProfile] = await Promise.all([
    fetchQuizAttempts(),
    fetchQuizzes(),
    fetchUserProfile()
  ]);

  const now = new Date();
  const upcomingQuizzes = allQuizzes.filter((q: any) => {
    const startAt = q.data?.schedule?.startAt;
    if (!startAt) return false;
    const startDate = new Date(startAt);
    return startDate > now;
  }).map((q: any) => ({
    id: q.id,
    title: q.data?.title || 'Untitled Quiz',
    subject: q.data?.subject || 'General',
    class: q.data?.class || '',
    timeLimitMinutes: q.data?.timeLimitMinutes || 30,
    totalQuestions: q.data?.totalQuestions || 0,
    schedule: q.data?.schedule || {}
  }));

  const stats = {
    averageScore: quizAttempts.length > 0
      ? Math.round(quizAttempts.reduce((sum: number, a: any) => sum + (a.percentage || 0), 0) / quizAttempts.length)
      : 0,
    quizzesAttempted: quizAttempts.length,
    pendingQuizzes: upcomingQuizzes.length,
    lastQuizScore: quizAttempts.length > 0 ? Math.round(quizAttempts[0]?.percentage || 0) : 0
  };

  return (
    <DashboardClient
      initialQuizHistory={quizAttempts}
      initialUpcomingQuizzes={upcomingQuizzes}
      initialStats={stats}
      studentName={userProfile.name}
    />
  );
}
