'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';

interface Question {
  questionId: string;
  questionType: string;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  marks: number;
  manualMarks?: number;
  status: string;
  explanation?: string;
  imageUrl?: string;
  cognitiveLevel?: {
    knowledge: boolean;
    understanding: boolean;
    application: boolean;
  };
}

interface ReviewData {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  studentName: string;
  originalScore: number;
  totalMarks: number;
  originalPercentage: number;
  questions: Question[];
}

export default function ReviewResultsPage() {
  const params = useParams();
  const quizId = params.quizId as string;
  const attemptId = params.attemptId as string;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [manualMarks, setManualMarks] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    if (!quizId || !attemptId) return;

    const fetchReview = async () => {
      try {
        const response = await fetch(`/api/teacher/quizzes/${quizId}/review/${attemptId}`);
        if (response.ok) {
          const data = await response.json();
          setReview(data);
          // Initialize manual marks from existing data
          const marks: { [key: number]: number } = {};
          data.questions.forEach((q: Question, idx: number) => {
            if (q.manualMarks !== undefined) {
              marks[idx] = q.manualMarks;
            }
          });
          setManualMarks(marks);
        }
      } catch (error) {
        console.error('Error fetching review:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [quizId, attemptId]);

  const handleSaveGrades = async () => {
    if (!review) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/teacher/quizzes/${quizId}/review/${attemptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualMarks, studentName: review.studentName }),
      });

      if (response.ok) {
        const data = await response.json();
        setReview(data.updated);
        alert('Grades saved successfully!');
      }
    } catch (error) {
      console.error('Error saving grades:', error);
      alert('Error saving grades');
    } finally {
      setSaving(false);
    }
  };

  const calculateNewScore = () => {
    if (!review || !review.questions) return 0;
    let newScore = 0;
    review.questions.forEach((q, idx) => {
      if (idx in manualMarks) {
        newScore += manualMarks[idx];
      } else if (q.isCorrect) {
        newScore += q.marks || 0;
      }
    });
    return newScore;
  };

  const newScore = calculateNewScore();
  const newPercentage = review ? Math.round((newScore / review.totalMarks) * 100) : 0;
  const scoreChanged = newScore !== review?.originalScore;

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

  if (!review) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole="Teacher" currentPage="Quizzes" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 lg:ml-64 p-4 sm:p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Result Not Found</h3>
            <p className="text-gray-500 mb-4">The result you're looking for doesn't exist.</p>
            <Link href={`/teacher/quizzes/${quizId}`}>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Back to Quiz
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex-1">
              <Link href={`/teacher/quizzes/${quizId}`}>
                <button className="text-purple-600 hover:text-purple-700 text-sm font-medium mb-1">← Back to Quiz</button>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-gibson-semibold">Review Result</h1>
              <p className="text-sm text-gray-500">Quiz: {review.quizTitle} | Student: {review.studentName}</p>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          {/* Score Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm text-gray-600">Original Score</div>
              <div className="text-2xl font-bold text-gray-900">{review.originalScore}/{review.totalMarks}</div>
              <div className="text-sm text-gray-500">{review.originalPercentage}%</div>
            </div>
            {scoreChanged && (
              <>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm text-gray-600">Updated Score</div>
                  <div className="text-2xl font-bold text-blue-600">{newScore}/{review.totalMarks}</div>
                  <div className="text-sm text-gray-500">{newPercentage}%</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-sm text-gray-600">Change</div>
                  <div className={`text-2xl font-bold ${newScore > review.originalScore ? 'text-green-600' : 'text-red-600'}`}>
                    {newScore > review.originalScore ? '+' : ''}{newScore - review.originalScore}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Questions Review */}
          <div className="space-y-4">
            {review.questions.map((question, idx) => (
              <div key={idx} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                {/* Question Header - Blue Background */}
                <div className="bg-blue-50 border-b border-blue-200 p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-blue-900">Question {idx + 1} ({question.questionType})</h3>
                      {question.cognitiveLevel && (question.cognitiveLevel.knowledge || question.cognitiveLevel.understanding || question.cognitiveLevel.application) && (
                        <div className="flex gap-1">
                          {question.cognitiveLevel.knowledge && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-300 rounded font-semibold">
                              Knowledge
                            </span>
                          )}
                          {question.cognitiveLevel.understanding && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 border border-green-300 rounded font-semibold">
                              Understanding
                            </span>
                          )}
                          {question.cognitiveLevel.application && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 border border-yellow-300 rounded font-semibold">
                              Application
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      question.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {question.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>
                  <p className="text-blue-900 mb-3">{question.questionText}</p>
                  
                  {/* Display question image if available */}
                  {question.imageUrl && (
                    <div className="mt-3">
                      <img 
                        src={question.imageUrl} 
                        alt="Question illustration" 
                        className="max-w-full h-auto rounded-lg border border-blue-300 shadow-sm"
                        style={{ maxHeight: '400px' }}
                      />
                    </div>
                  )}
                </div>

                {/* Student Answer - Amber Background */}
                <div className="bg-amber-50 border-b border-amber-200 p-4 sm:p-6">
                  <label className="text-sm font-bold text-amber-900 block mb-2">📝 Student's Answer:</label>
                  <p className="text-amber-900 bg-white border border-amber-200 rounded p-3">{question.userAnswer ?? 'No answer provided'}</p>
                </div>

                {/* Correct Answer - Green Background (only if wrong) */}
                {!question.isCorrect && (
                  <div className="bg-green-50 border-b border-green-200 p-4 sm:p-6">
                    <label className="text-sm font-bold text-green-900 block mb-2">✓ Correct Answer:</label>
                    <p className="text-green-900 bg-white border border-green-200 rounded p-3">{question.correctAnswer}</p>
                  </div>
                )}

                {/* Explanation - Purple Background */}
                {question.explanation && (
                  <div className="bg-purple-50 border-b border-purple-200 p-4 sm:p-6">
                    <label className="text-sm font-bold text-purple-900 block mb-2">💡 Explanation:</label>
                    <p className="text-purple-900 bg-white border border-purple-200 rounded p-3">{question.explanation}</p>
                  </div>
                )}

                {/* Manual Grading Section - Gray Background */}
                {question.questionType.toLowerCase().includes('short') || question.questionType.toLowerCase().includes('long') ? (
                  <div className="bg-gray-50 border-t border-gray-200 p-4 sm:p-6">
                    <label className="text-sm font-bold text-gray-900 block mb-2">
                      ✏️ Manual Grade (out of {question.marks}):
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={question.marks}
                      value={manualMarks[idx] ?? ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        if (value >= 0 && value <= question.marks) {
                          setManualMarks(prev => ({
                            ...prev,
                            [idx]: value
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter marks"
                    />
                  </div>
                ) : (
                  <div className="bg-gray-50 border-t border-gray-200 p-4 sm:p-6">
                    <div className="text-sm text-gray-700 mb-3">
                      <span className="font-bold">Status:</span> Auto-graded - {question.isCorrect ? 'Marked Correct' : 'Marked Incorrect'}
                    </div>
                    {!question.isCorrect && (
                      <div>
                        <label className="text-sm font-medium text-gray-900 block mb-2">
                          Mark as Correct? ({question.marks} marks):
                        </label>
                        <button
                          onClick={() => setManualMarks(prev => ({
                            ...prev,
                            [idx]: question.marks
                          }))}
                          className={`px-3 py-2 rounded text-sm font-medium ${
                            manualMarks[idx] === question.marks
                              ? 'bg-green-200 text-green-800'
                              : 'bg-white border border-green-200 text-green-700 hover:bg-green-50'
                          }`}
                        >
                          ✓ Mark Correct
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Save Button */}
          {scoreChanged && (
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSaveGrades}
                disabled={saving}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  saving
                    ? 'bg-blue-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saving ? 'Saving...' : 'Save Grades'}
              </button>
              <p className="text-sm text-blue-600 flex items-center">
                New score: <span className="font-bold ml-2">{newScore}/{review.totalMarks} ({newPercentage}%)</span>
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
