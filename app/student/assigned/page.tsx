import { Suspense } from 'react';

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
