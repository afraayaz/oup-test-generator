'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { db } from '@/firebase/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface Question {
  id: string;
  type: string;
  subject: string;
  grade: string;
  chapter: string;
  book: string;
  content: string;
  options: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdBy: string;
  createdByName: string;
  createdAt: any;
}

export default function TeacherQuestionBankPage() {
  const { user } = useUserProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const [filters, setFilters] = useState({
    grade: '',
    subject: '',
    book: '',
    chapter: ''
  });

  useEffect(() => {
    if (user?.schoolId) {
      fetchAllQuestions();
    }
  }, [user?.schoolId]);

  useEffect(() => {
    applyFilters();
  }, [allQuestions, filters, user]);

  const fetchAllQuestions = async () => {
    try {
      setLoading(true);
      const schoolId = user?.schoolId;
      const questionsRef = collection(db, `questions/schools/${schoolId}`);
      
      const snapshot = await getDocs(questionsRef);
      const questions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Question[];

      setAllQuestions(questions);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = allQuestions;

    // Filter by grade
    if (filters.grade) {
      filtered = filtered.filter(q => q.grade === filters.grade);
    }

    // Filter by subject
    if (filters.subject) {
      filtered = filtered.filter(q => q.subject === filters.subject);
    }

    // Filter by book
    if (filters.book) {
      filtered = filtered.filter(q => q.book === filters.book);
    }

    // Filter by chapter
    if (filters.chapter) {
      filtered = filtered.filter(q => q.chapter === filters.chapter);
    }

    setFilteredQuestions(filtered);
  };

  // Get available grades from assigned books
  const getAvailableGrades = () => {
    const grades = [...new Set(user?.assignedBooks?.map(b => b.grade) || [])];
    return grades.sort((a, b) => {
      const numA = parseInt(a.replace('Grade ', ''));
      const numB = parseInt(b.replace('Grade ', ''));
      return numA - numB;
    });
  };

  // Get available subjects for selected grade
  const getAvailableSubjects = () => {
    if (!filters.grade) return [];
    const subjects = [...new Set(
      user?.assignedBooks
        ?.filter(b => {
          const normalizedBookGrade = String(b.grade).replace('Grade ', '').trim();
          const normalizedFilterGrade = String(filters.grade).replace('Grade ', '').trim();
          return normalizedBookGrade === normalizedFilterGrade;
        })
        .map(b => b.subject) || []
    )];
    return subjects.sort();
  };

  // Get available books for selected grade and subject
  const getAvailableBooks = () => {
    if (!filters.grade || !filters.subject) return [];
    const books = user?.assignedBooks
      ?.filter(b => {
        const normalizedBookGrade = String(b.grade).replace('Grade ', '').trim();
        const normalizedFilterGrade = String(filters.grade).replace('Grade ', '').trim();
        return normalizedBookGrade === normalizedFilterGrade && b.subject === filters.subject;
      })
      .map(b => b.title) || [];
    return books.sort();
  };

  // Get available chapters for selected book
  const getAvailableChapters = () => {
    if (!filters.book) return [];
    const book = user?.assignedBooks?.find(b => b.title === filters.book);
    // chapters is stored as a number, not an array
    const chapterCount = book?.chapters || 0;
    if (chapterCount > 0) {
      return Array.from({ length: chapterCount }, (_, i) => `Chapter ${i + 1}`);
    }
    return [];
  };

  const handleResetFilters = () => {
    setFilters({
      grade: '',
      subject: '',
      book: '',
      chapter: ''
    });
  };

  return (
    <div className="h-screen bg-gray-50 w-screen overflow-hidden">
      <Sidebar userRole="Teacher" currentPage="question-bank" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="fixed top-0 right-0 bottom-0 left-0 lg:left-64 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <i className="ri-menu-line text-2xl"></i>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">School Question Bank</h1>
                <p className="text-gray-600 text-sm">Browse questions assigned to your subjects and grades</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-3xl font-bold text-blue-600">{filteredQuestions.length}</div>
              <p className="text-sm text-gray-600">Visible Questions</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-3xl font-bold text-purple-600">
                {getAvailableGrades().length || 0}
              </div>
              <p className="text-sm text-gray-600">Assigned Grades</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-3xl font-bold text-green-600">
                {getAvailableSubjects().length || 0}
              </div>
              <p className="text-sm text-gray-600">Subjects (for Grade)</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-3xl font-bold text-orange-600">
                {user?.assignedBooks?.length || 0}
              </div>
              <p className="text-sm text-gray-600">Available Books</p>
            </div>
          </div>

          {/* Dynamic Filters */}
          <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Filter by Grade → Subject → Book → Chapter</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade *</label>
                <select
                  value={filters.grade}
                  onChange={(e) => setFilters({ ...filters, grade: e.target.value, subject: '', book: '', chapter: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Grade</option>
                  {getAvailableGrades().map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <select
                  value={filters.subject}
                  onChange={(e) => setFilters({ ...filters, subject: e.target.value, book: '', chapter: '' })}
                  disabled={!filters.grade}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">Select Subject</option>
                  {getAvailableSubjects().map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                <select
                  value={filters.book}
                  onChange={(e) => setFilters({ ...filters, book: e.target.value, chapter: '' })}
                  disabled={!filters.grade || !filters.subject}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">Select Book</option>
                  {getAvailableBooks().map(book => (
                    <option key={book} value={book}>{book}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
                <select
                  value={filters.chapter}
                  onChange={(e) => setFilters({ ...filters, chapter: e.target.value })}
                  disabled={!filters.book}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">Select Chapter</option>
                  {getAvailableChapters().map(chapter => (
                    <option key={chapter} value={chapter}>{chapter}</option>
                  ))}
                </select>
              </div>
            </div>

            {(filters.grade || filters.subject || filters.book || filters.chapter) && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Questions List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-600">Loading questions...</div>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
              <i className="ri-question-line text-5xl text-gray-300 mb-4"></i>
              <p className="text-gray-500 text-lg mb-4">No questions found for selected filters</p>
              <p className="text-sm text-gray-400">Try adjusting your filters to see available questions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map(question => (
                <div key={question.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 mb-2">{question.content}</h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{question.subject}</span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">{question.grade}</span>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">{question.book}</span>
                        <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded">{question.chapter}</span>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">{question.type.toUpperCase()}</span>
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">{question.difficulty}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Added by <strong>{question.createdByName}</strong> on {new Date(question.createdAt?.toDate?.()).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedQuestion(selectedQuestion?.id === question.id ? null : question)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg flex-shrink-0"
                      title="View Options"
                    >
                      <i className="ri-arrow-down-s-line"></i>
                    </button>
                  </div>

                  {/* Expanded Details - Show Options */}
                  {selectedQuestion?.id === question.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-3">Question Options:</p>
                      <div className="space-y-2">
                        {question.options.map((option, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg ${
                              question.correctAnswer === String(idx)
                                ? 'bg-green-100 border border-green-300'
                                : 'bg-gray-100 border border-gray-300'
                            }`}
                          >
                            <span className={`font-bold ${question.correctAnswer === String(idx) ? 'text-green-700' : 'text-gray-700'}`}>
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            <span className={`ml-2 ${question.correctAnswer === String(idx) ? 'text-green-700' : 'text-gray-700'}`}>
                              {option}
                              {question.correctAnswer === String(idx) && <span className="ml-2 text-green-700">✓ Correct Answer</span>}
                            </span>
                          </div>
                        ))}
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
