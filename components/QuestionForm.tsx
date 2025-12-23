"use client";

import { useState } from "react";
import InlineMathToolbar from "./InlineMathToolbar";
import UrduKeyboard from "./UrduKeyboard";

interface QuestionFormProps {
  onSubmit: (questionData: QuestionFormData) => Promise<void>;
  loading?: boolean;
  submittedBooks?: Array<{ id: string; title: string; subject: string; grade: string; chapters?: number }>;
  subjects?: string[];
  grades?: string[];
  defaultGrade?: string;
  defaultSubject?: string;
  defaultBook?: string;
  showTopicField?: boolean;
  showSloField?: boolean;
  apiEndpoint?: string;
}

export interface QuestionFormData {
  type: "multiple" | "truefalse" | "short" | "long" | "fillblanks";
  subject: string;
  grade: string;
  book: string;
  chapter: string;
  topic?: string;
  slo?: string;
  difficulty: "Easy" | "Medium" | "Hard";
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  blanks: { [key: string]: string[] };
}

const initialFormData: QuestionFormData = {
  type: "multiple",
  subject: "",
  grade: "",
  book: "",
  chapter: "",
  difficulty: "Medium",
  questionText: "",
  options: ["", "", "", ""],
  correctAnswer: "",
  explanation: "",
  blanks: {},
};

export default function QuestionForm({
  onSubmit,
  loading = false,
  submittedBooks = [],
  subjects = ["Mathematics", "Science", "English", "History", "Geography"],
  grades = [],
  defaultGrade,
  defaultSubject,
  defaultBook,
  showTopicField = false,
  showSloField = false,
}: QuestionFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<QuestionFormData>(initialFormData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [toast, setToast] = useState<{ type: "error" | "success" | "info"; message: string } | null>(null);
  const [focusedMathField, setFocusedMathField] = useState<"question" | "explanation" | "option" | "blank" | null>(null);
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1);
  const [activeBlankId, setActiveBlankId] = useState<string | null>(null);

  // Initialize with defaults
  useState(() => {
    if (defaultGrade || defaultSubject || defaultBook) {
      setFormData((prev) => ({
        ...prev,
        grade: defaultGrade || "",
        subject: defaultSubject || "",
        book: defaultBook || "",
      }));
    }
  });

  const optionLabels = ["A", "B", "C", "D", "E", "F"];

  const handleQuestionTypeChange = (type: QuestionFormData["type"]) => {
    setFormData((prev) => ({
      ...prev,
      type,
      options: type === "multiple" ? ["", "", "", ""] : [],
      blanks: type === "fillblanks" ? { blank1: [] } : {},
      correctAnswer: "",
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    if (formData.options.length < 6) {
      setFormData((prev) => ({ ...prev, options: [...prev.options, ""] }));
    }
  };

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData((prev) => ({
        ...prev,
        options: newOptions,
        correctAnswer: newOptions.includes(prev.correctAnswer) ? prev.correctAnswer : "",
      }));
    }
  };

  const handleBlankChange = (blankId: string, value: string) => {
    const answers = value.split("|").filter(Boolean);
    setFormData((prev) => ({
      ...prev,
      blanks: { ...prev.blanks, [blankId]: answers },
    }));
  };

  const addBlank = () => {
    const newBlankId = `blank${Object.keys(formData.blanks).length + 1}`;
    setFormData((prev) => ({
      ...prev,
      blanks: { ...prev.blanks, [newBlankId]: [] },
    }));
  };

  const removeBlank = (blankId: string) => {
    const newBlanks = { ...formData.blanks };
    delete newBlanks[blankId];
    setFormData((prev) => ({ ...prev, blanks: newBlanks }));
  };

  const insertMathSymbol = (symbol: string) => {
    if (focusedMathField === "question") {
      setFormData((prev) => ({
        ...prev,
        questionText: prev.questionText + symbol,
      }));
    } else if (focusedMathField === "explanation") {
      setFormData((prev) => ({
        ...prev,
        explanation: prev.explanation + symbol,
      }));
    } else if (focusedMathField === "option" && activeOptionIndex >= 0) {
      const newOptions = [...formData.options];
      newOptions[activeOptionIndex] = (newOptions[activeOptionIndex] || "") + symbol;
      setFormData((prev) => ({
        ...prev,
        options: newOptions,
      }));
    } else if (focusedMathField === "blank" && activeBlankId) {
      handleBlankChange(activeBlankId, (formData.blanks[activeBlankId]?.join("|") || "") + symbol);
    }
  };

  const insertLanguageCharacter = (character: string) => {
    // Works for both math symbols and language characters (Urdu, etc.)
    insertMathSymbol(character);
  };

  const handleMathFieldFocus = (field: "question" | "explanation" | "option" | "blank", optionIdx?: number, blankId?: string) => {
    setFocusedMathField(field);
    if (optionIdx !== undefined) setActiveOptionIndex(optionIdx);
    if (blankId) setActiveBlankId(blankId);
  };

  const isMathSubject = formData.subject.toLowerCase().includes("math") || formData.subject.toLowerCase().includes("mathematics");
  const isUrduSubject = formData.subject.toLowerCase().includes("urdu");

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.subject) newErrors.subject = "Subject is required";
    if (!formData.grade) newErrors.grade = "Grade is required";
    if (!formData.book) newErrors.book = "Book is required";
    if (!formData.chapter) newErrors.chapter = "Chapter is required";
    if (showTopicField && !formData.topic) newErrors.topic = "Topic is required";
    // SLO is now optional - no validation required

    if (!formData.questionText.trim()) newErrors.questionText = "Question text is required";

    if (formData.type === "multiple") {
      const nonEmptyOptions = formData.options.filter((opt) => opt.trim());
      if (nonEmptyOptions.length < 2) {
        newErrors.options = "At least 2 options required for MCQ";
      }
      if (!formData.correctAnswer || !formData.options.includes(formData.correctAnswer)) {
        newErrors.correctAnswer = "Please select a correct answer";
      }
    } else if (formData.type === "truefalse") {
      if (!["true", "false"].includes(formData.correctAnswer.toLowerCase())) {
        newErrors.correctAnswer = "Please select True or False";
      }
    } else if (formData.type === "fillblanks") {
      const blanksCount = (formData.questionText.match(/{blank\d+}|___/g) || []).length;
      if (Object.keys(formData.blanks).length !== blanksCount) {
        newErrors.blanks = "Number of blanks must match question text";
      }
      for (const blankId of Object.keys(formData.blanks)) {
        if (formData.blanks[blankId].length === 0) {
          newErrors[blankId] = `Please add answers for ${blankId}`;
        }
      }
    } else if (!formData.correctAnswer.trim()) {
      newErrors.correctAnswer = "Correct answer is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = async () => {
    if (!validateForm()) {
      setToast({ type: "error", message: "Please fix form errors" });
      return;
    }

    try {
      await onSubmit(formData);
      setToast(null);
    } catch (error) {
      console.error("Error in form submission:", error);
    }
  };

  const getAvailableBooks = () => {
    if (!submittedBooks) return [];
    return submittedBooks.filter(
      (book) => book.grade === formData.grade && book.subject === formData.subject
    );
  };

  const getAvailableChapters = () => {
    if (!formData.book || !submittedBooks) return [];
    const selectedBook = submittedBooks.find((book) => book.title === formData.book);
    if (!selectedBook || !selectedBook.chapters) return [];
    return Array.from({ length: selectedBook.chapters }, (_, i) => `Chapter ${i + 1}`);
  };

  return (
    <div className="w-full">
      {/* Toast Message */}
      {toast && (
        <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg text-sm sm:text-base ${toast.type === "success" ? "bg-green-100 text-green-800" : toast.type === "error" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>
          {toast.message}
        </div>
      )}

      {/* Step 1: Metadata */}
      {currentStep === 1 && (
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 w-full overflow-hidden">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold mb-3 sm:mb-4 lg:mb-6 text-gray-900">Question Metadata</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
            {/* Subject */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Subject *</label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value, book: "", chapter: "" })}
                className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm ${errors.subject ? "border-red-500" : "border-gray-300"}`}
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
              {errors.subject && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.subject}</p>}
            </div>

            {/* Grade */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Grade *</label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value, book: "", chapter: "" })}
                disabled={!formData.subject}
                className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-xs sm:text-sm ${errors.grade ? "border-red-500" : "border-gray-300"}`}
              >
                <option value="">Select Grade</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
              {errors.grade && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.grade}</p>}
            </div>

            {/* Book */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Book *</label>
              <select
                value={formData.book}
                onChange={(e) => setFormData({ ...formData, book: e.target.value, chapter: "" })}
                disabled={!formData.grade}
                className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-xs sm:text-sm ${errors.book ? "border-red-500" : "border-gray-300"}`}
              >
                <option value="">Select Book</option>
                {getAvailableBooks().map((book) => (
                  <option key={book.id} value={book.title}>
                    {book.title}
                  </option>
                ))}
              </select>
              {errors.book && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.book}</p>}
            </div>

            {/* Chapter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Chapter *</label>
              <select
                value={formData.chapter}
                onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                disabled={!formData.book}
                className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-xs sm:text-sm ${errors.chapter ? "border-red-500" : "border-gray-300"}`}
              >
                <option value="">Select Chapter</option>
                {getAvailableChapters().map((chapter) => (
                  <option key={chapter} value={chapter}>
                    {chapter}
                  </option>
                ))}
              </select>
              {errors.chapter && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.chapter}</p>}
            </div>

            {/* Topic (Optional) */}
            {showTopicField && (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Topic *</label>
                <input
                  type="text"
                  value={formData.topic || ""}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="e.g., Linear Equations"
                  className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm ${errors.topic ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.topic && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.topic}</p>}
              </div>
            )}

            {/* SLO (Optional) */}
            {showSloField && (
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">SLO</label>
                <input
                  type="text"
                  value={formData.slo || ""}
                  onChange={(e) => setFormData({ ...formData, slo: e.target.value })}
                  placeholder="Student Learning Outcome (Optional)"
                  className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm ${errors.slo ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.slo && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.slo}</p>}
              </div>
            )}

            {/* Difficulty */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Difficulty *</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* Question Type */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Question Type *</label>
              <select
                value={formData.type}
                onChange={(e) => handleQuestionTypeChange(e.target.value as any)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
              >
                <option value="multiple">Multiple Choice (MCQ)</option>
                <option value="truefalse">True/False</option>
                <option value="short">Short Answer</option>
                <option value="long">Long Answer</option>
                <option value="fillblanks">Fill in the Blanks</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setCurrentStep(2)}
            className="w-full px-3 sm:px-4 lg:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm lg:text-base mt-4 sm:mt-6 lg:mt-8"
          >
            Next: Question Content
          </button>
        </div>
      )}

      {/* Step 2: Question Content */}
      {currentStep === 2 && (
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 lg:p-6 w-full overflow-hidden">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold mb-3 sm:mb-4 lg:mb-6 text-gray-900">Question Content</h2>

          {/* Question Text */}
          <div className="mb-3 sm:mb-4 lg:mb-6">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Question Text *</label>
            {isMathSubject && focusedMathField === "question" && (
              <InlineMathToolbar
                isVisible={true}
                onInsert={insertMathSymbol}
              />
            )}
            {isUrduSubject && focusedMathField === "question" && (
              <UrduKeyboard
                isVisible={true}
                onInsert={insertLanguageCharacter}
              />
            )}
            <textarea
              value={formData.questionText}
              onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
              onFocus={() => (isMathSubject || isUrduSubject) && handleMathFieldFocus("question")}
              onBlur={() => (isMathSubject || isUrduSubject) && setFocusedMathField(null)}
              placeholder="Enter your question here"
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors.questionText ? "border-red-500" : "border-gray-300"}`}
            />
            {errors.questionText && <p className="text-red-500 text-sm mt-1">{errors.questionText}</p>}
          </div>

          {/* MCQ Options */}
          {formData.type === "multiple" && (
            <div className="mb-3 sm:mb-4 lg:mb-6">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Options *</label>
              <div className="space-y-2 sm:space-y-3">
                {formData.options.map((option, i) => (
                  <div key={i}>
                    {isMathSubject && focusedMathField === "option" && activeOptionIndex === i && (
                      <InlineMathToolbar
                        isVisible={true}
                        onInsert={insertMathSymbol}
                      />
                    )}
                    {isUrduSubject && focusedMathField === "option" && activeOptionIndex === i && (
                      <UrduKeyboard
                        isVisible={true}
                        onInsert={insertLanguageCharacter}
                      />
                    )}
                    <div className="flex gap-1 sm:gap-2 items-center">
                      <span className="w-10 sm:w-12 text-xs sm:text-sm font-medium flex-shrink-0">Option {optionLabels[i]}</span>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(i, e.target.value)}
                        onFocus={() => (isMathSubject || isUrduSubject) && handleMathFieldFocus("option", i)}
                        onBlur={() => (isMathSubject || isUrduSubject) && setFocusedMathField(null)}
                        placeholder={`Option ${optionLabels[i]}`}
                        className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                      />
                      {formData.options.length > 2 && (
                        <button
                          onClick={() => removeOption(i)}
                          className="px-2 sm:px-3 py-1.5 sm:py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-xs sm:text-sm flex-shrink-0"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {formData.options.length < 6 && (
                <button
                  onClick={addOption}
                  className="mt-2 sm:mt-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-xs sm:text-sm"
                >
                  Add Option
                </button>
              )}
              {errors.options && <p className="text-red-500 text-xs sm:text-sm mt-2">{errors.options}</p>}

              <div className="mt-4 sm:mt-6">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Correct Answer *</label>
                <select
                  value={formData.correctAnswer}
                  onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                  className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm ${errors.correctAnswer ? "border-red-500" : "border-gray-300"}`}
                >
                  <option value="">Select correct answer</option>
                  {formData.options.map((option, i) => (
                    <option key={i} value={option}>
                      Option {optionLabels[i]}: {option}
                    </option>
                  ))}
                </select>
                {errors.correctAnswer && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.correctAnswer}</p>}
              </div>
            </div>
          )}

          {/* True/False */}
          {formData.type === "truefalse" && (
            <div className="mb-3 sm:mb-4 lg:mb-6">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Correct Answer *</label>
              <div className="flex gap-3 sm:gap-4">
                <label className="flex items-center gap-2 text-xs sm:text-sm">
                  <input
                    type="radio"
                    value="true"
                    checked={formData.correctAnswer === "true"}
                    onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                    className="w-4 h-4"
                  />
                  <span>True</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="false"
                    checked={formData.correctAnswer === "false"}
                    onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                    className="w-4 h-4"
                  />
                  <span>False</span>
                </label>
              </div>
              {errors.correctAnswer && <p className="text-red-500 text-sm mt-2">{errors.correctAnswer}</p>}
            </div>
          )}

          {/* Short/Long Answer */}
          {(formData.type === "short" || formData.type === "long") && (
            <div className="mb-4 sm:mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer *</label>
              <textarea
                value={formData.correctAnswer}
                onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                placeholder="Enter the correct answer"
                rows={formData.type === "long" ? 6 : 3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors.correctAnswer ? "border-red-500" : "border-gray-300"}`}
              />
              {errors.correctAnswer && <p className="text-red-500 text-sm mt-1">{errors.correctAnswer}</p>}
            </div>
          )}

          {/* Fill in the Blanks */}
          {formData.type === "fillblanks" && (
            <div className="mb-4 sm:mb-6">
              <p className="text-sm text-gray-600 mb-3">Use {"{blank1}"}, {"{blank2}"}, etc. in question text to mark blanks</p>
              {Object.keys(formData.blanks).map((blankId, i) => (
                <div key={blankId} className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Answers for {blankId} (separate with |) *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.blanks[blankId].join("|")}
                      onChange={(e) => handleBlankChange(blankId, e.target.value)}
                      placeholder="answer1|answer2|answer3"
                      className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors[blankId] ? "border-red-500" : "border-gray-300"}`}
                    />
                    <button
                      onClick={() => removeBlank(blankId)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </div>
                  {errors[blankId] && <p className="text-red-500 text-sm mt-1">{errors[blankId]}</p>}
                </div>
              ))}
              {errors.blanks && <p className="text-red-500 text-sm mt-2">{errors.blanks}</p>}
              <button
                onClick={addBlank}
                className="mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Add Blank
              </button>
            </div>
          )}

          {/* Explanation */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Explanation (Optional)</label>
            {isMathSubject && focusedMathField === "explanation" && (
              <InlineMathToolbar
                isVisible={true}
                onInsert={insertMathSymbol}
              />
            )}
            {isUrduSubject && focusedMathField === "explanation" && (
              <UrduKeyboard
                isVisible={true}
                onInsert={insertLanguageCharacter}
              />
            )}
            <textarea
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              onFocus={() => (isMathSubject || isUrduSubject) && handleMathFieldFocus("explanation")}
              onBlur={() => (isMathSubject || isUrduSubject) && setFocusedMathField(null)}
              placeholder="Add explanation for the correct answer"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex-1 px-4 sm:px-6 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm sm:text-base"
            >
              Back
            </button>
            <button
              onClick={handleFormSubmit}
              disabled={loading}
              className="flex-1 px-4 sm:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 text-sm sm:text-base"
            >
              {loading ? "Creating..." : "Create Question"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
