'use client';

import { useState, useEffect } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

interface Quiz {
  id: string;
  title: string;
  quizFormat: string;
  subject: string;
  class: string;
  totalQuestions: number;
  createdAt: string;
  totalMarks: number;
  studentAttempts?: number;
}

export default function TeacherQuizzesPage() {
  const { user } = useUserProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFormat, setFilterFormat] = useState<'all' | 'online' | 'offline'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [selectedQuizzes, setSelectedQuizzes] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchQuizzes = async () => {
      try {
        const response = await fetch(`/api/teacher/quizzes?teacherId=${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          setQuizzes(data.quizzes || []);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [user?.uid]);

  const handleDeleteQuiz = async (quizId: string, quizTitle: string) => {
    setMenuOpenId(null);
    if (!confirm(`Are you sure you want to delete "${quizTitle}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingQuizId(quizId);
    try {
      const response = await fetch(`/api/teacher/quizzes/${quizId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setQuizzes(quizzes.filter(q => q.id !== quizId));
        setSelectedQuizzes(prev => {
          const newSet = new Set(prev);
          newSet.delete(quizId);
          return newSet;
        });
        alert('Quiz deleted successfully');
      } else {
        const errorData = await response.json();
        alert(`Error deleting quiz: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert('Error deleting quiz');
    } finally {
      setDeletingQuizId(null);
    }
  };

  const handleSelectQuiz = (quizId: string) => {
    setSelectedQuizzes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(quizId)) {
        newSet.delete(quizId);
      } else {
        newSet.add(quizId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedQuizzes.size === filteredQuizzes.length) {
      setSelectedQuizzes(new Set());
    } else {
      setSelectedQuizzes(new Set(filteredQuizzes.map(q => q.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedQuizzes.size === 0) return;

    const count = selectedQuizzes.size;
    if (!confirm(`Are you sure you want to delete ${count} quiz${count > 1 ? 'es' : ''}? This action cannot be undone.`)) {
      return;
    }

    setIsDeletingBulk(true);
    const deletePromises = Array.from(selectedQuizzes).map(quizId =>
      fetch(`/api/teacher/quizzes/${quizId}`, { method: 'DELETE' })
    );

    try {
      const results = await Promise.all(deletePromises);
      const successfulDeletes = results.filter(r => r.ok).length;
      
      if (successfulDeletes > 0) {
        setQuizzes(quizzes.filter(q => !selectedQuizzes.has(q.id)));
        setSelectedQuizzes(new Set());
        alert(`Successfully deleted ${successfulDeletes} quiz${successfulDeletes > 1 ? 'es' : ''}`);
      }
      
      if (successfulDeletes < results.length) {
        alert(`Failed to delete ${results.length - successfulDeletes} quiz${results.length - successfulDeletes > 1 ? 'es' : ''}`);
      }
    } catch (error) {
      alert('Error deleting quizzes');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesFormat = filterFormat === 'all' || 
      (filterFormat === 'online' && quiz.quizFormat === 'Online') ||
      (filterFormat === 'offline' && quiz.quizFormat === 'Offline');
    
    const matchesSearch = searchQuery === '' ||
      quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quiz.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quiz.class.toString().includes(searchQuery);
    
    return matchesFormat && matchesSearch;
  });

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole="Teacher" currentPage="Quizzes" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="Teacher" currentPage="Quizzes" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-gibson-semibold">My Quizzes</h1>
            <p className="text-gray-600 mt-1">View and manage all your quizzes</p>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Search quizzes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Filter Tabs and Bulk Actions */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(['all', 'online', 'offline'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => setFilterFormat(format)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterFormat === format
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {format === 'all' ? 'All Quizzes' : format === 'online' ? 'Online' : 'Offline'}
                </button>
              ))}
            </div>
            
            {filteredQuizzes.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors text-sm"
                >
                  {selectedQuizzes.size === filteredQuizzes.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedQuizzes.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    disabled={isDeletingBulk}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                  >
                    {isDeletingBulk ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Selected ({selectedQuizzes.size})
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quizzes Grid */}
          {filteredQuizzes.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quizzes Found</h3>
              <p className="text-gray-500 mb-4">
                {filterFormat === 'all' 
                  ? "You haven't created any quizzes yet."
                  : `No ${filterFormat} quizzes created yet.`}
              </p>
              <Link href="/teacher/quiz">
                <button className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Create Your First Quiz
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className={`bg-white rounded-xl shadow-sm border-2 p-4 sm:p-6 hover:shadow-md transition-all relative ${
                    selectedQuizzes.has(quiz.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  {/* Checkbox for selection */}
                  <div className="absolute top-4 left-4">
                    <input
                      type="checkbox"
                      checked={selectedQuizzes.has(quiz.id)}
                      onChange={() => handleSelectQuiz(quiz.id)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  {/* Three-dot menu */}
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === quiz.id ? null : quiz.id)}
                      className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                      </svg>
                    </button>
                    
                    {menuOpenId === quiz.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        <Link href={`/teacher/quizzes/${quiz.id}`}>
                          <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                          disabled={deletingQuizId === quiz.id}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingQuizId === quiz.id ? (
                            <>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete Quiz
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between mb-3 pr-8 pl-8">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">{quiz.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ml-2 ${
                      quiz.quizFormat === 'Online'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {quiz.quizFormat === 'Online' ? 'Online' : 'Printable'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span>{quiz.subject} - Grade {quiz.class}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span>{quiz.totalQuestions} questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatDate(quiz.createdAt)}</span>
                    </div>
                    {quiz.quizFormat === 'Online' && quiz.studentAttempts !== undefined && (
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-medium text-blue-600">{quiz.studentAttempts} student{quiz.studentAttempts !== 1 ? 's' : ''} attempted</span>
                      </div>
                    )}
                  </div>

                  <Link href={`/teacher/quizzes/${quiz.id}`}>
                    <button className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                      {quiz.quizFormat === 'Online' ? 'View Results' : 'View Quiz'}
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
