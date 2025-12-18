'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { db } from '@/firebase/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

export default function SchoolAdminQBPage() {
  const { user } = useUserProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedBooks, setExpandedBooks] = useState<Record<string, boolean>>({});
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  const [filters, setFilters] = useState({
    subject: 'all',
    grade: 'all',
    book: 'all',
    difficulty: 'all',
    contributor: 'all'
  });

  useEffect(() => {
    if (user?.schoolId) {
      fetchSchoolQuestions();
    }
  }, [user?.schoolId]);

  const fetchSchoolQuestions = async () => {
    try {
      setLoading(true);
      const schoolId = user?.schoolId;
      const questionsRef = collection(db, `questions/schools/${schoolId}`);
      const snapshot = await getDocs(questionsRef);
      const allQuestions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setQuestions(allQuestions);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
    setLoading(false);
  };

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;
    try {
      const schoolId = user?.schoolId;
      const questionRef = doc(db, `questions/schools/${schoolId}`, questionToDelete);
      await deleteDoc(questionRef);
      alert('Question deleted successfully!');
      setShowDeleteModal(false);
      setQuestionToDelete(null);
      setSelectedQuestion(null);
      fetchSchoolQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Error deleting question');
    }
  };

  const getStatistics = () => {
    const stats = {
      totalQuestions: questions.length,
      totalBooks: Array.from(new Set(questions.map((q: any) => q.book))).length,
      totalSubjects: Array.from(new Set(questions.map((q: any) => q.subject))).length,
      totalContributors: Array.from(new Set(questions.map((q: any) => q.createdByName))).length,
      byDifficulty: { easy: 0, medium: 0, hard: 0 }
    };

    questions.forEach((q: any) => {
      if (q.difficulty && (q.difficulty === 'easy' || q.difficulty === 'medium' || q.difficulty === 'hard')) {
        stats.byDifficulty[q.difficulty as keyof typeof stats.byDifficulty]++;
      }
    });

    return stats;
  };

  const getFilteredQuestions = () => {
    return questions.filter((q: any) => {
      if (filters.subject !== 'all' && q.subject !== filters.subject) return false;
      if (filters.grade !== 'all' && q.grade !== filters.grade) return false;
      if (filters.book !== 'all' && q.book !== filters.book) return false;
      if (filters.difficulty !== 'all' && q.difficulty.toLowerCase() !== filters.difficulty) return false;
      if (filters.contributor !== 'all' && q.createdByName !== filters.contributor) return false;
      return true;
    });
  };

  const getHierarchicalQuestions = () => {
    const hierarchy: Record<string, Record<string, Record<string, any[]>>> = {};
    getFilteredQuestions().forEach((q: any) => {
      if (!hierarchy[q.subject]) hierarchy[q.subject] = {};
      if (!hierarchy[q.subject][q.book]) hierarchy[q.subject][q.book] = {};
      if (!hierarchy[q.subject][q.book][q.chapter]) hierarchy[q.subject][q.book][q.chapter] = [];
      hierarchy[q.subject][q.book][q.chapter].push(q);
    });
    return hierarchy;
  };

  const stats = getStatistics();
  const getAllBooks = () => Array.from(new Set(questions.map((q: any) => q.book)));
  const getAllGrades = () => Array.from(new Set(questions.map((q: any) => q.grade)));
  const getAllSubjects = () => Array.from(new Set(questions.map((q: any) => q.subject)));
  const getAllContributors = () => Array.from(new Set(questions.map((q: any) => q.createdByName)));

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="School Admin" currentPage="question-bank" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 lg:ml-64">
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" aria-label="Open menu">
                <i className="ri-menu-line text-2xl"></i>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Question Bank</h1>
                <p className="text-gray-600 text-sm mt-1">Manage and organize your school's questions</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <div className="bg-white rounded border border-gray-200 p-4 hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Questions</p>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalQuestions}</div>
                </div>
                <i className="ri-file-list-line text-2xl text-blue-500 opacity-80"></i>
              </div>
            </div>
            <div className="bg-white rounded border border-gray-200 p-4 hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Subjects</p>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalSubjects}</div>
                </div>
                <i className="ri-book-2-line text-2xl text-green-500 opacity-80"></i>
              </div>
            </div>
            <div className="bg-white rounded border border-gray-200 p-4 hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Books</p>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalBooks}</div>
                </div>
                <i className="ri-booklet-line text-2xl text-purple-500 opacity-80"></i>
              </div>
            </div>
            <div className="bg-white rounded border border-gray-200 p-4 hover:shadow transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Contributors</p>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalContributors}</div>
                </div>
                <i className="ri-team-line text-2xl text-orange-500 opacity-80"></i>
              </div>
            </div>
            <div className="bg-white rounded border border-gray-200 p-4 hover:shadow transition-shadow">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">By Difficulty</p>
              <div className="flex justify-around gap-2">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{stats.byDifficulty.easy}</div>
                  <p className="text-xs text-gray-500">Easy</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-yellow-600">{stats.byDifficulty.medium}</div>
                  <p className="text-xs text-gray-500">Med</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">{stats.byDifficulty.hard}</div>
                  <p className="text-xs text-gray-500">Hard</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 mb-6 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <i className="ri-filter-line text-xl text-blue-600"></i>
              <h3 className="text-lg font-semibold text-gray-800">Filter Questions</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                <select value={filters.subject} onChange={(e) => setFilters({ ...filters, subject: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
                  <option value="all">All Subjects</option>
                  {getAllSubjects().map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Grade</label>
                <select value={filters.grade} onChange={(e) => setFilters({ ...filters, grade: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
                  <option value="all">All Grades</option>
                  {getAllGrades().map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Book</label>
                <select value={filters.book} onChange={(e) => setFilters({ ...filters, book: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
                  <option value="all">All Books</option>
                  {getAllBooks().map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty</label>
                <select value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
                  <option value="all">All Levels</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Contributor</label>
                <select value={filters.contributor} onChange={(e) => setFilters({ ...filters, contributor: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
                  <option value="all">All Contributors</option>
                  {getAllContributors().map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
              <i className="ri-loader-4-line text-3xl text-gray-400 animate-spin"></i>
            </div>
          ) : Object.entries(getHierarchicalQuestions()).length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
              <i className="ri-question-line text-5xl text-gray-300 mb-4"></i>
              <p className="text-gray-500 text-lg">No questions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(getHierarchicalQuestions()).map(([subject, books]) => (
                <div key={subject} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <button onClick={() => setExpandedSubject(expandedSubject === subject ? null : subject)} className="w-full p-5 flex items-center justify-between hover:bg-blue-50 transition-colors border-b border-gray-200">
                    <div className="flex-1 text-left flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <i className="ri-book-3-line text-lg text-blue-600"></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">{subject}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{Object.keys(books).length} Book{Object.keys(books).length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <i className={`ri-arrow-down-s-line text-2xl text-blue-600 transition-transform duration-300 ${expandedSubject === subject ? 'rotate-180' : ''}`}></i>
                  </button>

                  {expandedSubject === subject && (
                    <div className="divide-y divide-gray-200 bg-gray-50">
                      {Object.entries(books).map(([bookName, chapters]) => {
                        const bookKey = `${subject}-${bookName}`;
                        return (
                          <div key={bookName} className="p-4">
                            <button onClick={() => setExpandedBooks(prev => ({ ...prev, [bookKey]: !prev[bookKey] }))} className="w-full flex items-center justify-between hover:bg-emerald-50 p-3 rounded-lg transition-colors">
                              <div className="flex-1 text-left flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                  <i className="ri-book-2-line text-emerald-600"></i>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-800">{bookName}</h4>
                                  <p className="text-xs text-gray-500 mt-0.5">{Object.keys(chapters).length} Chapter{Object.keys(chapters).length !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                              <i className={`ri-arrow-right-s-line text-xl text-emerald-600 transition-transform duration-300 ${expandedBooks[bookKey] ? 'rotate-90' : ''}`}></i>
                            </button>

                            {expandedBooks[bookKey] && (
                              <div className="mt-3 space-y-2 ml-4 border-l-2 border-emerald-300 pl-4">
                                {Object.entries(chapters).map(([chapterName, questionsInChapter]) => {
                                  const chapterKey = `${bookKey}-${chapterName}`;
                                  return (
                                    <div key={chapterName}>
                                      <button onClick={() => setExpandedChapters(prev => ({ ...prev, [chapterKey]: !prev[chapterKey] }))} className="w-full flex items-center justify-between hover:bg-purple-50 p-3 rounded-lg transition-colors">
                                        <div className="flex-1 text-left flex items-center gap-2">
                                          <i className="ri-folder-open-line text-purple-600"></i>
                                          <div>
                                            <h5 className="font-medium text-gray-700">{chapterName}</h5>
                                            <p className="text-xs text-gray-500 mt-0.5">{(questionsInChapter as any[]).length} Question{(questionsInChapter as any[]).length !== 1 ? 's' : ''}</p>
                                          </div>
                                        </div>
                                        <i className={`ri-arrow-down-s-line text-gray-500 transition-transform duration-300 ${expandedChapters[chapterKey] ? 'rotate-180' : ''}`}></i>
                                      </button>

                                      {expandedChapters[chapterKey] && (
                                        <div className="mt-3 space-y-3">
                                          {(questionsInChapter as any[]).map(question => (
                                            <div key={question.id} className="bg-white rounded-lg border-2 border-gray-300 overflow-hidden ml-2 mb-4 hover:border-blue-400 transition-colors shadow-sm hover:shadow-md">
                                              {/* Question Content - Always Visible */}
                                              <div className="p-5 border-b-2 border-gray-200 bg-white">
                                                <div className="mb-4 pb-4 border-b border-gray-200">
                                                  <p className="text-base font-semibold text-gray-900 leading-relaxed whitespace-pre-wrap break-words">{question.questionText || '(No question text)'}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full">
                                                    <i className="ri-question-line"></i>
                                                    {question.type.toUpperCase()}
                                                  </span>
                                                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${question.difficulty.toLowerCase() === 'easy' ? 'bg-green-100 text-green-700' : question.difficulty.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                    <i className="ri-bar-chart-line"></i>
                                                    {question.difficulty.toUpperCase()}
                                                  </span>
                                                </div>
                                                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                                  <div className="flex items-center gap-2 text-sm text-gray-700">
                                                    <i className="ri-user-line text-gray-500"></i>
                                                    <span><strong>By:</strong> {question.createdByName}</span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <button onClick={() => setSelectedQuestion(selectedQuestion?.id === question.id ? null : question)} className="px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-300 hover:border-blue-500" title={selectedQuestion?.id === question.id ? 'Hide Options' : 'Show Options'}>
                                                      <i className={`ri-${selectedQuestion?.id === question.id ? 'arrow-up' : 'arrow-down'}-s-line`}></i>
                                                      {selectedQuestion?.id === question.id ? 'Hide' : 'Show'} Options
                                                    </button>
                                                    <button onClick={() => { setQuestionToDelete(question.id); setShowDeleteModal(true); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-300 hover:border-red-500" title="Delete">
                                                      <i className="ri-delete-bin-2-line text-lg"></i>
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Answer Options - Toggle Visible */}
                                              {selectedQuestion?.id === question.id && (
                                                <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 border-t-2 border-blue-300 animate-in fade-in-50 duration-200">
                                                  <p className="text-sm font-bold text-gray-800 mb-4 pb-2 border-b-2 border-blue-200 flex items-center gap-2">
                                                    <i className="ri-checkbox-multiple-line text-blue-600"></i>
                                                    Answer Options
                                                  </p>
                                                  <div className="space-y-3">
                                                    {question.options.map((option: string, idx: number) => (
                                                      <div key={idx} className={`p-4 rounded-lg border-2 transition-colors ${question.correctAnswer === String(idx) ? 'bg-green-50 border-green-400 shadow-md' : 'bg-white border-gray-300 hover:border-gray-400'}`}>
                                                        <div className="flex items-start gap-3">
                                                          <span className={`font-bold text-lg min-w-fit rounded-full w-8 h-8 flex items-center justify-center ${question.correctAnswer === String(idx) ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{String.fromCharCode(65 + idx)}</span>
                                                          <div className="flex-1">
                                                            <span className={`block ${question.correctAnswer === String(idx) ? 'text-green-900 font-semibold' : 'text-gray-800'}`}>{option}</span>
                                                            {question.correctAnswer === String(idx) && (
                                                              <span className="inline-block mt-2 text-green-700 font-bold text-sm bg-green-100 px-2 py-1 rounded">
                                                                <i className="ri-check-line"></i> Correct Answer
                                                              </span>
                                                            )}
                                                          </div>
                                                        </div>
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
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-gray-200">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
              <i className="ri-error-warning-line text-2xl text-red-600"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Delete Question?</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this question? This action cannot be undone and will permanently remove it from the question bank.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowDeleteModal(false); setQuestionToDelete(null); }} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors">Cancel</button>
              <button onClick={handleDeleteQuestion} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center gap-2">
                <i className="ri-delete-bin-line"></i>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
