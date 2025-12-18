'use client';

import Sidebar from '@/components/Sidebar';
import { useEffect, useState } from 'react';

interface QuizRecord {
  id: number;
  subject: string;
  score: number;
  date: string;
}

export default function QuizHistoryPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quizHistory, setQuizHistory] = useState<QuizRecord[]>([]);

  useEffect(() => {
    const storedHistory = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    setQuizHistory(storedHistory);
  }, []);

  const handleRetake = (id: number) => {
    alert(`Retaking quiz ID: ${id}`);
    // Add navigation or logic to retake quiz
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar userRole="Student" currentPage="progress" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quiz History</h1>
            <p className="text-sm text-gray-600">Review your past quiz performances and retake quizzes.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead className="bg-gray-100 text-gray-700 text-sm">
              <tr>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Score</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quizHistory.map((quiz) => (
                <tr key={quiz.id} className="border-t text-sm text-gray-800">
                  <td className="px-4 py-3">{quiz.subject}</td>
                  <td className="px-4 py-3">{quiz.score}%</td>
                  <td className="px-4 py-3">{quiz.date}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleRetake(quiz.id)}
                      className="min-w-[44px] min-h-[44px] text-blue-600 hover:underline px-3"
                    >
                      Retake
                    </button>
                  </td>
                </tr>
              ))}
              {quizHistory.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    No quiz history available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
