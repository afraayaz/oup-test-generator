"use client";

import { useState, useEffect, useMemo } from "react";
import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter, useSearchParams } from "next/navigation";
import QuestionForm, { QuestionFormData } from "@/components/QuestionForm";

function CreateIndividualQuestionPageContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [systemBooks, setSystemBooks] = useState<Array<{ id: string; title: string; subject: string; grade: string; chapters?: number }>>([]);
  const { user } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial values from query params
  const defaultGrade = searchParams.get("grade") || "";
  const defaultSubject = searchParams.get("subject") || "";
  const defaultBook = searchParams.get("book") || "";

  // Fetch all books from all subjects for Content Creators
  useEffect(() => {
    const fetchSystemBooks = async () => {
      if (!user) return;
      
      try {
        // Extract unique subjects from assignedBooks
        const uniqueSubjects = new Set<string>();
        if (user.assignedBooks) {
          user.assignedBooks.forEach((book: any) => {
            if (book.subject) {
              uniqueSubjects.add(book.subject);
            }
          });
        }
        
        const userSubjects = Array.from(uniqueSubjects);
        console.log('👤 CC assigned subjects (from books):', userSubjects);
        
        if (userSubjects.length === 0) {
          console.log('⚠️ No subjects found in assignedBooks');
          return;
        }
        
        // Fetch books for all assigned subjects
        const allBooksPromises = userSubjects.map(async (subjectName: string) => {
          const response = await fetch(`/api/admin/books-by-subject?subject=${encodeURIComponent(subjectName)}`);
          const data = await response.json();
          const books = data.books || [];
          console.log(`📚 Fetched books for ${subjectName}:`, books.length);
          
          // Ensure each book has the subject field set
          return books.map((book: any) => ({
            ...book,
            subject: book.subject || subjectName
          }));
        });
        
        const booksArrays = await Promise.all(allBooksPromises);
        const allBooks = booksArrays.flat();
        
        console.log('📚 Total systemBooks for CC:', allBooks.length);
        console.log('📚 SystemBooks with subjects:', allBooks.map(b => ({ title: b.title, subject: b.subject, grade: b.grade })));
        setSystemBooks(allBooks);
      } catch (error) {
        console.error('❌ Error fetching system books:', error);
      }
    };
    
    if (user?.role === 'content_creator') {
      fetchSystemBooks();
    }
  }, [user]);

  // Extract dynamic grades and books from user's assignedBooks or systemBooks
  const { availableGrades, availableSubjects, submittedBooks } = useMemo(() => {
    const grades = new Set<string>();
    const subjects = new Set<string>();
    const books: Array<{ id: string; title: string; subject: string; grade: string; chapters?: number }> = [];

    // For Content Creators, use systemBooks; for others, use assignedBooks
    const booksSource = user?.role === 'content_creator' && systemBooks.length > 0 
      ? systemBooks 
      : (user?.assignedBooks || []);

    console.log('📖 Books source for form:', user?.role === 'content_creator' ? 'systemBooks' : 'assignedBooks', booksSource.length);

    booksSource.forEach((book: any) => {
      grades.add(book.grade);
      subjects.add(book.subject);
      books.push({
        id: book.id || book.title,
        title: book.title,
        subject: book.subject,
        grade: book.grade,
        chapters: book.chapters || 0,
      });
    });

    return {
      availableGrades: Array.from(grades).sort(),
      availableSubjects: Array.from(subjects).sort(),
      submittedBooks: books,
    };
  }, [user?.assignedBooks, user?.role, systemBooks]);

  const handleQuestionSubmit = async (questionData: QuestionFormData) => {
    console.log('🎯 Submit called with userId:', user?.uid, 'User object:', user);
    
    if (!user || !user.uid) {
      alert("Please wait for user profile to load");
      return;
    }
    setLoading(true);
    try {
      console.log('[CreateQuestion] Submitting question data:', {
        questionText: questionData.questionText,
        allFields: Object.keys(questionData),
        fullData: questionData
      });

      const response = await fetch("/api/oup-creator/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.uid || "",
          "x-user-name": user?.name || "",
          "x-user-role": "content_creator",
        },
        body: JSON.stringify({
          ...questionData,
          userId: user?.uid,
          createdBy: user?.uid,
        }),
      });

      if (!response.ok) throw new Error("Failed to create question");

      const result = await response.json();
      
      setSuccessMessage("✅ Question created successfully! It's now in your Question Bank.");
      
      // Scroll to top immediately to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      setTimeout(() => setSuccessMessage(""), 5000); // Show message for 5 seconds
    } catch (error) {
      console.error("Error creating question:", error);
      setSuccessMessage("❌ Failed to create question. Please try again.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToBank = () => {
    router.push("/content-creator/create?mode=bank");
  };

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="h-screen bg-gray-50 w-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar userRole="Content Creator" currentPage="create" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="fixed top-0 right-0 bottom-0 left-0 lg:left-64 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Create Question</h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto w-full">
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {successMessage && (
              <div className="sticky top-0 z-20 mb-6 p-4 rounded-lg bg-green-50 border-2 border-green-500 text-green-800 shadow-lg animate-pulse">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{successMessage.includes('✅') ? '✅' : '❌'}</span>
                  <span className="font-semibold">{successMessage}</span>
                </div>
              </div>
            )}

            {!user ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading user profile...</p>
              </div>
            ) : (
              <QuestionForm
                onSubmit={handleQuestionSubmit}
                onSwitchToBank={handleSwitchToBank}
                loading={loading}
                submittedBooks={submittedBooks}
                subjects={availableSubjects}
                grades={availableGrades}
                defaultSubject={defaultSubject}
                defaultGrade={defaultGrade}
                defaultBook={defaultBook}
                showTopicField={true}
                showSloField={true}
                userId={user?.uid}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateIndividualQuestionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateIndividualQuestionPageContent />
    </Suspense>
  );
}
