"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter, useSearchParams } from "next/navigation";
import QuestionForm, { QuestionFormData } from "@/components/QuestionForm";

export default function CreateIndividualQuestionPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { user } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial values from query params
  const defaultGrade = searchParams.get("grade") || "";
  const defaultSubject = searchParams.get("subject") || "";
  const defaultBook = searchParams.get("book") || "";

  // Extract dynamic grades and books from user's assignedBooks
  const { availableGrades, availableSubjects, submittedBooks } = useMemo(() => {
    const grades = new Set<string>();
    const subjects = new Set<string>();
    const books: Array<{ id: string; title: string; subject: string; grade: string; chapters?: number }> = [];

    if (user?.assignedBooks) {
      user.assignedBooks.forEach((book: any) => {
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
    }

    return {
      availableGrades: Array.from(grades).sort(),
      availableSubjects: Array.from(subjects).sort(),
      submittedBooks: books,
    };
  }, [user?.assignedBooks]);

  const handleQuestionSubmit = async (questionData: QuestionFormData) => {
    setLoading(true);
    try {
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

      setSuccessMessage("✅ Question created successfully! It's now in your Question Bank.");
      setTimeout(() => setSuccessMessage(""), 2000);
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Error creating question:", error);
      setSuccessMessage("❌ Failed to create question. Please try again.");
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
              <div className="mb-6 p-4 rounded-lg bg-green-100 text-green-800">
                {successMessage}
              </div>
            )}

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
            />
          </div>
        </div>
      </div>
    </div>
  );
}
