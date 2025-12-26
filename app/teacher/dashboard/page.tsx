"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  FiPlus,
  FiEdit,
  FiCheckSquare,
  FiMenu,
  FiChevronDown,
} from "react-icons/fi";
import { FaBook, FaPencilAlt, FaClipboardList, FaTasks } from "react-icons/fa";

const StatCard = ({
  title,
  value,
  icon,
  color,
  progress,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  progress?: number;
}) => (
  <div className={`${color} p-4 sm:p-6 rounded-2xl text-white`}>
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-sm sm:text-lg font-semibold">{title}</h3>
        <p className="text-2xl sm:text-4xl font-bold">{value}</p>
      </div>
      {progress ? (
        <div className="relative hidden sm:block">
          <svg className="w-14 h-14 sm:w-16 sm:h-16">
            <circle
              className="text-white opacity-20"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              r="24"
              cx="28"
              cy="28"
            />
            <circle
              className="text-white"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              r="24"
              cx="28"
              cy="28"
              strokeDasharray={2 * Math.PI * 24}
              strokeDashoffset={2 * Math.PI * 24 * (1 - progress / 100)}
              strokeLinecap="round"
              transform="rotate(-90 28 28)"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs sm:text-sm font-bold">
            {progress}%
          </span>
        </div>
      ) : (
        <div className="text-2xl sm:text-4xl opacity-80">{icon}</div>
      )}
    </div>
    {progress && (
      <div className="sm:hidden mt-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/20 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-bold">{progress}%</span>
        </div>
      </div>
    )}
  </div>
);

const AssignedBookItem = ({
  title,
  subject,
  chapters,
  questions,
  status,
}: {
  title: string;
  subject: string;
  chapters: number;
  questions: number;
  status: string;
}) => (
  <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-gray-800 truncate">{title}</h4>
        <p className="text-sm text-gray-500">{subject}</p>
        <div className="flex items-center flex-wrap gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600">
          <span className="flex items-center">
            <FaBook className="mr-1 sm:mr-2 flex-shrink-0" />
            {chapters} Chapters
          </span>
          <span className="flex items-center">
            <FaPencilAlt className="mr-1 sm:mr-2 flex-shrink-0" />
            {questions} Questions
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
        <button
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${status === "Active" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"}`}
        >
          {status}
        </button>
        <button className="text-gray-400 hover:text-gray-600 p-2 touch-manipulation">
          <FiEdit size={18} />
        </button>
      </div>
    </div>
  </div>
);

const QuestionCountTooltip = ({
  totalQuestions,
  oupQuestions,
  schoolQuestions,
  isVisible,
}: {
  totalQuestions: number;
  oupQuestions: number;
  schoolQuestions: number;
  isVisible: boolean;
}) => {
  if (!isVisible) return null;
  
  return (
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
      <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
        <div className="font-semibold mb-1">Question Breakdown:</div>
        <div className="space-y-0.5">
          <div>📚 OUP Bank: <span className="font-semibold">{oupQuestions}</span></div>
          <div>🏫 School Bank: <span className="font-semibold">{schoolQuestions}</span></div>
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
};

const BookGroupSection = ({
  groupTitle,
  bookCount,
  books,
  isExpanded,
  onToggle,
  questionCounts,
  schoolId,
}: {
  groupTitle: string;
  bookCount: number;
  books: { id: string; title: string; subject: string; grade: string; chapters: number }[];
  isExpanded: boolean;
  onToggle: () => void;
  questionCounts: { [bookId: string]: { total: number; oup: number; school: number } };
  schoolId: string;
}) => {
  const [hoveredBook, setHoveredBook] = useState<string | null>(null);

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FaBook className="text-blue-600 flex-shrink-0" />
          <div className="text-left">
            <h4 className="font-semibold text-gray-800">{groupTitle}</h4>
            <p className="text-xs text-gray-500">{bookCount} book{bookCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          <FiChevronDown size={20} className="text-gray-600" />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50">
          {books.map((book) => {
            const counts = questionCounts[book.id] || { total: 0, oup: 0, school: 0 };
            return (
              <div key={book.id} className="bg-white p-3 rounded-lg border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-gray-800 text-sm">{book.title}</h5>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                      <span className="flex items-center">
                        <FaBook className="mr-1 flex-shrink-0" />
                        {book.chapters} Chapters
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="relative">
                      <button
                        onMouseEnter={() => setHoveredBook(book.id)}
                        onMouseLeave={() => setHoveredBook(null)}
                        className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold hover:bg-blue-200 transition-colors"
                      >
                        {counts.total} Q's
                      </button>
                      <QuestionCountTooltip
                        totalQuestions={counts.total}
                        oupQuestions={counts.oup}
                        schoolQuestions={counts.school}
                        isVisible={hoveredBook === book.id}
                      />
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 p-2">
                      <FiEdit size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const TodoItem = ({
  task,
  date,
  color,
}: {
  task: string;
  date: string;
  color: string;
}) => (
  <div
    className="bg-white p-3 sm:p-4 rounded-2xl border-l-4"
    style={{ borderColor: color }}
  >
    <div className="flex items-start sm:items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm sm:text-base">{task}</p>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">{date}</p>
      </div>
      <button className="text-blue-600 bg-blue-100 rounded-full p-2 flex-shrink-0 touch-manipulation">
        <FiCheckSquare size={18} />
      </button>
    </div>
  </div>
);

export default function TeacherDashboard() {
  const { user } = useUserProfile();
  const { isAuthenticated, isLoading } = useAuthGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
  const [questionCounts, setQuestionCounts] = useState<{ [bookId: string]: { total: number; oup: number; school: number } }>({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Fetch question counts for all assigned books
  useEffect(() => {
    console.log('🔍 useEffect triggered - Checking conditions...');
    console.log('📚 user?.assignedBooks:', user?.assignedBooks);
    console.log('👨‍🏫 user?.subjectGradePairs:', user?.subjectGradePairs);
    console.log('🏫 user?.schoolId:', user?.schoolId);
    console.log('✅ assignedBooks length:', user?.assignedBooks?.length);
    console.log('✅ subjectGradePairs length:', user?.subjectGradePairs?.length);
    
    // Early return if missing required data
    if (!user?.assignedBooks || user.assignedBooks.length === 0 || !user?.schoolId) {
      console.log('❌ Early return: Missing assignedBooks or schoolId');
      return;
    }
    
    console.log('✅ Starting to fetch question counts for', user.assignedBooks.length, 'books');
    console.log('📋 Assigned Books:', JSON.stringify(user.assignedBooks, null, 2));
    setLoadingQuestions(true);
    const fetchQuestionCounts = async () => {
      try {
        const counts: { [bookId: string]: { total: number; oup: number; school: number } } = {};
        
        // Fetch OUP questions
        const oupUrl = `https://firestore.googleapis.com/v1/projects/quiz-app-ff0ab/databases/(default)/documents/questions/oup/items`;
        const oupResponse = await fetch(oupUrl);
        const oupData = oupResponse.ok ? await oupResponse.json() : { documents: [] };
        console.log('📡 OUP Response OK:', oupResponse.ok, 'Documents:', oupData.documents?.length || 0);
        
        // Fetch School questions
        const schoolUrl = `https://firestore.googleapis.com/v1/projects/quiz-app-ff0ab/databases/(default)/documents/questions/schools/${user.schoolId}`;
        const schoolResponse = await fetch(schoolUrl);
        const schoolData = schoolResponse.ok ? await schoolResponse.json() : { documents: [] };
        console.log('📡 School Response OK:', schoolResponse.ok, 'Documents:', schoolData.documents?.length || 0);
        
        // Helper to parse Firestore values
        const parseFirestoreValue = (value: any): any => {
          if (value.stringValue !== undefined) return value.stringValue;
          if (value.integerValue !== undefined) return parseInt(value.integerValue);
          if (value.doubleValue !== undefined) return parseFloat(value.doubleValue);
          if (value.booleanValue !== undefined) return value.booleanValue;
          if (value.arrayValue) return (value.arrayValue.values || []).map(parseFirestoreValue);
          if (value.mapValue) {
            const result: Record<string, any> = {};
            for (const [k, v] of Object.entries(value.mapValue.fields || {})) {
              result[k] = parseFirestoreValue(v);
            }
            return result;
          }
          return null;
        };
        
        // Parse OUP questions and group by book+subject+grade
        const oupQuestions = oupData.documents || [];
        const oupByBook: { [key: string]: number } = {};
        console.log('🔍 Total OUP Documents:', oupQuestions.length);
        oupQuestions.forEach((doc: any, idx: number) => {
          const rawBook = doc.fields?.book;
          const rawSubject = doc.fields?.subject;
          const rawGrade = doc.fields?.grade;
          
          console.log(`📄 OUP Doc ${idx}:`, {
            book: rawBook,
            subject: rawSubject,
            grade: rawGrade
          });
          
          const book = parseFirestoreValue(rawBook);
          const subject = parseFirestoreValue(rawSubject);
          const grade = String(parseFirestoreValue(rawGrade) || '').replace('Grade ', '').trim();
          
          console.log(`  Parsed: book="${book}", subject="${subject}", grade="${grade}"`);
          
          if (book && subject && grade) {
            const key = `${book.toLowerCase()}-${subject.toLowerCase()}-${grade}`;
            oupByBook[key] = (oupByBook[key] || 0) + 1;
            console.log(`✅ OUP Question: book="${book}", subject="${subject}", grade="${grade}" → key="${key}"`);
          } else {
            console.log(`⚠️ OUP Question skipped (missing fields): book="${book}", subject="${subject}", grade="${grade}"`);
          }
        });
        console.log('📊 OUP Questions by Book:', oupByBook);
        
        // Parse School questions and group by book+subject+grade
        const schoolQuestions = schoolData.documents || [];
        const schoolByBook: { [key: string]: number } = {};
        console.log('🔍 Total School Documents:', schoolQuestions.length);
        schoolQuestions.forEach((doc: any, idx: number) => {
          const rawBook = doc.fields?.book;
          const rawSubject = doc.fields?.subject;
          const rawGrade = doc.fields?.grade;
          
          console.log(`📄 School Doc ${idx}:`, {
            book: rawBook,
            subject: rawSubject,
            grade: rawGrade
          });
          
          const book = parseFirestoreValue(rawBook);
          const subject = parseFirestoreValue(rawSubject);
          const grade = String(parseFirestoreValue(rawGrade) || '').replace('Grade ', '').trim();
          
          console.log(`  Parsed: book="${book}", subject="${subject}", grade="${grade}"`);
          
          if (book && subject && grade) {
            const key = `${book.toLowerCase()}-${subject.toLowerCase()}-${grade}`;
            schoolByBook[key] = (schoolByBook[key] || 0) + 1;
            console.log(`✅ School Question: book="${book}", subject="${subject}", grade="${grade}" → key="${key}"`);
          } else {
            console.log(`⚠️ School Question skipped (missing fields): book="${book}", subject="${subject}", grade="${grade}"`);
          }
        });
        console.log('📊 School Questions by Book:', schoolByBook);
        
        // Build counts object for each book in subjectGradePairs
        // This ensures we have the subject information
        console.log('👨‍🏫 Teacher SubjectGradePairs:', user.subjectGradePairs);
        console.log('👨‍🏫 Teacher Subjects:', user.subjects);
        console.log('👨‍🏫 Teacher AssignedGrades:', user.assignedGrades);
        console.log('👨‍🏫 Teacher AssignedBooks:', user.assignedBooks);
        
        // REVERSE MATCHING: If subjects aren't available, extract them from the questions!
        // For each assigned book, find what subject(s) have questions for that book-grade combo
        console.log('🔄 Attempting reverse matching - finding subjects from questions...');
        
        user.assignedBooks.forEach(book => {
          const bookTitle = book.title.toLowerCase();
          const bookGrade = book.grade.replace('Grade ', '').trim();
          
          // Look for questions matching this book-grade in both OUP and School databases
          const matchingOupKeys = Object.keys(oupByBook).filter(key => 
            key.startsWith(bookTitle + '-') && key.endsWith('-' + bookGrade)
          );
          const matchingSchoolKeys = Object.keys(schoolByBook).filter(key =>
            key.startsWith(bookTitle + '-') && key.endsWith('-' + bookGrade)
          );
          
          const allMatchingKeys = [...matchingOupKeys, ...matchingSchoolKeys];
          console.log(`  Book "${book.title}" Grade ${book.grade}:`, { matchingOupKeys, matchingSchoolKeys, allMatchingKeys });
          
          // Extract subject from matching keys (format: "book-subject-grade")
          if (allMatchingKeys.length > 0) {
            const firstKey = allMatchingKeys[0];
            const parts = firstKey.split('-');
            const subject = parts[1]; // Extract subject from key
            
            const oupCount = matchingOupKeys.reduce((sum, key) => sum + (oupByBook[key] || 0), 0);
            const schoolCount = matchingSchoolKeys.reduce((sum, key) => sum + (schoolByBook[key] || 0), 0);
            
            console.log(`    ✅ Found matching key "${firstKey}", extracted subject: "${subject}", OUP: ${oupCount}, School: ${schoolCount}`);
            
            counts[book.id] = {
              oup: oupCount,
              school: schoolCount,
              total: oupCount + schoolCount
            };
          } else {
            console.log(`    ❌ No matching questions found for book "${book.title}" Grade ${book.grade}`);
            counts[book.id] = { oup: 0, school: 0, total: 0 };
          }
        });
        
        console.log('📚 Reverse matching complete, final counts:', counts);
        console.log('🎯 Final OUP by Book Keys:', Object.keys(oupByBook));
        console.log('🎯 Final School by Book Keys:', Object.keys(schoolByBook));
        
        setQuestionCounts(counts);
        console.log('✅ Question counts fetched:', counts);
      } catch (error) {
        console.error('❌ Error fetching question counts:', error);
      } finally {
        setLoadingQuestions(false);
      }
    };
    
    fetchQuestionCounts();
  }, [user?.assignedBooks, user?.schoolId]);

  // Toggle group expansion
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // Group books by Subject and Grade
  const groupedBooks = user?.assignedBooks?.reduce((acc, book) => {
    const groupKey = `${book.subject}-${book.grade}`;
    if (!acc[groupKey]) {
      acc[groupKey] = {
        subject: book.subject,
        grade: book.grade,
        books: []
      };
    }
    acc[groupKey].books.push(book);
    return acc;
  }, {} as { [key: string]: { subject: string; grade: string; books: typeof user.assignedBooks } }) || {};

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, return null (will be redirected by useAuthGuard)
  if (!isAuthenticated) {
    return null;
  }

  // Debug logging
  console.log('🎯 Teacher Dashboard - User:', user);
  console.log('🎯 Teacher Dashboard - Assigned Books:', user?.assignedBooks);
  console.log('🎯 Teacher Dashboard - Assigned Books Type:', typeof user?.assignedBooks);
  console.log('🎯 Teacher Dashboard - Assigned Books Length:', user?.assignedBooks?.length);

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar userRole="Teacher" currentPage="dashboard" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full lg:ml-[256px]">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 touch-manipulation"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FiMenu size={24} />
            </button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
              Teacher Dashboard
            </h1>
          </div>
        </header>

        <section className="bg-[#FFDBBB] p-4 sm:p-6 rounded-2xl mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-900">
            Welcome back, {user?.name || 'Teacher'}!
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Here is an overview of your quiz activities.
          </p>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <StatCard
            title="Assigned Books"
            value={user?.assignedBooks ? user.assignedBooks.length.toString() : "0"}
            icon={<FaBook />}
            color="bg-[#FF7A50]"
          />
          <StatCard
            title="Total Questions"
            value="151"
            icon={<FaPencilAlt />}
            color="bg-[#FF7A50]"
          />
          <StatCard
            title="Quizzes Created"
            value="28"
            icon={<FaClipboardList />}
            color="bg-[#FF7A50]"
          />
          <StatCard
            title="Chapters Done"
            value="22"
            icon={<FaTasks />}
            color="bg-[#FF7A50]"
            progress={73}
          />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          <div className="xl:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">
                Assigned Books
              </h3>
              <button className="text-blue-600 bg-blue-100 rounded-full p-2 touch-manipulation hover:bg-blue-200 transition-colors">
                <FiPlus size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {user?.assignedBooks && user.assignedBooks.length > 0 ? (
                Object.entries(groupedBooks).map(([groupKey, group]) => (
                  <BookGroupSection
                    key={groupKey}
                    groupTitle={`${group.subject} - ${group.grade.toString().replace(/^Grade\s/, 'Grade ')}`}
                    bookCount={group.books.length}
                    books={group.books}
                    isExpanded={expandedGroups[groupKey] ?? true}
                    onToggle={() => toggleGroup(groupKey)}
                    questionCounts={questionCounts}
                    schoolId={user?.schoolId || ''}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FaBook className="mx-auto mb-3 text-4xl text-gray-300" />
                  <p className="text-lg font-medium">No books assigned yet</p>
                  <p className="text-sm">Contact your admin to get books assigned to you</p>
                  {/* Debug info */}
                  <div className="mt-4 text-xs text-gray-400 bg-gray-100 p-3 rounded">
                    <p><strong>Debug Information:</strong></p>
                    <p>• User exists: {user ? 'Yes' : 'No'}</p>
                    <p>• User role: {user?.role}</p>
                    <p>• Subjects: {user?.subjects ? user.subjects.join(', ') : 'None'}</p>
                    <p>• Assigned Grades: {user?.assignedGrades ? user.assignedGrades.join(', ') : 'None'}</p>
                    <p>• AssignedBooks field: {user?.assignedBooks ? 'Exists' : 'Missing'}</p>
                    <p>• AssignedBooks count: {user?.assignedBooks?.length || 0}</p>
                    {user?.assignedBooks && user.assignedBooks.length > 0 && (
                      <div className="mt-2">
                        <p><strong>Books:</strong></p>
                        {user.assignedBooks.map((book, idx) => (
                          <p key={idx} className="ml-2">- {book.title} ({book.subject}, {book.grade})</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">To-Do List</h3>
              <button className="text-orange-600 bg-orange-100 rounded-full p-2 touch-manipulation hover:bg-orange-200 transition-colors">
                <FiPlus size={18} />
              </button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <TodoItem
                task="Add Questions for Science Explorer Chapter 2"
                date="January 5, 2025"
                color="#FF7A50"
              />
              <TodoItem
                task="Review Math Essential Chapter 1 Content"
                date="January 10, 2025"
                color="#FFC107"
              />
              <TodoItem
                task="Create Quiz for English Skills Builder"
                date="January 12, 2025"
                color="#4CAF50"
              />
              <TodoItem
                task="Check Student List for Social Sciences"
                date="January 12, 2025"
                color="#2196F3"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
