'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { db } from '@/firebase/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

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
  source: 'oup' | 'school';
  createdByName?: string;
}

export default function CreateQuizPage() {
  const router = useRouter();
  const { user } = useUserProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Step 1: Question Bank Selection
  const [step, setStep] = useState(1);
  const [selectedQB, setSelectedQB] = useState<'oup' | 'school' | 'both' | null>(null);

  // Step 2: Subject & Grade Selection
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');

  // Step 3: Question Selection
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    difficulty: 'all',
    type: 'all'
  });

  // Initialize subject/grade from assigned values
  useEffect(() => {
    if (user?.subjects?.length) {
      setSelectedSubject(user.subjects[0]);
    }
    if (user?.assignedGrades?.length) {
      setSelectedGrade(user.assignedGrades[0].replace('Grade ', ''));
    }
  }, [user]);

  // Fetch questions when criteria changes
  useEffect(() => {
    if (step === 3 && selectedQB && selectedSubject && selectedGrade) {
      fetchQuestions();
    }
  }, [step, selectedQB, selectedSubject, selectedGrade, selectedBook, selectedChapter, filters]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let questions: Question[] = [];

      // Fetch from OUP QP
      if (selectedQB === 'oup' || selectedQB === 'both') {
        const oupRef = collection(db, 'questions/oup');
        const oupSnapshot = await getDocs(oupRef);
        const oupQuestions = oupSnapshot.docs
          .map(doc => ({
            id: doc.id,
            source: 'oup' as const,
            ...doc.data()
          }))
          .filter(q => {
            if (q.subject !== selectedSubject) return false;
            if (q.grade !== `Grade ${selectedGrade}`) return false;
            if (selectedBook && q.book !== selectedBook) return false;
            if (selectedChapter && q.chapter !== selectedChapter) return false;
            if (filters.difficulty !== 'all' && q.difficulty !== filters.difficulty) return false;
            if (filters.type !== 'all' && q.type !== filters.type) return false;
            return true;
          }) as Question[];
        questions = [...questions, ...oupQuestions];
      }

      // Fetch from School QP
      if (selectedQB === 'school' || selectedQB === 'both') {
        const schoolRef = collection(db, `questions/schools/${user?.schoolId}`);
        const schoolSnapshot = await getDocs(schoolRef);
        const schoolQuestions = schoolSnapshot.docs
          .map(doc => ({
            id: doc.id,
            source: 'school' as const,
            ...doc.data()
          }))
          .filter(q => {
            if (q.subject !== selectedSubject) return false;
            if (q.grade !== `Grade ${selectedGrade}`) return false;
            if (selectedBook && q.book !== selectedBook) return false;
            if (selectedChapter && q.chapter !== selectedChapter) return false;
            if (filters.difficulty !== 'all' && q.difficulty !== filters.difficulty) return false;
            if (filters.type !== 'all' && q.type !== filters.type) return false;
            return true;
          }) as Question[];
        questions = [...questions, ...schoolQuestions];
      }

      setAllQuestions(questions);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
    setLoading(false);
  };

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const selectAll = () => {
    setSelectedQuestions(allQuestions.map(q => q.id));
  };

  const deselectAll = () => {
    setSelectedQuestions([]);
  };

  const handleCreateQuiz = async () => {
    if (selectedQuestions.length === 0) {
      alert('Please select at least one question');
      return;
    }

    // Store quiz creation data in session/state
    const quizData = {
      subject: selectedSubject,
      grade: selectedGrade,
      book: selectedBook,
      chapter: selectedChapter,
      questionBanks: selectedQB,
      selectedQuestionIds: selectedQuestions,
      questions: allQuestions.filter(q => selectedQuestions.includes(q.id))
    };

    // Save to sessionStorage for next page
    sessionStorage.setItem('quizData', JSON.stringify(quizData));

    // Navigate to quiz builder/preview
    router.push('/teacher/quiz/preview');
  };

  // STEP 1: Question Bank Selection
  if (step === 1) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole="Teacher" currentPage="quiz" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 lg:ml-64">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <i className="ri-menu-line text-2xl"></i>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Create Quiz</h1>
                <p className="text-gray-600 text-sm">Step 1: Select Question Bank</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                  <div className="ml-4">
                    <p className="font-bold text-gray-800">Select Question Bank</p>
                    <p className="text-sm text-gray-600">Choose which question bank to use</p>
                  </div>
                </div>
              </div>
              <div className="h-1 bg-blue-600 rounded"></div>
            </div>

            <div className="space-y-4 mb-8">
              {/* OUP Question Bank */}
              <div
                onClick={() => setSelectedQB('oup')}
                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedQB === 'oup'
                    ? 'border-blue-600 bg-blue-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-blue-400'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${
                    selectedQB === 'oup'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    <i className="ri-global-line"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Oxford Question Bank (OUP)</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      Professional questions created and maintained by Oxford University Press. Available across all schools.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        <i className="ri-star-fill mr-1"></i>Professional Content
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        <i className="ri-global-line mr-1"></i>Shared Across Schools
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        <i className="ri-lock-line mr-1"></i>Read-Only
                      </span>
                    </div>
                  </div>
                  {selectedQB === 'oup' && (
                    <div className="text-blue-600 text-2xl">
                      <i className="ri-check-double-line"></i>
                    </div>
                  )}
                </div>
              </div>

              {/* School Question Bank */}
              <div
                onClick={() => setSelectedQB('school')}
                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedQB === 'school'
                    ? 'border-green-600 bg-green-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-green-400'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${
                    selectedQB === 'school'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-100 text-green-600'
                  }`}>
                    <i className="ri-building-line"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">School Question Bank</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      Questions added by your school's teachers. Only accessible within your school for your assigned subjects and grades.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <i className="ri-team-line mr-1"></i>School-Created
                      </span>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <i className="ri-lock-2-line mr-1"></i>Private
                      </span>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <i className="ri-edit-line mr-1"></i>Customizable
                      </span>
                    </div>
                  </div>
                  {selectedQB === 'school' && (
                    <div className="text-green-600 text-2xl">
                      <i className="ri-check-double-line"></i>
                    </div>
                  )}
                </div>
              </div>

              {/* Both Question Banks */}
              <div
                onClick={() => setSelectedQB('both')}
                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedQB === 'both'
                    ? 'border-purple-600 bg-purple-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-purple-400'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${
                    selectedQB === 'both'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    <i className="ri-git-merge-line"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Both Question Banks</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      Mix questions from both Oxford's professional content and your school's custom questions. Best for comprehensive quizzes.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        <i className="ri-git-merge-line mr-1"></i>Combined
                      </span>
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        <i className="ri-scales-line mr-1"></i>Balanced
                      </span>
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        <i className="ri-lightbulb-line mr-1"></i>Flexible
                      </span>
                    </div>
                  </div>
                  {selectedQB === 'both' && (
                    <div className="text-purple-600 text-2xl">
                      <i className="ri-check-double-line"></i>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!selectedQB}
                className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
                  selectedQB
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next
                <i className="ri-arrow-right-line"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Subject, Grade, Book, Chapter Selection
  if (step === 2) {
    // Get available grades from assigned books
    const getAvailableGrades = () => {
      const gradesSet = new Set(user?.assignedBooks?.map(b => b.grade) || []);
      return Array.from(gradesSet).sort((a, b) => {
        const numA = parseInt(a.replace('Grade ', ''));
        const numB = parseInt(b.replace('Grade ', ''));
        return numA - numB;
      });
    };

    // Get available subjects for selected grade
    const getAvailableSubjects = () => {
      if (!selectedGrade) return [];
      const subjectsSet = new Set(
        user?.assignedBooks
          ?.filter(b => b.grade === `Grade ${selectedGrade}`)
          .map(b => b.subject) || []
      );
      return Array.from(subjectsSet).sort();
    };
    
    // Get available books for selected subject and grade
    const getAvailableBooks = () => {
      if (!selectedGrade || !selectedSubject) return [];
      const books = user?.assignedBooks
        ?.filter(b => b.grade === `Grade ${selectedGrade}` && b.subject === selectedSubject)
        .map(b => b.title) || [];
      return books.sort();
    };
    
    // Get chapters based on selected book
    const getChaptersForBook = () => {
      if (!selectedBook) return [];
      const book = user?.assignedBooks?.find(b => b.title === selectedBook);
      
      // chapters is stored as a number, not an array
      const chapterCount = book?.chapters || 0;
      if (chapterCount > 0) {
        return Array.from({ length: chapterCount }, (_, i) => `Chapter ${i + 1}`);
      }
      return [];
    };
    
    const availableGrades = getAvailableGrades();
    const availableSubjects = getAvailableSubjects();
    const availableBooks = getAvailableBooks();
    const chapters = getChaptersForBook();

    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole="Teacher" currentPage="quiz" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 lg:ml-64">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <i className="ri-menu-line text-2xl"></i>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Create Quiz</h1>
                <p className="text-gray-600 text-sm">Step 2: Select Subject, Grade & Book</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-w-4xl mx-auto">
            {/* Progress */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-300 text-white rounded-full flex items-center justify-center font-bold">1</div>
                  <div className="h-1 bg-gray-300 w-24"></div>
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                  <div className="h-1 bg-gray-300 w-24"></div>
                  <div className="w-10 h-10 bg-gray-300 text-white rounded-full flex items-center justify-center font-bold">3</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200 mb-8">
              <h2 className="text-lg font-bold text-gray-800 mb-6">Quiz Criteria</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Question Bank Display */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Question Bank</label>
                  <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-medium">
                    {selectedQB === 'oup' && 'Oxford Question Bank'}
                    {selectedQB === 'school' && 'School Question Bank'}
                    {selectedQB === 'both' && 'Both Banks (Oxford + School)'}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Subject</option>
                    {availableSubjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                {/* Grade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grade *</label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => {
                      setSelectedGrade(e.target.value);
                      setSelectedSubject('');
                      setSelectedBook('');
                      setSelectedChapter('');
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Grade</option>
                    {availableGrades.map(grade => (
                      <option key={grade} value={grade.replace('Grade ', '')}>{grade}</option>
                    ))}
                  </select>
                </div>

                {/* Book (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Book (Optional)</label>
                  <select
                    value={selectedBook}
                    onChange={(e) => {
                      setSelectedBook(e.target.value);
                      setSelectedChapter('');
                    }}
                    disabled={!selectedGrade || !selectedSubject}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <option value="">All Books</option>
                    {availableBooks.map(book => (
                      <option key={book} value={book}>{book}</option>
                    ))}
                  </select>
                </div>

                {/* Chapter (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chapter (Optional)</label>
                  <select
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(e.target.value)}
                    disabled={!selectedBook}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <option value="">All Chapters</option>
                    {chapters.length > 0 ? (
                      chapters.map((chapter, index) => (
                        <option key={index} value={chapter}>{chapter}</option>
                      ))
                    ) : (
                      <option disabled>Select a book first</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <i className="ri-information-line mr-2"></i>
                  You can proceed with just Subject and Grade. Book and Chapter are optional filters.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-medium"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
              >
                Next: Select Questions
                <i className="ri-arrow-right-line"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 3: Question Selection
  if (step === 3) {
    const filteredQuestions = allQuestions.filter(q => {
      if (filters.difficulty !== 'all' && q.difficulty !== filters.difficulty) return false;
      if (filters.type !== 'all' && q.type !== filters.type) return false;
      return true;
    });

    const questionsCount = {
      oup: allQuestions.filter(q => q.source === 'oup').length,
      school: allQuestions.filter(q => q.source === 'school').length
    };

    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole="Teacher" currentPage="quiz" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 lg:ml-64">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  aria-label="Open menu"
                >
                  <i className="ri-menu-line text-2xl"></i>
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Create Quiz</h1>
                  <p className="text-gray-600 text-sm">Step 3: Select Questions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">Questions Found</p>
                <p className="text-2xl font-bold text-blue-600">{allQuestions.length}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg p-4 border border-gray-200 sticky top-6">
                  <h3 className="font-bold text-gray-800 mb-4">Filters & Info</h3>

                  {/* Question Bank Stats */}
                  {selectedQB === 'both' && (
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-3">Question Bank Breakdown</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Oxford QB:</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">{questionsCount.oup}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">School QB:</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">{questionsCount.school}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Difficulty Filter */}
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                    <select
                      value={filters.difficulty}
                      onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Levels</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  {/* Type Filter */}
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                    <select
                      value={filters.type}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Types</option>
                      <option value="mcq">MCQ</option>
                      <option value="fillblanks">Fill Blanks</option>
                      <option value="matching">Matching</option>
                      <option value="ordering">Ordering</option>
                      <option value="categorization">Categorization</option>
                    </select>
                  </div>

                  {/* Selection Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={selectAll}
                      className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium"
                    >
                      <i className="ri-check-double-line mr-1"></i>
                      Select All
                    </button>
                    <button
                      onClick={deselectAll}
                      className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                    >
                      <i className="ri-close-line mr-1"></i>
                      Deselect All
                    </button>
                  </div>

                  {/* Selected Count */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Selected Questions</p>
                    <p className="text-3xl font-bold text-blue-600">{selectedQuestions.length}</p>
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div className="lg:col-span-3">
                {loading ? (
                  <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
                    <div className="text-center">
                      <i className="ri-loader-4-line text-3xl text-gray-400 animate-spin mb-2 block"></i>
                      <p className="text-gray-600">Loading questions...</p>
                    </div>
                  </div>
                ) : filteredQuestions.length === 0 ? (
                  <div className="bg-white rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
                    <i className="ri-question-line text-5xl text-gray-300 mb-4"></i>
                    <p className="text-gray-500 text-lg">No questions found</p>
                    <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or selecting different criteria</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredQuestions.map(question => (
                      <div
                        key={question.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedQuestions.includes(question.id)
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        onClick={() => toggleQuestionSelection(question.id)}
                      >
                        <div className="flex items-start gap-4">
                          <input
                            type="checkbox"
                            checked={selectedQuestions.includes(question.id)}
                            onChange={() => {}}
                            className="w-5 h-5 mt-1 cursor-pointer"
                          />
                          <div className="flex-1">
                            <p className="font-bold text-gray-800 mb-2">{question.content}</p>
                            <div className="flex flex-wrap gap-2 mb-2">
                              <span className={`text-xs px-2 py-1 rounded font-medium ${
                                question.source === 'oup'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {question.source === 'oup' ? 'Oxford QB' : 'School QB'}
                              </span>
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">
                                {question.type.toUpperCase()}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded font-medium ${
                                question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {question.book} • {question.chapter}
                              {question.createdByName && question.source === 'school' && (
                                <> • By {question.createdByName}</>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end mt-8">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-medium"
              >
                Back
              </button>
              <button
                onClick={handleCreateQuiz}
                disabled={selectedQuestions.length === 0}
                className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
                  selectedQuestions.length > 0
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <i className="ri-check-line"></i>
                Create Quiz ({selectedQuestions.length} questions)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
