'use client';

import { useEffect, useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import AssignedQuizzesClient from './AssignedQuizzesClient';

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mb-4"></div>
      <p className="text-gray-500">Loading assigned quizzes...</p>
    </div>
  );
}

export default function AssignedPage() {
  const { user } = useUserProfile();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignedQuizzes = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
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

        const response = await fetch(`/api/student/assigned-quizzes?studentId=${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          setQuizzes(data.assignments || []);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedQuizzes();
  }, [user?.uid]);

  if (loading) {
    return <LoadingFallback />;
  }

  return <AssignedQuizzesClient initialQuizzes={quizzes} />;
}
