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
  reviewedBy?: string;
  reviewedAt?: string;
}

export default function MyQuestions() {
  const { user } = useUserProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: ''
  });

  // Fetch user's submitted questions
  const fetchMyQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      params.append('createdBy', user?.name || '');

      const response = await fetch(`/api/approval-queue?${params.toString()}`, {
        headers: {
          'x-user-id': user?.uid || '',
          'x-user-role': user?.role || '',
          'x-user-name': user?.name || '',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      } else {
        setQuestions([]);
      }
    } catch (error) {
      setQuestions([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user?.uid && user?.name) {
      fetchMyQuestions();
    }
  }, [user?.uid, user?.name, filter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-600';
      case 'rejected': return 'bg-red-100 text-red-600';
      case 'pending': return 'bg-yellow-100 text-yellow-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return 'ri-checkbox-circle-line';
      case 'rejected': return 'ri-close-circle-line';
      case 'pending': return 'ri-time-line';
      default: return 'ri-question-line';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'multiple': return 'bg-blue-100 text-blue-600';
      case 'truefalse': return 'bg-green-100 text-green-600';
      case 'short': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const stats = {
    total: questions.length,
    pending: questions.filter(q => q.status === 'pending').length,
    approved: questions.filter(q => q.status === 'approved').length,
    rejected: questions.filter(q => q.status === 'rejected').length,
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar userRole="Content Creator" currentPage="status" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
            >
              <i className="ri-menu-line text-2xl"></i>
            </button>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-teal-600 font-gibson-semibold">My Submitted Questions</h1>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <i className="ri-file-list-line text-2xl text-gray-400"></i>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <i className="ri-time-line text-2xl text-yellow-400"></i>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <i className="ri-checkbox-circle-line text-2xl text-green-400"></i>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <i className="ri-close-circle-line text-2xl text-red-400"></i>
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-4">
            <select
              value={filter.status}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-file-search-line text-4xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Found</h3>
              <p className="text-gray-500 mb-4">You haven't submitted any questions yet.</p>
              <a
                href="/content-creator/create"
                className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <i className="ri-add-line mr-2"></i>
                Create Your First Question
              </a>
            </div>
          ) : (
            <div className="grid gap-6">
              {questions.map((question) => (
                <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(question.type)}`}>
                        {question.type.toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(question.status)}`}>
                        <i className={getStatusIcon(question.status)}></i>
                        {question.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(question.submittedAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Question */}
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-900 mb-2">Question:</h3>
                    <p className="text-gray-700">{question.question}</p>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Subject:</span>
                      <p className="text-gray-900">{question.subject}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Grade:</span>
                      <p className="text-gray-900">{question.grade}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Book:</span>
                      <p className="text-gray-900">{question.book}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Chapter:</span>
                      <p className="text-gray-900">{question.chapter}</p>
                    </div>
                  </div>

                  {/* Feedback */}
                  {question.status !== 'pending' && question.feedback && (
                    <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <i className="ri-chat-3-line text-gray-400 mt-0.5"></i>
                        <div>
                          <p className="font-medium text-gray-700 text-sm">Reviewer Feedback:</p>
                          <p className="text-gray-600 text-sm mt-1">{question.feedback}</p>
                          {question.reviewedBy && question.reviewedAt && (
                            <p className="text-xs text-gray-500 mt-2">
                              Reviewed by {question.reviewedBy} on {new Date(question.reviewedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
