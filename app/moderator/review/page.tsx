'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useUserProfile } from '@/hooks/useUserProfile';

interface Question {
  id: string;
  question: string;
  type: string;
  subject: string;
  grade: string;
  book: string;
  chapter: string;
  difficulty: string;
  explanation: string;
  options?: string[];
  correctAnswer?: string;
  possibleAnswers?: string[];
  createdBy: string;
  createdAt: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
}

export default function ReviewQueue() {
  const { user } = useUserProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState({
    status: 'pending'
  });
  const [userSubjects, setUserSubjects] = useState<string[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Fetch questions from approval queue with timeout and error handling
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setConnectionError(null);
      
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);

      // Add timeout to fetch request
      const timeoutMs = 15000; // 15 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`/api/approval-queue?${params.toString()}`, {
        signal: controller.signal,
        headers: {
          'x-user-id': user?.uid || '',
          'x-user-role': user?.role || '',
          'x-user-name': user?.name || '',
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
        setUserSubjects(data.userSubjects || []);
      } else {
        console.error('Failed to fetch questions');
        setQuestions([]);
        setConnectionError('Failed to load questions. Please refresh to try again.');
      }
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      setQuestions([]);
      
      if (error.name === 'AbortError') {
        setConnectionError('Request timed out. Please check your internet connection and refresh.');
      } else if (error.message?.includes('ECONNRESET') || error.message?.includes('ENETUNREACH')) {
        setConnectionError('Network connection error. Please check your internet connection.');
      } else {
        setConnectionError('Error loading questions. Please refresh to try again.');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user?.uid) {
      fetchQuestions();
    }
  }, [user?.uid, filter]);

  // Handle approve/reject with timeout and retry logic
  const handleAction = async (questionId: string, action: 'approve' | 'reject') => {
    try {
      setProcessing(true);
      
      // Create a timeout promise
      const timeoutMs = 30000; // 30 seconds
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout - please check your connection')), timeoutMs)
      );
      
      // Create the actual request promise
      const requestPromise = fetch('/api/approval-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || '',
          'x-user-role': user?.role || '',
          'x-user-name': user?.name || '',
        },
        body: JSON.stringify({
          questionId,
          action,
          feedback
        })
      });

      // Race between timeout and actual request
      const response = await Promise.race([requestPromise, timeoutPromise]) as Response;

      if (response.ok) {
        const data = await response.json();
        alert(`Question ${action}d successfully!`);
        setSelectedQuestion(null);
        setFeedback('');
        fetchQuestions(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to process request');
      }
    } catch (error: any) {
      console.error('Error processing action:', error);
      
      if (error.message?.includes('timeout')) {
        alert('Request timed out. This may be due to network connectivity issues. The action might still be processed - please refresh to check the status.');
      } else if (error.message?.includes('ECONNRESET') || error.message?.includes('ENETUNREACH')) {
        alert('Network connection error. Please check your internet connection and try again.');
      } else {
        alert('Error processing request: ' + (error.message || 'Unknown error'));
      }
    }
    setProcessing(false);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'multiple': return 'bg-blue-100 text-blue-600';
      case 'truefalse': return 'bg-green-100 text-green-600';
      case 'short': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-600';
      case 'medium': return 'bg-yellow-100 text-yellow-600';
      case 'hard': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar userRole="Moderator" currentPage="review" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
            >
              <i className="ri-menu-line text-2xl"></i>
            </button>
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-teal-600">Question Review Queue</h1>
              {userSubjects.length > 0 && (
                <p className="text-sm text-gray-600">
                  Managing: {userSubjects.join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-4">
            <select
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Questions List */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Questions ({questions.length})</h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading questions...</p>
                </div>
              ) : connectionError ? (
                <div className="text-center py-8">
                  <i className="ri-wifi-off-line text-4xl mb-2 text-red-400"></i>
                  <p className="text-red-600 mb-4">{connectionError}</p>
                  <button
                    onClick={fetchQuestions}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    <i className="ri-refresh-line mr-2"></i>
                    Retry
                  </button>
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="ri-file-list-line text-4xl mb-2"></i>
                  <p>No questions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((question) => (
                    <div
                      key={question.id}
                      onClick={() => setSelectedQuestion(question)}
                      className={`p-4 border border-gray-200 rounded-lg cursor-pointer transition-colors hover:border-teal-300 ${
                        selectedQuestion?.id === question.id ? 'border-teal-500 bg-teal-50' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(question.type)}`}>
                          {question.type.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty}
                        </span>
                      </div>
                      
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                        {question.question}
                      </h3>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{question.subject} - {question.grade}</span>
                        <span>{new Date(question.submittedAt).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-400">
                        By: {question.createdBy}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Question Preview & Actions */}
          <div className="w-1/2 overflow-y-auto">
            {selectedQuestion ? (
              <div className="p-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  {/* Question Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(selectedQuestion.type)}`}>
                        {selectedQuestion.type.toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(selectedQuestion.difficulty)}`}>
                        {selectedQuestion.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Question Details */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Question:</h3>
                      <p className="text-gray-900">{selectedQuestion.question}</p>
                    </div>

                    {/* Options for MCQ */}
                    {selectedQuestion.type === 'multiple' && selectedQuestion.options && (
                      <div>
                        <h3 className="font-medium text-gray-700 mb-1">Options:</h3>
                        <ul className="space-y-1">
                          {selectedQuestion.options.map((option, index) => (
                            <li
                              key={index}
                              className={`p-2 rounded border ${
                                option === selectedQuestion.correctAnswer
                                  ? 'bg-green-50 border-green-200 text-green-700'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              {String.fromCharCode(65 + index)}. {option}
                              {option === selectedQuestion.correctAnswer && (
                                <span className="ml-2 text-green-600">✓ Correct</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Correct Answer for True/False */}
                    {selectedQuestion.type === 'truefalse' && (
                      <div>
                        <h3 className="font-medium text-gray-700 mb-1">Correct Answer:</h3>
                        <p className="text-gray-900">{selectedQuestion.correctAnswer ? 'True' : 'False'}</p>
                      </div>
                    )}

                    {/* Possible Answers for Short Answer */}
                    {selectedQuestion.type === 'short' && selectedQuestion.possibleAnswers && (
                      <div>
                        <h3 className="font-medium text-gray-700 mb-1">Possible Answers:</h3>
                        <ul className="space-y-1">
                          {selectedQuestion.possibleAnswers.map((answer, index) => (
                            <li key={index} className="p-2 bg-gray-50 border border-gray-200 rounded">
                              {answer}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Explanation */}
                    {selectedQuestion.explanation && (
                      <div>
                        <h3 className="font-medium text-gray-700 mb-1">Explanation:</h3>
                        <p className="text-gray-900">{selectedQuestion.explanation}</p>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Subject:</span>
                        <p className="text-gray-900">{selectedQuestion.subject}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Grade:</span>
                        <p className="text-gray-900">{selectedQuestion.grade}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Book:</span>
                        <p className="text-gray-900">{selectedQuestion.book}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Chapter:</span>
                        <p className="text-gray-900">{selectedQuestion.chapter}</p>
                      </div>
                    </div>

                    <div className="text-sm text-gray-500">
                      <p><strong>Created by:</strong> {selectedQuestion.createdBy}</p>
                      <p><strong>Submitted:</strong> {new Date(selectedQuestion.submittedAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  {selectedQuestion.status === 'pending' && (
                    <div className="border-t pt-4">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Feedback (optional):
                        </label>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          placeholder="Add feedback for the content creator..."
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAction(selectedQuestion.id, 'approve')}
                          disabled={processing}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {processing ? 'Processing...' : '✓ Approve'}
                        </button>
                        <button
                          onClick={() => handleAction(selectedQuestion.id, 'reject')}
                          disabled={processing}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {processing ? 'Processing...' : '✗ Reject'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Status Badge for non-pending questions */}
                  {selectedQuestion.status !== 'pending' && (
                    <div className="border-t pt-4">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedQuestion.status === 'approved' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {selectedQuestion.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                      </div>
                      {selectedQuestion.feedback && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700"><strong>Feedback:</strong> {selectedQuestion.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <i className="ri-file-search-line text-4xl mb-2"></i>
                  <p>Select a question to review</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}