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
        console.log('[ASSIGNED-PAGE] No user UID found');
        setLoading(false);
        return;
      }

      console.log('[ASSIGNED-PAGE] Fetching quizzes for student UID:', user.uid);

      try {
        const response = await fetch(`/api/student/assigned-quizzes?studentId=${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          console.log('[ASSIGNED-PAGE] Received assignments:', data.assignments?.length);
          setQuizzes(data.assignments || []);
        }
      } catch (error) {
        console.error('Error fetching assigned quizzes:', error);
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
