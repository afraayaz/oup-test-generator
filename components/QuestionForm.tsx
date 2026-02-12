"use client";

import { useState, useEffect } from "react";
import InlineMathToolbar from "./InlineMathToolbar";
import UrduKeyboard from "./UrduKeyboard";
import { uploadQuestionImage, validateImageFile } from "@/lib/uploadImage";

interface QuestionFormProps {
  onSubmit: (questionData: QuestionFormData) => Promise<void>;
  onSwitchToBank?: () => void;
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
  userId?: string; // Optional user ID for image uploads
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
  correctAnswer: string | string[]; // Support both single and multiple answers
  explanation: string;
  blanks: { [key: string]: string[] };
  imageUrl?: string; // Optional image URL
  cognitiveLevel?: {
    knowledge: boolean;
    understanding: boolean;
    application: boolean;
  };
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
  correctAnswer: [], // Initialize as empty array for multiple answers
  explanation: "",
  blanks: {},
  imageUrl: "", // Initialize imageUrl field
  cognitiveLevel: {
    knowledge: false,
    understanding: false,
    application: false,
  },
};

export default function QuestionForm({
  onSubmit,
  onSwitchToBank,
  loading = false,
  submittedBooks = [],
  subjects = ["Mathematics", "Science", "English", "History", "Geography"],
  grades = [],
  defaultGrade,
  defaultSubject,
  defaultBook,
  showTopicField = false,
  showSloField = false,
  userId,
}: QuestionFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<QuestionFormData>(initialFormData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [toast, setToast] = useState<{ type: "error" | "success" | "info"; message: string } | null>(null);
  const [focusedMathField, setFocusedMathField] = useState<"question" | "explanation" | "option" | "blank" | "correctAnswer" | null>(null);
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1);
  const [availableChapters, setAvailableChapters] = useState<string[]>([]); // Store fetched chapters
  const [chaptersLoading, setChaptersLoading] = useState(false); // Loading state for chapters
  const [activeBlankId, setActiveBlankId] = useState<string | null>(null);
  const [urduKeyboardFocus, setUrduKeyboardFocus] = useState<"topic" | "slo" | null>(null); // Track which field needs Urdu keyboard
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Initialize with defaults
  useEffect(() => {
    console.log('📋 QuestionForm defaults:', { defaultGrade, defaultSubject, defaultBook });
    if (defaultGrade || defaultSubject || defaultBook) {
      console.log('✅ Setting form defaults');
      setFormData((prev) => ({
        ...prev,
        grade: defaultGrade || "",
        subject: defaultSubject || "",
        book: defaultBook || "",
      }));
    } else {
      console.log('⚠️ No defaults provided');
    }
  }, [defaultGrade, defaultSubject, defaultBook, grades, subjects, submittedBooks]);

  // Fetch chapters when book, subject, and grade are selected
  useEffect(() => {
    const fetchChapters = async () => {
      if (!formData.book || !formData.subject || !formData.grade) {
        setAvailableChapters([]);
        return;
      }

      try {
        setChaptersLoading(true);
        
        // Find the book object to get its ID - match by title, grade, AND subject
        const selectedBook = submittedBooks.find(
          (book) => 
            book.title.toLowerCase() === formData.book.toLowerCase() &&
            book.subject.toLowerCase() === formData.subject.toLowerCase() &&
            book.grade.replace(/^Grade\s+/, '').trim() === formData.grade.replace(/^Grade\s+/, '').trim()
        );
        
        if (!selectedBook || !selectedBook.id) {
          console.warn('⚠️ Book not found or missing ID:', formData.book);
          console.log('📚 Available books:', submittedBooks.map(b => ({ title: b.title, id: b.id, grade: b.grade })));
          setAvailableChapters([]);
          return;
        }

        console.log('📚 Fetching chapters with:', {
          bookId: selectedBook.id,
          bookTitle: selectedBook.title,
          bookGrade: selectedBook.grade,
          subject: formData.subject
        });

        // Call the chapters API - API will find subjectId from subject name
        const url = `/api/admin/chapters?subject=${encodeURIComponent(formData.subject)}&book=${encodeURIComponent(formData.book)}&bookId=${encodeURIComponent(selectedBook.id)}`;
        console.log('📚 Fetching from:', url);
        
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          const chapters = (data.chapters || []).map((ch: string) => {
            // Remove quotes if present
            let cleaned = ch.trim();
            if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
              cleaned = cleaned.slice(1, -1);
            }
            return cleaned;
          });

          if (chapters.length === 0) {
            setAvailableChapters([]); // Will show "No chapter available yet"
          } else {
            setAvailableChapters(chapters);
          }
        } else {
          setAvailableChapters([]);
        }
      } catch (error) {
        console.error('Error fetching chapters:', error);
        setAvailableChapters([]);
      } finally {
        setChaptersLoading(false);
      }
    };

    fetchChapters();
  }, [formData.book, formData.subject, formData.grade, submittedBooks]);

  const optionLabels = (formData.subject === "Urdu" || formData.subject === "Islamiyat")
    ? ["ا", "ب", "ج", "د", "ه", "و"]  // Urdu letters: Alif, Bay, Jeem, Dal, Hay, Waw
    : ["A", "B", "C", "D", "E", "F"];

  const handleQuestionTypeChange = (type: QuestionFormData["type"]) => {
    setFormData((prev: QuestionFormData): QuestionFormData => ({
      ...prev,
      type,
      options: type === "multiple" ? ["", "", "", ""] : [],
      blanks: type === "fillblanks" ? { blank1: [] } : ({} as { [key: string]: string[] }),
      correctAnswer: type === "multiple" ? [] : "", // Array for MCQ, empty string for others
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
      const removedOption = formData.options[index];
      
      // Update correctAnswer - handle both string and array types
      let updatedCorrectAnswer: string | string[] = formData.correctAnswer;
      if (Array.isArray(formData.correctAnswer)) {
        // Remove the deleted option from the array
        updatedCorrectAnswer = formData.correctAnswer.filter(ans => ans !== removedOption);
      } else if (formData.correctAnswer === removedOption) {
        // If single answer and it's the removed option, clear it
        updatedCorrectAnswer = "";
      }
      
      setFormData((prev) => ({
        ...prev,
        options: newOptions,
        correctAnswer: updatedCorrectAnswer,
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
    } else if (focusedMathField === "correctAnswer") {
      setFormData((prev) => ({
        ...prev,
        correctAnswer: (typeof prev.correctAnswer === 'string' ? prev.correctAnswer : '') + symbol,
      }));
    }
  };

  const insertLanguageCharacter = (character: string) => {
    // Works for both math symbols and language characters (Urdu, etc.)
    insertMathSymbol(character);
  };

  const handleMathFieldFocus = (field: "question" | "explanation" | "option" | "blank" | "correctAnswer", optionIdx?: number, blankId?: string) => {
    setFocusedMathField(field);
    if (optionIdx !== undefined) setActiveOptionIndex(optionIdx);
    if (blankId) setActiveBlankId(blankId);
  };

  const isMathSubject = formData.subject.toLowerCase().includes("math") || formData.subject.toLowerCase().includes("mathematics");
  const isUrduSubject = formData.subject.toLowerCase().includes("urdu") || formData.subject.toLowerCase().includes("islamiyat");

  // Image handling functions
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate the image file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageError(validation.error || "Invalid file");
      return;
    }

    setImageError("");
    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setImageError("");
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
  };

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
      // Check for multiple correct answers
      const correctAnswersArray = Array.isArray(formData.correctAnswer) ? formData.correctAnswer : [];
      if (correctAnswersArray.length === 0) {
        newErrors.correctAnswer = "Please select at least one correct answer";
      } else {
        // Validate that all selected answers are in the options list
        const invalidAnswers = correctAnswersArray.filter(answer => !formData.options.includes(answer));
        if (invalidAnswers.length > 0) {
          newErrors.correctAnswer = "All selected answers must be from the available options";
        }
      }
    } else if (formData.type === "truefalse") {
      if (!["true", "false"].includes((formData.correctAnswer as string).toLowerCase())) {
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
    } else if (!(formData.correctAnswer as string).trim()) {
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
      // Upload image if one is selected
      if (imageFile && userId) {
        console.log('📤 Starting image upload...', { fileName: imageFile.name, size: imageFile.size, userId });
        setImageUploading(true);
        setUploadProgress(0);
        try {
          const imageUrl = await uploadQuestionImage(imageFile, userId, (progress) => {
            setUploadProgress(progress);
          });
          console.log('✅ Image uploaded successfully:', imageUrl);
          formData.imageUrl = imageUrl;
        } catch (error) {
          console.error('❌ Image upload failed:', error);
          setImageUploading(false);
          setUploadProgress(0);
          const errorMessage = error instanceof Error ? error.message : "Failed to upload image. Please try again.";
          setToast({ type: "error", message: errorMessage });
          return;
        }
        setImageUploading(false);
        setUploadProgress(0);
      } else if (imageFile && !userId) {
        console.warn('⚠️ Image file selected but no userId provided');
      }

      await onSubmit(formData);
      
      // Reset image states after successful submission
      setImageFile(null);
      setImagePreview("");
      setImageError("");
      
      setToast(null);
    } catch (error) {
      console.error("Error in form submission:", error);
    }
  };

  const getAvailableBooks = () => {
    if (!submittedBooks || !formData.subject) {
      console.log('📚 No books available - missing submittedBooks or subject');
      return [];
    }
    
    // If no grade is selected, show all books for the subject
    if (!formData.grade) {
      const filtered = submittedBooks.filter((book) => {
        const formSubject = formData.subject.toLowerCase().trim();
        const bookSubject = book.subject.toLowerCase().trim();
        return bookSubject === formSubject;
      });
      
      console.log('📚 Filtering by subject only:', {
        subject: formData.subject,
        totalBooks: submittedBooks.length,
        filteredBooks: filtered.length,
        filtered: filtered.map(b => ({ title: b.title, grade: b.grade, subject: b.subject }))
      });
      
      return filtered;
    }
    
    // Normalize grades for comparison (handle "6" vs "Grade 6" vs "Class 6")
    const normalizeGrade = (grade: string) => {
      if (!grade) return '';
      // Remove "Grade " or "Class " prefix and trim
      return grade.replace(/^(Grade|Class)\s+/i, '').trim();
    };
    
    const formGrade = normalizeGrade(formData.grade);
    const formSubject = formData.subject.toLowerCase().trim();
    
    console.log('📚 Filtering books with:', { 
      rawGrade: formData.grade, 
      normalizedGrade: formGrade, 
      subject: formSubject 
    });
    
    const filtered = submittedBooks.filter((book) => {
      const bookGrade = normalizeGrade(book.grade);
      const bookSubject = book.subject.toLowerCase().trim();
      
      const gradeMatch = bookGrade === formGrade;
      const subjectMatch = bookSubject === formSubject;
      
      console.log(`  Book: ${book.title} | Grade: "${book.grade}" (${bookGrade}) = ${gradeMatch} | Subject: "${book.subject}" = ${subjectMatch}`);
      
      return gradeMatch && subjectMatch;
    });
    
    console.log('📚 Filter result:', {
      totalBooks: submittedBooks.length,
      filteredBooks: filtered.length,
      filtered: filtered.map(b => ({ title: b.title, grade: b.grade, subject: b.subject }))
    });
    
    return filtered;
  };

  const getAvailableChapters = () => {
    return availableChapters;
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
                disabled={!formData.subject}
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
              {chaptersLoading ? (
                <div className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-500 flex items-center gap-2">
                  <i className="ri-loader-4-line animate-spin"></i>
                  Loading chapters...
                </div>
              ) : formData.book && getAvailableChapters().length === 0 ? (
                <div className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-yellow-300 rounded-lg text-xs sm:text-sm text-yellow-700 bg-yellow-50">
                  ⚠️ No chapter available yet
                </div>
              ) : (
                <select
                  value={formData.chapter}
                  onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                  disabled={!formData.book}
                  className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 text-xs sm:text-sm ${errors.chapter ? "border-red-500" : "border-gray-300"}`}
                  dir={formData.subject === "Urdu" ? "rtl" : "ltr"}
                >
                  <option value="">Select Chapter</option>
                  {getAvailableChapters().map((chapter) => (
                    <option key={chapter} value={chapter}>
                      {chapter}
                    </option>
                  ))}
                </select>
              )}
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
                  onFocus={() => (formData.subject === "Urdu" || formData.subject === "Islamiyat") && setUrduKeyboardFocus("topic")}
                  onBlur={() => setUrduKeyboardFocus(null)}
                  placeholder={(formData.subject === "Urdu" || formData.subject === "Islamiyat") ? "موضوع درج کریں" : "e.g., Linear Equations"}
                  className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm ${errors.topic ? "border-red-500" : "border-gray-300"}`}
                  dir={(formData.subject === "Urdu" || formData.subject === "Islamiyat") ? "rtl" : "ltr"}
                />
                {errors.topic && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.topic}</p>}
                {(formData.subject === "Urdu" || formData.subject === "Islamiyat") && urduKeyboardFocus === "topic" && (
                  <div className="mt-2">
                    <UrduKeyboard
                      isVisible={true}
                      onInsert={(char) => {
                        setFormData({ ...formData, topic: (formData.topic || "") + char });
                      }}
                    />
                  </div>
                )}
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
                  onFocus={() => (formData.subject === "Urdu" || formData.subject === "Islamiyat") && setUrduKeyboardFocus("slo")}
                  onBlur={() => setUrduKeyboardFocus(null)}
                  placeholder={(formData.subject === "Urdu" || formData.subject === "Islamiyat") ? "سیکھنے کے نتائج درج کریں" : "Student Learning Outcome (Optional)"}
                  className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm ${errors.slo ? "border-red-500" : "border-gray-300"}`}
                  dir={(formData.subject === "Urdu" || formData.subject === "Islamiyat") ? "rtl" : "ltr"}
                />
                {errors.slo && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.slo}</p>}
                {(formData.subject === "Urdu" || formData.subject === "Islamiyat") && urduKeyboardFocus === "slo" && (
                  <div className="mt-2">
                    <UrduKeyboard
                      isVisible={true}
                      onInsert={(char) => {
                        setFormData({ ...formData, slo: (formData.slo || "") + char });
                      }}
                    />
                  </div>
                )}
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

            {/* Cognitive Level */}
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Cognitive Level (Bloom Taxonomy)</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.cognitiveLevel?.knowledge || false}
                    onChange={(e) => {
                      const current = formData.cognitiveLevel || {knowledge: false, understanding: false, application: false};
                      setFormData({...formData, cognitiveLevel: {...current, knowledge: e.target.checked}});
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Knowledge</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.cognitiveLevel?.understanding || false}
                    onChange={(e) => {
                      const current = formData.cognitiveLevel || {knowledge: false, understanding: false, application: false};
                      setFormData({...formData, cognitiveLevel: {...current, understanding: e.target.checked}});
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Understanding</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.cognitiveLevel?.application || false}
                    onChange={(e) => {
                      const current = formData.cognitiveLevel || {knowledge: false, understanding: false, application: false};
                      setFormData({...formData, cognitiveLevel: {...current, application: e.target.checked}});
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Application</span>
                </label>
              </div>
            </div>
          </div>

          <button
            onClick={() => setCurrentStep(2)}
            disabled={loading}
            className="w-full px-3 sm:px-4 lg:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm lg:text-base mt-4 sm:mt-6 lg:mt-8 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Proceeding...
              </>
            ) : (
              "Next: Question Content"
            )}
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
              dir={isUrduSubject ? "rtl" : "ltr"}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors.questionText ? "border-red-500" : "border-gray-300"}`}
            />
            {errors.questionText && <p className="text-red-500 text-sm mt-1">{errors.questionText}</p>}
          </div>

          {/* Image Upload */}
          <div className="mb-3 sm:mb-4 lg:mb-6">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Attach Image (Optional)
            </label>
            <div className="flex flex-col gap-3">
              {!imagePreview ? (
                <div>
                  <label
                    htmlFor="question-image"
                    className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, GIF, WebP up to 5MB
                      </p>
                    </div>
                  </label>
                  <input
                    id="question-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative border-2 border-gray-300 rounded-lg p-3">
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors z-10"
                    title="Remove image"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  <img
                    src={imagePreview}
                    alt="Question preview"
                    className="max-w-full h-auto max-h-64 rounded mx-auto"
                  />
                  <p className="text-xs text-gray-500 text-center mt-2">
                    {imageFile?.name}
                  </p>
                </div>
              )}
              {imageError && (
                <p className="text-red-500 text-sm">{imageError}</p>
              )}
              {imageUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600 font-medium">Uploading image...</span>
                    <span className="text-blue-600 font-semibold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
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
                    <div className="flex gap-1 sm:gap-2 items-center" dir={isUrduSubject ? "rtl" : "ltr"}>
                      <span className="w-10 sm:w-12 text-xs sm:text-sm font-medium flex-shrink-0">{isUrduSubject ? optionLabels[i] : `Option ${optionLabels[i]}`}</span>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(i, e.target.value)}
                        onFocus={() => (isMathSubject || isUrduSubject) && handleMathFieldFocus("option", i)}
                        onBlur={() => (isMathSubject || isUrduSubject) && setFocusedMathField(null)}
                        placeholder={isUrduSubject ? optionLabels[i] : `Option ${optionLabels[i]}`}
                        dir={isUrduSubject ? "rtl" : "ltr"}
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
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Correct Answer(s) * (Select one or more)</label>
                <div className="space-y-2 p-3 border rounded-lg border-gray-300">
                  {formData.options.map((option, i) => {
                    const isChecked = Array.isArray(formData.correctAnswer) && formData.correctAnswer.includes(option);
                    return (
                      <label key={i} className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer hover:bg-gray-50 p-2 rounded" dir={isUrduSubject ? "rtl" : "ltr"}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newAnswers = Array.isArray(formData.correctAnswer) ? [...formData.correctAnswer] : [];
                            if (e.target.checked) {
                              if (!newAnswers.includes(option)) {
                                newAnswers.push(option);
                              }
                            } else {
                              const index = newAnswers.indexOf(option);
                              if (index > -1) {
                                newAnswers.splice(index, 1);
                              }
                            }
                            setFormData({ ...formData, correctAnswer: newAnswers });
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="font-medium text-gray-600 min-w-[20px]">{isUrduSubject ? `${optionLabels[i]}:` : `Option ${optionLabels[i]}:`}</span>
                        <span className="text-gray-700 flex-1" dir={isUrduSubject ? "rtl" : "ltr"}>{option || "(empty)"}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.correctAnswer && <p className="text-red-500 text-xs sm:text-sm mt-2">{errors.correctAnswer}</p>}
              </div>
            </div>
          )}

          {/* True/False */}
          {formData.type === "truefalse" && (
            <div className="mb-3 sm:mb-4 lg:mb-6">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Correct Answer *</label>
              <div className="flex gap-3 sm:gap-4" dir={isUrduSubject ? "rtl" : "ltr"}>
                <label className="flex items-center gap-2 text-xs sm:text-sm">
                  <input
                    type="radio"
                    value="true"
                    checked={formData.correctAnswer === "true"}
                    onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                    className="w-4 h-4"
                  />
                  <span>{isUrduSubject ? "صحیح" : "True"}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="false"
                    checked={formData.correctAnswer === "false"}
                    onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                    className="w-4 h-4"
                  />
                  <span>{isUrduSubject ? "غلط" : "False"}</span>
                </label>
              </div>
              {errors.correctAnswer && <p className="text-red-500 text-sm mt-2">{errors.correctAnswer}</p>}
            </div>
          )}

          {/* Short/Long Answer */}
          {(formData.type === "short" || formData.type === "long") && (
            <div className="mb-4 sm:mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer *</label>
              {isUrduSubject && focusedMathField === "correctAnswer" && (
                <UrduKeyboard
                  isVisible={true}
                  onInsert={insertLanguageCharacter}
                />
              )}
              <textarea
                value={formData.correctAnswer}
                onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                onFocus={() => isUrduSubject && handleMathFieldFocus("correctAnswer")}
                onBlur={() => isUrduSubject && setFocusedMathField(null)}
                placeholder="Enter the correct answer"
                rows={formData.type === "long" ? 6 : 3}
                dir={isUrduSubject ? "rtl" : "ltr"}
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
                  {isUrduSubject && focusedMathField === "blank" && activeBlankId === blankId && (
                    <UrduKeyboard
                      isVisible={true}
                      onInsert={insertLanguageCharacter}
                    />
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.blanks[blankId].join("|")}
                      onChange={(e) => handleBlankChange(blankId, e.target.value)}
                      onFocus={() => {
                        if (isUrduSubject) {
                          setActiveBlankId(blankId);
                          handleMathFieldFocus("blank");
                        }
                      }}
                      onBlur={() => {
                        if (isUrduSubject) {
                          setActiveBlankId(null);
                          setFocusedMathField(null);
                        }
                      }}
                      placeholder="answer1|answer2|answer3"
                      dir={isUrduSubject ? "rtl" : "ltr"}
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
              dir={isUrduSubject ? "rtl" : "ltr"}
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
            {onSwitchToBank && (
              <button
                onClick={onSwitchToBank}
                className="flex-1 px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm sm:text-base"
              >
                Go to Question Bank
              </button>
            )}
            <button
              onClick={handleFormSubmit}
              disabled={loading || imageUploading}
              className="flex-1 px-4 sm:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : imageUploading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading Image...
                </>
              ) : (
                "Create Question"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
