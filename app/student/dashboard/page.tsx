'use client';

import { useEffect, useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useRouter } from 'next/navigation';
import DashboardClient from './DashboardClient';

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

        await fetch('/api/student/link-postgres', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            name: user.name,
            schoolId: user.schoolId,
            assignedGrade: user.class || user.grade,
          }),
        }).catch(() => null);

        const response = await fetch(`/api/student/assigned-quizzes?studentId=${user.uid}`, {
          cache: 'no-store',
        });

        if (!response.ok) {
          setQuizAttempts([]);
          setUpcomingQuizzes([]);
          setStats({
            averageScore: 0,
            quizzesAttempted: 0,
            pendingQuizzes: 0,
            lastQuizScore: 0,
          });
          setHasFetched(true);
          return;
        }

        const data = await response.json();
        const studentAttempts = Array.isArray(data?.attempts) ? data.attempts : [];
        const assignments = Array.isArray(data?.assignments) ? data.assignments : [];

        const now = new Date();
        const upcoming = assignments.filter((q: any) => {
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
