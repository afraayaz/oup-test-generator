'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { db } from '@/firebase/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

interface QuestionBankStats {
  schoolId?: string;
  schoolName?: string;
  bankName?: string;
  bankType?: 'school' | 'oup'; // Added to distinguish between school and OUP
  totalQuestions: number;
  questionsBySubject: Record<string, number>;
  questionsByGrade: Record<string, number>;
  lastUpdated: any;
}

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

export default function AdminQuestionBanksPage() {
  const { user } = useUserProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allQBs, setAllQBs] = useState<QuestionBankStats[]>([]);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [selectedBankType, setSelectedBankType] = useState<'school' | 'oup' | null>(null);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [filters, setFilters] = useState({
    subject: 'all',
    grade: 'all',
    difficulty: 'all',
    type: 'all'
  });

  useEffect(() => {
    fetchAllQBs();
  }, []);

  const fetchAllQBs = async () => {
    try {
      setLoading(true);
      const allBanks: QuestionBankStats[] = [];

      // Fetch school QBs from school-stats collection
      console.log('🔍 Fetching school stats from: school-stats');
      const schoolStatsRef = collection(db, 'school-stats');
      const schoolSnapshot = await getDocs(schoolStatsRef);
      
      console.log('📊 Found school banks:', schoolSnapshot.docs.length);
      schoolSnapshot.docs.forEach(doc => {
        const bankData = doc.data();
        console.log('📌 School bank:', doc.id, bankData);
        allBanks.push({
          schoolId: doc.id,
          schoolName: bankData.schoolName,
          bankName: bankData.schoolName || doc.id,
          bankType: 'school',
          totalQuestions: bankData.totalQuestions || 0,
          questionsBySubject: bankData.questionsBySubject || {},
          questionsByGrade: bankData.questionsByGrade || {},
          lastUpdated: bankData.lastUpdated,
        });
      });

      // Fetch OUP QB
      try {
        console.log('🔍 Fetching OUP stats from: question-bank-stats/oup');
        const oupStatsRef = doc(db, 'question-bank-stats', 'oup');
        const oupStats = await getDoc(oupStatsRef);
        console.log('📊 OUP stats found:', !!oupStats.exists());
        if (oupStats.exists()) {
          const oupData = oupStats.data();
          console.log('📌 OUP bank:', oupData);
          allBanks.unshift({
            schoolId: 'oup',
            bankName: 'OUP Question Bank',
            bankType: 'oup',
            totalQuestions: oupData.totalQuestions || 0,
            questionsBySubject: oupData.questionsBySubject || {},
            questionsByGrade: oupData.questionsByGrade || {},
            lastUpdated: oupData.lastUpdated,
          });
        }
      } catch (oupError) {
        console.error('Error fetching OUP stats:', oupError);
      }

      console.log('✅ Total banks fetched:', allBanks.length);
      setAllQBs(allBanks);
    } catch (error) {
      console.error('Error fetching QBs:', error);
    }
    setLoading(false);
  };

  const fetchBankQuestions = async (bankId: string, bankType: 'school' | 'oup') => {
    try {
      setDetailsLoading(true);
      
      let questionsRef;
      if (bankType === 'oup') {
        questionsRef = collection(db, 'questions', 'oup', 'items');
      } else {
        questionsRef = collection(db, 'questions', 'schools', bankId);
      }

      const snapshot = await getDocs(questionsRef);

      let questions = snapshot.docs.map(doc => ({
        id: doc.id,
        source: bankType,
        ...doc.data()
      })) as Question[];

      // Apply filters
      if (filters.subject !== 'all') questions = questions.filter(q => q.subject === filters.subject);
      if (filters.grade !== 'all') questions = questions.filter(q => q.grade === filters.grade);
      if (filters.difficulty !== 'all') questions = questions.filter(q => q.difficulty === filters.difficulty);
      if (filters.type !== 'all') questions = questions.filter(q => q.type === filters.type);

      setBankQuestions(questions);
    } catch (error) {
      console.error('Error fetching bank questions:', error);
    }
    setDetailsLoading(false);
  };

  const handleSelectBank = (bankId: string, bankType: 'school' | 'oup') => {
    setSelectedBank(bankId);
    setSelectedBankType(bankType);
    setFilters({ subject: 'all', grade: 'all', difficulty: 'all', type: 'all' });
    fetchBankQuestions(bankId, bankType);
  };

  const handleFilterChange = () => {
    if (selectedBank && selectedBankType) {
      fetchBankQuestions(selectedBank, selectedBankType);
    }
  };

  const handleFilterChangeWithUpdate = (newFilters: typeof filters) => {
    setFilters(newFilters);
    if (selectedBank && selectedBankType) {
      // Need to apply filters with the new values
      fetchBankQuestionsWithFilters(selectedBank, selectedBankType, newFilters);
    }
  };

  const fetchBankQuestionsWithFilters = async (bankId: string, bankType: 'school' | 'oup', filtersToApply: typeof filters) => {
    try {
      setDetailsLoading(true);
      
      let questionsRef;
      if (bankType === 'oup') {
        questionsRef = collection(db, 'questions', 'oup', 'items');
      } else {
        questionsRef = collection(db, 'questions', 'schools', bankId);
      }

      const snapshot = await getDocs(questionsRef);

      let questions = snapshot.docs.map(doc => ({
        id: doc.id,
        source: bankType,
        ...doc.data()
      })) as Question[];

      // Apply filters
      if (filtersToApply.subject !== 'all') questions = questions.filter(q => q.subject === filtersToApply.subject);
      if (filtersToApply.grade !== 'all') questions = questions.filter(q => q.grade === filtersToApply.grade);
      if (filtersToApply.difficulty !== 'all') questions = questions.filter(q => q.difficulty?.toLowerCase() === filtersToApply.difficulty.toLowerCase());
      if (filtersToApply.type !== 'all') questions = questions.filter(q => q.type === filtersToApply.type);

      setBankQuestions(questions);
    } catch (error) {
      console.error('Error fetching bank questions:', error);
    }
    setDetailsLoading(false);
  };

  const getSubjects = () => {
    if (!selectedBank) return [];
    const bank = allQBs.find(b => (b.schoolId || b.bankName) === selectedBank);
    return Object.keys(bank?.questionsBySubject || {});
  };

  const getGrades = () => {
    if (!selectedBank) return [];
    const bank = allQBs.find(b => (b.schoolId || b.bankName) === selectedBank);
    return Object.keys(bank?.questionsByGrade || {});
  };

  return (
    <div className="h-screen bg-gray-50 w-screen overflow-hidden">
      <Sidebar userRole="Admin" currentPage="question-banks" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="fixed top-0 right-0 bottom-0 left-0 lg:left-64 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <i className="ri-menu-line text-2xl"></i>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">All Question Banks</h1>
              <p className="text-gray-600 text-sm">Monitor and manage all question banks</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto w-full">
          <div className="p-6 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Question Banks List */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg border border-gray-200 sticky top-6">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-bold text-gray-800">Question Banks</h2>
                  <p className="text-sm text-gray-600">{allQBs.length} banks</p>
                </div>

                <div className="max-h-[600px] overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center text-gray-600">Loading...</div>
                  ) : allQBs.length === 0 ? (
                    <div className="p-4 text-center text-gray-600">No question banks found</div>
                  ) : (
                    allQBs.map(bank => (
                      <button
                        key={bank.schoolId || 'oup'}
                        onClick={() => handleSelectBank(bank.schoolId || 'oup', bank.bankType || 'school')}
                        className={`w-full text-left p-4 border-b border-gray-200 transition-colors ${
                          selectedBank === (bank.schoolId || 'oup')
                            ? 'bg-blue-50 border-l-4 border-l-blue-600'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`flex-shrink-0 px-2 py-1 rounded text-xs font-semibold ${
                            bank.bankType === 'oup' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {bank.bankType === 'oup' ? 'OUP' : 'School'}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-800 mt-2">{bank.bankName}</p>
                        <p className="text-sm text-gray-600">{bank.totalQuestions} questions</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="lg:col-span-3">
              {selectedBank ? (
                <div className="bg-white rounded-lg border border-gray-200">
                  {/* Bank Header */}
                  <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            selectedBankType === 'oup' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {selectedBankType === 'oup' ? 'OUP Bank' : 'School Bank'}
                          </span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                          {allQBs.find(b => (b.schoolId || 'oup') === selectedBank)?.bankName}
                        </h2>
                        <p className="text-gray-600">
                          Total Questions:{' '}
                          <span className="font-bold text-blue-600">
                            {allQBs.find(b => (b.schoolId || 'oup') === selectedBank)?.totalQuestions || 0}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedBank(null)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {Object.entries(allQBs.find(b => (b.schoolId || 'oup') === selectedBank)?.questionsBySubject || {}).map(
                        ([subject, count]) => (
                          <div key={subject} className="bg-white rounded p-3">
                            <p className="text-sm text-gray-600">{subject}</p>
                            <p className="text-xl font-bold text-blue-600">{count}</p>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                        <select
                          value={filters.subject}
                          onChange={(e) => handleFilterChangeWithUpdate({ ...filters, subject: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All Subjects</option>
                          {getSubjects().map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                        <select
                          value={filters.grade}
                          onChange={(e) => handleFilterChangeWithUpdate({ ...filters, grade: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All Grades</option>
                          {getGrades().map(grade => (
                            <option key={grade} value={grade}>{grade}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                        <select
                          value={filters.difficulty}
                          onChange={(e) => handleFilterChangeWithUpdate({ ...filters, difficulty: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All Levels</option>
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                          value={filters.type}
                          onChange={(e) => handleFilterChangeWithUpdate({ ...filters, type: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All Types</option>
                          <option value="multiple">MCQ</option>
                          <option value="truefalse">True/False</option>
                          <option value="fillblanks">Fill Blanks</option>
                          <option value="matching">Matching</option>
                          <option value="ordering">Ordering</option>
                          <option value="categorization">Categorization</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Questions List */}
                  <div className="max-h-[600px] overflow-y-auto">
                    {detailsLoading ? (
                      <div className="p-6 text-center text-gray-600">Loading questions...</div>
                    ) : bankQuestions.length === 0 ? (
                      <div className="p-6 text-center text-gray-600">No questions found with selected filters</div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {bankQuestions.map(question => (
                          <div key={question.id} className="p-4 hover:bg-gray-50">
                            <p className="font-semibold text-gray-800 mb-2">{question.content}</p>
                            <div className="flex flex-wrap gap-2 mb-2">
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{question.subject}</span>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">{question.grade}</span>
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">{question.type.toUpperCase()}</span>
                              <span className={`text-xs px-2 py-1 rounded font-medium ${
                                question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {question.difficulty}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {question.book} • {question.chapter}
                              {question.createdByName && <> • By {question.createdByName}</>}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Showing <span className="font-semibold">{bankQuestions.length}</span> questions
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
                  <i className="ri-database-line text-5xl text-gray-300 mb-4"></i>
                  <p className="text-gray-500 text-lg">Select a question bank to view questions</p>
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
