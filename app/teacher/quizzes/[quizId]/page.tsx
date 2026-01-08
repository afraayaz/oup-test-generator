'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';

interface StudentAttempt {
  id: string;
  studentId: string;
  studentName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  completedAt: string;
  isMarked: boolean;
  hasManualGrades: boolean;
}

export default function QuizDetailsPage() {
  const params = useParams();
  const quizId = params.quizId as string;
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quiz, setQuiz] = useState<any>(null);
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!quizId) return;

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/teacher/quizzes/${quizId}`);
        if (response.ok) {
          const data = await response.json();
          setQuiz(data.quiz);
          setAttempts(data.attempts || []);
        }
      } catch (error) {
        console.error('Error fetching quiz details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [quizId]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100 text-green-800';
    if (percentage >= 60) return 'bg-blue-100 text-blue-800';
    if (percentage >= 40) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  const handleDeleteQuiz = async () => {
    if (!confirm(`Are you sure you want to delete this quiz? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/teacher/quizzes/${quizId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Quiz deleted successfully');
        router.push('/teacher/quizzes');
      } else {
        const errorData = await response.json();
        alert(`Error deleting quiz: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert('Error deleting quiz');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole="Teacher" currentPage="Quizzes" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole="Teacher" currentPage="Quizzes" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 lg:ml-64 p-4 sm:p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quiz Not Found</h3>
            <p className="text-gray-500 mb-4">The quiz you're looking for doesn't exist.</p>
            <Link href="/teacher/quizzes">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Back to Quizzes
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="Teacher" currentPage="Quizzes" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex-1">
                <Link href="/teacher/quizzes">
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-1">← Back to Quizzes</button>
                </Link>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{quiz.title}</h1>
              </div>
            </div>
            <span className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
              quiz.quizFormat === 'Online'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {quiz.quizFormat === 'Online' ? 'Online' : 'Printable'}
            </span>
            <button
              onClick={handleDeleteQuiz}
              disabled={deleting}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                deleting
                  ? 'bg-red-300 text-red-700 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          {/* Quiz Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 shadow-md">
              <div className="text-sm text-purple-100 font-medium">Questions</div>
              <div className="text-2xl font-bold text-white">{quiz.totalQuestions}</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 shadow-md">
              <div className="text-sm text-blue-100 font-medium">Total Marks</div>
              <div className="text-2xl font-bold text-white">{quiz.totalMarks}</div>
            </div>
            {quiz.quizFormat === 'Online' && (
              <>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 shadow-md">
                  <div className="text-sm text-green-100 font-medium">Attempts</div>
                  <div className="text-2xl font-bold text-white">{attempts.length}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 shadow-md">
                  <div className="text-sm text-orange-100 font-medium">Avg Score</div>
                  <div className="text-2xl font-bold text-white">
                    {attempts.length > 0 
                      ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
                      : 0}%
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Show different content based on quiz format */}
          {quiz.quizFormat === 'Offline' ? (
            // Offline Quiz: Show Questions with Answer Keys
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Quiz Questions & Answer Key</h2>
                <div className="space-y-6">
                  {quiz.items?.map((item: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 flex-1">
                          Question {index + 1} <span className="text-sm text-gray-500 ml-2">({item.marks || 1} marks)</span>
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ml-2 ${
                          item.questionType === 'multiple' || item.questionType === 'mcqs'
                            ? 'bg-blue-100 text-blue-700'
                            : item.questionType === 'truefalse'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {item.questionType === 'multiple' || item.questionType === 'mcqs' ? 'MCQ' :
                           item.questionType === 'truefalse' ? 'True/False' :
                           item.questionType === 'fill' || item.questionType === 'fillblanks' ? 'Fill Blanks' : 'Other'}
                        </span>
                      </div>

                      <div className="mb-4">
                        <p className="text-gray-700">
                          {typeof item.question === 'object' ? item.question?.text : item.question}
                        </p>
                      </div>

                      {/* Show options for MCQ/True-False */}
                      {(item.questionType === 'multiple' || item.questionType === 'mcqs' || item.questionType === 'truefalse') && item.options && (
                        <div className="mb-4 pl-4 border-l-4 border-gray-300">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Options:</p>
                          <div className="space-y-1">
                            {item.options.map((option: any, optIdx: number) => (
                              <p key={optIdx} className="text-sm text-gray-600">
                                {String.fromCharCode(65 + optIdx)}. {option.text || option}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Answer Key */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <p className="text-sm font-semibold text-green-900 mb-2">✓ Answer Key:</p>
                        <p className="text-gray-700">
                          {item.questionType === 'multiple' || item.questionType === 'mcqs'
                            ? `${String.fromCharCode(65 + (item.answer?.value || 0))}. ${item.options?.[item.answer?.value]?.text || item.answer?.value}`
                            : item.questionType === 'truefalse'
                            ? item.answer?.value ? 'True' : 'False'
                            : typeof item.answer?.value === 'object'
                            ? Object.values(item.answer.value).join(', ')
                            : item.answer?.value || 'N/A'
                          }
                        </p>
                      </div>

                      {/* Explanation */}
                      {item.explanation && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm font-semibold text-blue-900 mb-2">💡 Explanation:</p>
                          <p className="text-gray-700">
                            {typeof item.explanation === 'object' ? item.explanation?.text : item.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Online Quiz: Show Student Attempts
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Student Attempts</h2>
              </div>

              {attempts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="font-medium">No students have attempted this quiz yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700">Student Name</th>
                        <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700">Score</th>
                        <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700">Percentage</th>
                        <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700">Date</th>
                        <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                        <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {attempts.map((attempt) => (
                        <tr key={attempt.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 sm:px-6 py-3 font-medium text-gray-900">{attempt.studentName}</td>
                          <td className="px-4 sm:px-6 py-3 text-gray-600">{attempt.score}/{attempt.totalMarks}</td>
                          <td className="px-4 sm:px-6 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getScoreColor(attempt.percentage)}`}>
                              {attempt.percentage}%
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-gray-600 text-xs">{formatDate(attempt.completedAt)}</td>
                          <td className="px-4 sm:px-6 py-3">
                            {attempt.isMarked ? (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Marked</span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Pending</span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-3">
                            <Link href={`/teacher/quizzes/${quizId}/review/${attempt.id}`}>
                              <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                                Review
                              </button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
