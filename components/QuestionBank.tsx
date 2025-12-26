"use client";

import { useState, useEffect, useMemo } from "react";

export interface Question {
  id: string;
  subject: string;
  grade: string;
  book: string;
  chapter: string;
  difficulty: string;
  type: string;
  questionText?: string;
  createdAt?: string;
  createdByName?: string;
  createdBy?: string;
}

interface QuestionBankProps {
  apiEndpoint: string; // e.g., "/api/oup-creator/questions" or "/api/teacher/questions"
  userRole: "content_creator" | "teacher";
  userId?: string;
  schoolId?: string;
  schoolName?: string;
  onEdit?: (question: Question) => void;
  onDelete?: (questionId: string) => void;
  allowEdit?: boolean;
  allowDelete?: boolean;
}

const typeColors: { [key: string]: string } = {
  multiple: "bg-blue-100 text-blue-800",
  truefalse: "bg-purple-100 text-purple-800",
  short: "bg-green-100 text-green-800",
  long: "bg-orange-100 text-orange-800",
  fillblanks: "bg-pink-100 text-pink-800",
  "multiple-choice": "bg-blue-100 text-blue-800",
  matching: "bg-cyan-100 text-cyan-800",
  ordering: "bg-indigo-100 text-indigo-800",
  categorization: "bg-yellow-100 text-yellow-800",
};

const typeLabels: { [key: string]: string } = {
  multiple: "MCQ",
  truefalse: "True/False",
  short: "Short",
  long: "Long",
  fillblanks: "Fill Blanks",
  "multiple-choice": "MCQ",
  matching: "Matching",
  ordering: "Ordering",
  categorization: "Categorization",
};

export default function QuestionBank({
  apiEndpoint,
  userRole,
  userId,
  schoolId,
  schoolName,
  onEdit,
  onDelete,
  allowEdit = true,
  allowDelete = true,
}: QuestionBankProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ subject: "", grade: "", book: "" });
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Question>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [userId]);

  const fetchQuestions = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const headers: Record<string, string> = {
        "x-user-id": userId || "",
        "x-user-role": userRole,
      };
      if (schoolId) {
        headers["x-school-id"] = schoolId;
      }
      if (schoolName) {
        headers["x-school-name"] = schoolName;
      }
      const response = await fetch(apiEndpoint, {
        method: "GET",
        headers,
      });

      const data = await response.json();
      if (data.success || Array.isArray(data)) {
        // Handle both formats: {success: true, questions: [...]} or direct array
        const allQuestions = Array.isArray(data) ? data : data.questions || [];
        // Filter to show only questions created by this user
        const userQuestions = allQuestions.filter(
          (q: any) => q.createdBy === userId
        );
        setQuestions(userQuestions);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setEditFormData({
      questionText: question.questionText,
      difficulty: question.difficulty,
      chapter: question.chapter,
    });
    onEdit?.(question);
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion) return;

    setIsSaving(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-user-id": userId || "",
        "x-user-role": userRole,
      };
      if (schoolId) {
        headers["x-school-id"] = schoolId;
      }
      if (schoolName) {
        headers["x-school-name"] = schoolName;
      }
      const response = await fetch(
        `${apiEndpoint}/${editingQuestion.id}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(editFormData),
        }
      );

      const result = await response.json();

      if (response.ok) {
        // Update the local state
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === editingQuestion.id
              ? { ...q, ...editFormData }
              : q
          )
        );
        setEditingQuestion(null);
        setEditFormData({});
      } else {
        alert(`Error updating question: ${result.error}`);
      }
    } catch (error) {
      console.error("Error updating question:", error);
      alert("Failed to update question");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const headers: Record<string, string> = {
        "x-user-id": userId || "",
        "x-user-role": userRole,
      };
      if (schoolId) {
        headers["x-school-id"] = schoolId;
      }
      if (schoolName) {
        headers["x-school-name"] = schoolName;
      }
      const response = await fetch(
        `${apiEndpoint}/${questionId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (response.ok) {
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
        onDelete?.(questionId);
      } else {
        alert("Failed to delete question");
      }
    } catch (error) {
      console.error("Error deleting question:", error);
      alert("Failed to delete question");
    }
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (filters.subject && q.subject !== filters.subject) return false;
      if (filters.grade && q.grade !== filters.grade) return false;
      if (filters.book && q.book !== filters.book) return false;
      return true;
    });
  }, [questions, filters]);

  const uniqueSubjects = useMemo(
    () => [...new Set(questions.map((q) => q.subject))].sort(),
    [questions]
  );
  const uniqueGrades = useMemo(
    () => [...new Set(questions.map((q) => q.grade))].sort(),
    [questions]
  );
  const uniqueBooks = useMemo(
    () => [...new Set(questions.map((q) => q.book))].sort(),
    [questions]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading questions...</div>
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 space-y-3 sm:space-y-4 border border-gray-100">
        <h3 className="font-semibold text-sm sm:text-base text-gray-900">Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
              Subject
            </label>
            <select
              value={filters.subject}
              onChange={(e) =>
                setFilters({ ...filters, subject: e.target.value })
              }
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm bg-white hover:border-gray-400 transition-colors"
            >
              <option value="">All Subjects</option>
              {uniqueSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
              Grade
            </label>
            <select
              value={filters.grade}
              onChange={(e) =>
                setFilters({ ...filters, grade: e.target.value })
              }
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm bg-white hover:border-gray-400 transition-colors"
            >
              <option value="">All Grades</option>
              {uniqueGrades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
              Book
            </label>
            <select
              value={filters.book}
              onChange={(e) => setFilters({ ...filters, book: e.target.value })}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm bg-white hover:border-gray-400 transition-colors"
            >
              <option value="">All Books</option>
              {uniqueBooks.map((book) => (
                <option key={book} value={book}>
                  {book}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm p-3 sm:p-4 border border-blue-200">
          <div className="text-lg sm:text-2xl font-bold text-blue-900">
            {filteredQuestions.length}
          </div>
          <div className="text-xs sm:text-sm text-blue-700 font-medium">Questions</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm p-3 sm:p-4 border border-purple-200">
          <div className="text-lg sm:text-2xl font-bold text-purple-900">
            {uniqueSubjects.length}
          </div>
          <div className="text-xs sm:text-sm text-purple-700 font-medium">Subjects</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm p-3 sm:p-4 border border-green-200">
          <div className="text-lg sm:text-2xl font-bold text-green-900">
            {uniqueGrades.length}
          </div>
          <div className="text-xs sm:text-sm text-green-700 font-medium">Grades</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm p-3 sm:p-4 border border-orange-200">
          <div className="text-lg sm:text-2xl font-bold text-orange-900">
            {uniqueBooks.length}
          </div>
          <div className="text-xs sm:text-sm text-orange-700 font-medium">Books</div>
        </div>
      </div>

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center border border-gray-100">
          <div className="flex justify-center mb-3">
            <i className="ri-file-list-3-line text-4xl text-gray-300"></i>
          </div>
          <p className="text-sm sm:text-base text-gray-600 font-medium">
            {questions.length === 0
              ? "No questions yet. Create your first question!"
              : "No questions match your filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-3.5">
          {filteredQuestions.map((question) => (
            <div
              key={question.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md border border-gray-200 hover:border-blue-300 transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Card Header with Type Badge */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between border-b border-gray-200">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                    typeColors[question.type] ||
                    "bg-gray-100 text-gray-800"
                  }`}
                >
                  {typeLabels[question.type] || question.type}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                  {question.difficulty}
                </span>
              </div>

              {/* Card Body */}
              <div className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 space-y-2">
                {/* Question Text Preview */}
                <p className="text-xs sm:text-sm text-gray-800 leading-relaxed line-clamp-3 font-medium">
                  {question.questionText || "No text provided"}
                </p>

                {/* Metadata */}
                <div className="text-xs text-gray-600 space-y-1 bg-gray-50 -mx-3 sm:-mx-4 -mb-2.5 sm:-mb-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-b-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Subject:</span>
                    <span className="text-gray-600">{question.subject}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Grade:</span>
                    <span className="text-gray-600">{question.grade}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Book:</span>
                    <span className="text-gray-600">{question.book}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Chapter:</span>
                    <span className="text-gray-600">{question.chapter}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer - Actions */}
              <div className="bg-gray-50 border-t border-gray-200 px-3 sm:px-4 py-2.5 flex gap-2">
                {allowEdit && (
                  <button
                    onClick={() => handleEdit(question)}
                    className="flex-1 px-2 sm:px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-xs sm:text-sm font-semibold transition-colors border border-blue-200"
                  >
                    <i className="ri-edit-line mr-1"></i>Edit
                  </button>
                )}
                {allowDelete && (
                  <button
                    onClick={() => handleDeleteQuestion(question.id)}
                    className="flex-1 px-2 sm:px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-xs sm:text-sm font-semibold transition-colors border border-red-200"
                  >
                    <i className="ri-delete-bin-line mr-1"></i>Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-5 sm:p-6 max-w-md w-full border border-gray-200">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-5 flex items-center">
              <i className="ri-edit-2-line mr-2 text-blue-600"></i>
              Edit Question
            </h3>

            <div className="space-y-3 sm:space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Subject (Read-only) */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  value={editingQuestion.subject}
                  disabled
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 cursor-not-allowed text-xs sm:text-sm"
                />
              </div>

              {/* Grade (Read-only) */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Grade
                </label>
                <input
                  type="text"
                  value={editingQuestion.grade}
                  disabled
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 cursor-not-allowed text-xs sm:text-sm"
                />
              </div>

              {/* Book (Read-only) */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Book
                </label>
                <input
                  type="text"
                  value={editingQuestion.book}
                  disabled
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 cursor-not-allowed text-xs sm:text-sm"
                />
              </div>

              {/* Type (Read-only) */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Type
                </label>
                <input
                  type="text"
                  value={typeLabels[editingQuestion.type] || editingQuestion.type}
                  disabled
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 cursor-not-allowed text-xs sm:text-sm"
                />
              </div>

              {/* Question Text (Editable) */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Question Text *
                </label>
                <textarea
                  value={editFormData.questionText || ""}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      questionText: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm resize-none"
                />
              </div>

              {/* Chapter (Editable) */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Chapter *
                </label>
                <input
                  type="text"
                  value={editFormData.chapter || ""}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, chapter: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                />
              </div>

              {/* Difficulty (Editable) */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                  Difficulty *
                </label>
                <select
                  value={editFormData.difficulty || ""}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      difficulty: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm bg-white"
                >
                  <option value="">Select difficulty</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-5 sm:mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setEditingQuestion(null);
                  setEditFormData({});
                }}
                className="flex-1 px-3 sm:px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-xs sm:text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 px-3 sm:px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm transition-colors"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
