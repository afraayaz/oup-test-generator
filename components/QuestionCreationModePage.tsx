"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

interface QuestionCreationModePageProps {
  userRole: "Teacher" | "Content Creator";
  baseRoute: string; // e.g., "/teacher/create-questions" or "/content-creator/create"
  apiEndpoint: string; // e.g., "/api/teacher/questions" or "/api/oup-creator/questions"
  showTopicField?: boolean;
  showSloField?: boolean;
}

export default function QuestionCreationModePage({
  userRole,
  baseRoute,
  apiEndpoint,
  showTopicField = false,
  showSloField = false,
}: QuestionCreationModePageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState("individual");
  const [formData, setFormData] = useState({
    subject: "",
    grade: "",
    book: "",
  });
  const { user } = useUserProfile();
  const router = useRouter();

  // Get all unique grades from user's assigned books
  const getAvailableGrades = () => {
    if (!user?.assignedBooks || user.assignedBooks.length === 0) {
      return [];
    }
    const grades = user.assignedBooks
      .map((book) => book.grade)
      .filter((value, index, self) => self.indexOf(value) === index);
    return grades.sort();
  };

  // Get subjects from user's assigned subjects
  const allAvailableSubjects = ["Mathematics", "Science", "English", "History", "Geography"];
  const subjects = user?.subjects && user.subjects.length > 0 ? user.subjects : allAvailableSubjects;

  // Get available books for selected grade and subject
  const getAvailableBooks = () => {
    if (!user?.assignedBooks || user.assignedBooks.length === 0) {
      return [];
    }
    return user.assignedBooks.filter(
      (book) => {
        // Normalize grade for comparison
        const normalizedBookGrade = String(book.grade).replace('Grade ', '').trim();
        const normalizedFormGrade = String(formData.grade).replace('Grade ', '').trim();
        
        return (!formData.grade || normalizedBookGrade === normalizedFormGrade) && 
               (!formData.subject || book.subject === formData.subject);
      }
    );
  };

  const handleGradeChange = (grade: string) => {
    setFormData({ ...formData, grade, book: "" });
  };

  const handleSubjectChange = (subject: string) => {
    setFormData({ ...formData, subject, book: "" });
  };

  const handleBookChange = (book: string) => {
    setFormData({ ...formData, book });
  };

  const downloadTemplate = () => {
    if (!formData.grade || !formData.subject || !formData.book) {
      return;
    }

    const data = [
      [`# Grade: ${formData.grade}, Subject: ${formData.subject}, Book: ${formData.book}`, "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
      ["chapter", "difficulty", "questionType", "question", "optionA", "optionB", "correctAnswer"],
      ["Chapter 1", "MEDIUM", "MCQ", "What is 5 + 3?", "7", "8", "B"],
      ["Chapter 1", "EASY", "TRUE_FALSE", "10 - 4 = 6", "", "", "TRUE"],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
    XLSX.writeFile(
      workbook,
      `OUP_Questions_Template_${formData.subject}_${formData.grade}.xlsx`
    );
  };

  const buildRouteParams = () => {
    return `?grade=${formData.grade}&subject=${formData.subject}&book=${formData.book}`;
  };

  return (
    <div className="h-screen bg-gray-50 w-screen overflow-hidden">
      <Sidebar
        userRole={userRole}
        currentPage="create"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

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

        {/* Main Content */}
        <div className="flex-1 overflow-auto w-full">
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                  Question Creation
                </h3>
                <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <button
                    className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-lg font-medium text-sm ${
                      mode === "individual"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    onClick={() => setMode("individual")}
                  >
                    Individual
                  </button>
                  <button
                    className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-lg font-medium text-sm ${
                      mode === "bulk"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    onClick={() => setMode("bulk")}
                  >
                    Bulk Upload
                  </button>
                  <button
                    onClick={downloadTemplate}
                    className={`w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-lg font-medium text-sm ${
                      formData.grade && formData.subject && formData.book
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    disabled={!formData.grade || !formData.subject || !formData.book}
                  >
                    Download Template
                  </button>
                </div>

                {mode === "individual" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Grade *
                      </label>
                      <select
                        value={formData.grade}
                        onChange={(e) => handleGradeChange(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Grade</option>
                        {getAvailableGrades().map((grade) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.grade && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subject *
                        </label>
                        <select
                          value={formData.subject}
                          onChange={(e) => handleSubjectChange(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Subject</option>
                          {subjects.map((subject) => (
                            <option key={subject} value={subject}>
                              {subject}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {formData.subject && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Book *
                        </label>
                        <select
                          value={formData.book}
                          onChange={(e) => handleBookChange(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Book</option>
                          {getAvailableBooks().map((book) => (
                            <option key={book.id} value={book.title}>
                              {book.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {formData.book && (
                      <button
                        onClick={() =>
                          router.push(`${baseRoute}/individual${buildRouteParams()}`)
                        }
                        className="w-full min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                      >
                        Proceed to Create Question
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="flex justify-center mb-4">
                      <i className="ri-upload-cloud-line text-4xl text-gray-400"></i>
                    </div>
                    <p className="text-gray-600 mb-4">
                      First select Grade, Subject and Book, then download the template or upload your file.
                    </p>
                    {formData.book && (
                      <button
                        onClick={() =>
                          router.push(`${baseRoute}/bulk${buildRouteParams()}`)
                        }
                        className="min-h-[44px] px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                      >
                        Go to Bulk Upload
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 sm:mt-6">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <i className="ri-information-line text-blue-600"></i>
                  Helpful Tips
                </h4>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>
                    • <strong>Individual:</strong> Create questions one at a time with full
                    control
                  </li>
                  <li>
                    • <strong>Bulk Upload:</strong> Import multiple questions from CSV/Excel
                  </li>
                  <li>• Download template for correct file format</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
