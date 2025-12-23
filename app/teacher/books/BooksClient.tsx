'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { useUserProfile } from '@/hooks/useUserProfile';

interface Chapter {
  id: number;
  title: string;
  slosCount: number;
  slos: string[];
  questions: number;
}

interface Book {
  id: number;
  title: string;
  subject: string;
  grade: string;
  gradeNumber: string;
  totalChapters: number;
  totalQuestions: number;
  status: string;
  chapters: Chapter[];
}

interface BooksClientProps {
  books: Book[];
  error: string | null;
}

export default function BooksClient({ books: allBooks, error: initialError }: BooksClientProps) {
  const { user } = useUserProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Merge teacher's assigned books with question count data from all books
  const teacherBooks = user?.assignedBooks?.map((assignedBook, index) => {
    // Normalize assigned book grade (remove "Grade " prefix if present)
    const normalizedAssignedGrade = assignedBook.grade.toString().replace('Grade ', '').trim();
    
    // Find matching book in allBooks data to get question count and chapters
    const matchingBookData = allBooks.find(b => {
      // Normalize book grade from server data
      const normalizedServerGrade = b.grade.toString().replace('Grade ', '').trim();
      
      return (
        b.title.toLowerCase() === assignedBook.title.toLowerCase() &&
        b.subject.toLowerCase() === assignedBook.subject.toLowerCase() &&
        normalizedServerGrade === normalizedAssignedGrade
      );
    });
    
    return {
      id: index + 1,
      title: assignedBook.title,
      subject: assignedBook.subject,
      grade: assignedBook.grade,
      gradeNumber: normalizedAssignedGrade,
      totalChapters: assignedBook.chapters || 0,
      totalQuestions: matchingBookData?.totalQuestions || 0,  // Use matched data or fallback to 0
      status: 'Active',
      chapters: matchingBookData?.chapters || []  // Use matched chapters or empty array
    };
  }) || [];

  const [selectedBook, setSelectedBook] = useState<Book | null>(teacherBooks.length > 0 ? teacherBooks[0] : null);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');

  const grades = ['all', ...Array.from(new Set(teacherBooks.map(b => b.gradeNumber))).sort((a, b) => parseInt(a) - parseInt(b))];
  
  const filteredBooks = selectedGrade === 'all' 
    ? teacherBooks 
    : teacherBooks.filter(book => book.gradeNumber === selectedGrade);

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      'english': 'from-blue-500 to-blue-600',
      'math': 'from-purple-500 to-purple-600',
      'mathematics': 'from-purple-500 to-purple-600',
      'urdu': 'from-green-500 to-green-600',
      'science': 'from-orange-500 to-orange-600',
      'computer': 'from-cyan-500 to-cyan-600',
    };
    return colors[subject.toLowerCase()] || 'from-gray-500 to-gray-600';
  };

  const getSubjectIcon = (subject: string) => {
    const icons: Record<string, string> = {
      'english': 'ri-english-input',
      'math': 'ri-calculator-line',
      'mathematics': 'ri-calculator-line',
      'urdu': 'ri-translate-2',
      'science': 'ri-flask-line',
      'computer': 'ri-computer-line',
    };
    return icons[subject.toLowerCase()] || 'ri-book-line';
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="Teacher" currentPage="books" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 lg:ml-64">
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <i className="ri-menu-line text-2xl"></i>
              </button>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">My Assigned Books</h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">View your assigned books, chapters, and details.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {teacherBooks.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-book-line text-3xl text-blue-500"></i>
                </div>
                <p className="text-gray-600 mb-4">No books have been assigned to you yet.</p>
                <p className="text-sm text-gray-500">Contact your school administrator to assign books.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Filter by Grade:</span>
                <div className="flex flex-wrap gap-2">
                  {grades.map(grade => (
                    <button
                      key={grade}
                      onClick={() => setSelectedGrade(grade)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedGrade === grade
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {grade === 'all' ? 'All Grades' : `Grade ${grade}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-blue-700">Assigned Books</h2>
                      <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {filteredBooks.length}
                      </span>
                    </div>
                    
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {filteredBooks.map((book) => (
                        <div
                          key={book.id}
                          onClick={() => setSelectedBook(book)}
                          className={`bg-white rounded-xl p-4 cursor-pointer transition-all border-2 ${
                            selectedBook?.id === book.id
                              ? 'border-blue-400 shadow-md'
                              : 'border-transparent hover:border-blue-200'
                          }`}
                        >
                          <div className="flex items-start gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getSubjectColor(book.subject)} flex items-center justify-center text-white flex-shrink-0`}>
                              <i className={`${getSubjectIcon(book.subject)} text-lg`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 truncate">{book.title}</h3>
                              <p className="text-sm text-gray-500">{book.subject} • {book.grade}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <i className="ri-book-open-line text-blue-500 text-sm"></i>
                              <span className="text-sm font-medium">{book.totalChapters} Chapters</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <i className="ri-question-line text-green-500 text-sm"></i>
                              <span className="text-sm font-medium">{book.totalQuestions} Questions</span>
                            </div>
                          </div>
                          
                          <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            {book.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  {selectedBook ? (
                    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-200">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getSubjectColor(selectedBook.subject)} flex items-center justify-center text-white shadow-lg`}>
                            <i className={`${getSubjectIcon(selectedBook.subject)} text-2xl`}></i>
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-1">{selectedBook.title}</h2>
                            <p className="text-gray-600">{selectedBook.subject} • {selectedBook.grade}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm text-gray-500">
                                <i className="ri-book-open-line mr-1"></i>
                                {selectedBook.totalChapters} Chapters
                              </span>
                              <span className="text-sm text-gray-500">
                                <i className="ri-question-line mr-1"></i>
                                {selectedBook.totalQuestions} Total Questions
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {selectedBook.chapters && selectedBook.chapters.length > 0 ? (
                          selectedBook.chapters.map((chapter) => (
                            <div key={chapter.id} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="text-lg font-bold text-gray-800 mb-2">{chapter.title}</h3>
                                  
                                  <div className="flex items-center gap-6 mb-3">
                                    <div className="flex items-center gap-2 text-gray-600">
                                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <i className="ri-target-line text-purple-600"></i>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium">{chapter.slosCount} SLOs</span>
                                        <p className="text-xs text-gray-500">Learning Outcomes</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <i className="ri-question-line text-blue-600"></i>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium">{chapter.questions} Questions</span>
                                        <p className="text-xs text-gray-500">Available</p>
                                      </div>
                                    </div>
                                  </div>

                                  {chapter.slos && chapter.slos.length > 0 && (
                                    <div className="mt-3">
                                      <p className="text-xs font-semibold text-gray-500 mb-2">SLOs (Student Learning Outcomes):</p>
                                      <div className="flex flex-wrap gap-2">
                                        {chapter.slos.slice(0, 5).map((slo, index) => (
                                          <span 
                                            key={index}
                                            className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 rounded-full text-xs font-medium border border-purple-200"
                                          >
                                            {slo}
                                          </span>
                                        ))}
                                        {chapter.slos.length > 5 && (
                                          <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                            +{chapter.slos.length - 5} more
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="bg-white rounded-xl p-8 text-center border-2 border-dashed border-gray-300">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <i className="ri-book-open-line text-3xl text-gray-400"></i>
                            </div>
                            <p className="text-gray-500 mb-2">No chapters with questions found</p>
                            <p className="text-sm text-gray-400">Add questions with chapter metadata for this book</p>
                          </div>
                        )}
                      </div>
                      
                      {selectedBook.totalQuestions > 0 && (
                        <div className="mt-6 pt-4 border-t border-orange-200">
                          <a
                            href={`/teacher/quiz?grade=${selectedBook.gradeNumber}&subject=${selectedBook.subject}&book=${encodeURIComponent(selectedBook.title)}`}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg"
                          >
                            <i className="ri-file-list-3-line"></i>
                            Generate Quiz from This Book
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
                      <i className="ri-book-2-line text-6xl text-gray-300 mb-4"></i>
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">Select a Book</h3>
                      <p className="text-gray-500">Choose a book from the left to view its chapters and SLOs</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
