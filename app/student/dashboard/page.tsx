'use client';

import { useEffect, useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useRouter } from 'next/navigation';
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

export default function StudentDashboardPage() {
  const { user, loading } = useUserProfile();
  const router = useRouter();
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [upcomingQuizzes, setUpcomingQuizzes] = useState<any[]>([]);
  const [stats, setStats] = useState({
    averageScore: 0,
    quizzesAttempted: 0,
    pendingQuizzes: 0,
    lastQuizScore: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (loading) return;
    
    if (!user || user.role !== 'student') {
      router.push('/login');
      return;
    }

    // Prevent multiple fetches
    if (hasFetched) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch quiz attempts for this specific student only
        const attemptsUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/quizAttempts?pageSize=50`;
        const attemptsResponse = await fetch(attemptsUrl, { cache: 'no-store' });
        
        let studentAttempts: any[] = [];
        if (attemptsResponse.ok) {
          const attemptsData = await attemptsResponse.json();
          const documents = attemptsData.documents || [];
          
          // Filter to show only this student's attempts
          studentAttempts = documents
            .map((doc: any) => {
              const fields = doc.fields || {};
              const id = doc.name.split('/').pop();
              const studentId = parseFirestoreValue(fields.studentId || {});
              
              // Only include attempts by the current student
              if (studentId !== user.uid) return null;
              
              return {
                id,
                quizId: parseFirestoreValue(fields.quizId || {}) || '',
                quizTitle: parseFirestoreValue(fields.quizTitle || {}) || 'Quiz',
                subject: parseFirestoreValue(fields.subject || {}) || '',
                class: parseFirestoreValue(fields.class || {}) || '',
                score: parseFirestoreValue(fields.score || {}) || 0,
                totalMarks: parseFirestoreValue(fields.totalMarks || {}) || 0,
                percentage: parseFirestoreValue(fields.percentage || {}) || 0,
                isMarked: parseFirestoreValue(fields.isMarked || {}) || false,
                completedAt: parseFirestoreValue(fields.completedAt || {}),
              };
            })
            .filter(Boolean)
            .sort((a: any, b: any) => {
              const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
              const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
              return dateB - dateA;
            });
        }

        // Fetch quizzes for this student's school and grade only
        const quizzesUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/quizzes?pageSize=100`;
        const quizzesResponse = await fetch(quizzesUrl, { cache: 'no-store' });
        
        let filteredQuizzes: any[] = [];
        if (quizzesResponse.ok) {
          const quizzesData = await quizzesResponse.json();
          const documents = quizzesData.documents || [];
          
          // Filter quizzes by student's school and grade
          filteredQuizzes = documents
            .map((doc: any) => {
              const fields = doc.fields || {};
              const id = doc.name.split('/').pop();
              
              const quizSchoolId = parseFirestoreValue(fields.schoolId || {}) || '';
              const quizClass = parseFirestoreValue(fields.class || {}) || '';
              const schedule = parseFirestoreValue(fields.schedule || {}) || {};
              
              // Only show quizzes from the same school and grade
              if (quizSchoolId !== user.schoolId) return null;
              if (quizClass !== user.class && quizClass !== user.grade) return null;
              
              return {
                id,
                title: parseFirestoreValue(fields.title || {}) || 'Untitled Quiz',
                subject: parseFirestoreValue(fields.subject || {}) || 'General',
                class: quizClass,
                timeLimitMinutes: parseFirestoreValue(fields.timeLimitMinutes || {}) || 30,
                totalQuestions: parseFirestoreValue(fields.totalQuestions || {}) || 0,
                schedule: schedule
              };
            })
            .filter(Boolean);
        }

        const now = new Date();
        const upcoming = filteredQuizzes.filter((q: any) => {
          const startAt = q.schedule?.startAt;
          if (!startAt) return false;
          const startDate = new Date(startAt);
          return startDate > now;
        });

        const calculatedStats = {
          averageScore: studentAttempts.length > 0
            ? Math.round(studentAttempts.reduce((sum: number, a: any) => sum + (a.percentage || 0), 0) / studentAttempts.length)
            : 0,
          quizzesAttempted: studentAttempts.length,
          pendingQuizzes: upcoming.length,
          lastQuizScore: studentAttempts.length > 0 ? Math.round(studentAttempts[0]?.percentage || 0) : 0
        };

        setQuizAttempts(studentAttempts);
        setUpcomingQuizzes(upcoming);
        setStats(calculatedStats);
        setHasFetched(true);
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [loading, user?.uid, user?.schoolId, user?.class, user?.grade, user?.role, hasFetched, router]);

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <DashboardClient
      initialQuizHistory={quizAttempts}
      initialUpcomingQuizzes={upcomingQuizzes}
      initialStats={stats}
      studentName={user?.name || 'Student'}
    />
  );
}
