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
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 space-y-3 sm:space-y-4">
        <h3 className="font-semibold text-sm sm:text-base text-gray-900">Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Subject
            </label>
            <select
              value={filters.subject}
              onChange={(e) =>
                setFilters({ ...filters, subject: e.target.value })
              }
              className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Grade
            </label>
            <select
              value={filters.grade}
              onChange={(e) =>
                setFilters({ ...filters, grade: e.target.value })
              }
              className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Book
            </label>
            <select
              value={filters.book}
              onChange={(e) => setFilters({ ...filters, book: e.target.value })}
              className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            {filteredQuestions.length}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">Questions</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            {uniqueSubjects.length}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">Subjects</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            {uniqueGrades.length}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">Grades</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            {uniqueBooks.length}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">Books</div>
        </div>
      </div>

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8 text-center">
          <p className="text-sm sm:text-base text-gray-500">
            {questions.length === 0
              ? "No questions yet. Create your first question!"
              : "No questions match your filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {filteredQuestions.map((question) => (
            <div
              key={question.id}
              className="bg-indigo-50 rounded-lg shadow-sm p-3 sm:p-4 border border-indigo-200 hover:shadow-md hover:border-indigo-300 transition-all"
            >
              {/* Type Badge */}
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs sm:text-sm font-medium ${
                    typeColors[question.type] ||
                    "bg-gray-100 text-gray-800"
                  }`}
                >
                  {typeLabels[question.type] || question.type}
                </span>
                <span className="text-xs text-gray-500">
                  {question.difficulty}
                </span>
              </div>

              {/* Question Text Preview */}
              <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3 line-clamp-2">
                {question.questionText}
              </p>

              {/* Metadata */}
              <div className="text-xs text-gray-500 space-y-1 mb-3 sm:mb-4 bg-gray-50 p-2 rounded">
                <p>
                  <strong>Subject:</strong> {question.subject}
                </p>
                <p>
                  <strong>Grade:</strong> {question.grade}
                </p>
                <p>
                  <strong>Book:</strong> {question.book}
                </p>
                <p>
                  <strong>Chapter:</strong> {question.chapter}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                {allowEdit && (
                  <button
                    onClick={() => handleEdit(question)}
                    className="flex-1 px-2 sm:px-3 py-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 text-xs sm:text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                )}
                {allowDelete && (
                  <button
                    onClick={() => handleDeleteQuestion(question.id)}
                    className="flex-1 px-2 sm:px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200 text-xs sm:text-sm font-medium transition-colors"
                  >
                    Delete
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
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
              Edit Question
            </h3>

            <div className="space-y-3 sm:space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Subject (Read-only) */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={editingQuestion.subject}
                  disabled
                  className="w-full px-2 sm:px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed text-sm"
                />
              </div>

              {/* Grade (Read-only) */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Grade
                </label>
                <input
                  type="text"
                  value={editingQuestion.grade}
                  disabled
                  className="w-full px-2 sm:px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed text-sm"
                />
              </div>

              {/* Book (Read-only) */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Book
                </label>
                <input
                  type="text"
                  value={editingQuestion.book}
                  disabled
                  className="w-full px-2 sm:px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed text-sm"
                />
              </div>

              {/* Type (Read-only) */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <input
                  type="text"
                  value={typeLabels[editingQuestion.type] || editingQuestion.type}
                  disabled
                  className="w-full px-2 sm:px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 cursor-not-allowed text-sm"
                />
              </div>

              {/* Question Text (Editable) */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Chapter (Editable) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chapter *
                </label>
                <input
                  type="text"
                  value={editFormData.chapter || ""}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, chapter: e.target.value })
                  }
                  className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Difficulty (Editable) */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Select</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={() => {
                  setEditingQuestion(null);
                  setEditFormData({});
                }}
                className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 text-sm"
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
