"use client";
import { useState, useEffect, useCallback } from "react";
import EnhancedDragDropBuilder from "@/components/EnhancedDragDropBuilder";
import MatchingBuilder from "@/components/MatchingBuilder";
import OrderingBuilder from "@/components/OrderingBuilder";
import FillBlanksBuilder from "@/components/FillBlanksBuilder";
import CategorizationBuilder from "@/components/CategorizationBuilder";
import PreviewWrapper from "../interactiveQuiz/previews/PreviewWrapper";
import Sidebar from "@/components/Sidebar";
import { db } from "@/firebase/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

import {
  QuizType,
  QuestionMap,
  QuizMeta,
  AnyQuestion,
  DragDropQuestion,
  MatchingQuestion,
  OrderingQuestion,
  FillBlanksQuestion,
  CategorizationQuestion,
} from "@/types/types";

// DiagramLabelingBuilder - wrapper that enforces image-only mode
const DiagramLabelingBuilder = ({ question, onUpdate }: { question: DragDropQuestion; onUpdate: (updated: DragDropQuestion) => void; }) => {
  // Ensure question is in image mode for diagram labeling
  const imageOnlyQuestion = { ...question, layoutMode: "image" as const };
  
  return (
    <div>
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 text-blue-800">
          <span>🏷️</span>
          <span className="font-medium">Diagram Labeling Mode</span>
        </div>
        <p className="text-sm text-blue-700 mt-1">Upload an image and create drop zones by drawing on it. Students will drag labels onto the correct parts of the diagram.</p>
      </div>
      
      {/* Use EnhancedDragDropBuilder but intercept and modify its behavior */}
      <div className="diagram-labeling-wrapper">
        <style>{`
          .diagram-labeling-wrapper .bg-blue-50.p-4.rounded-lg.border.border-blue-200 {
            display: none !important;
          }
        `}</style>
        <EnhancedDragDropBuilder
          question={imageOnlyQuestion}
          onUpdate={(updated) => {
            // Ensure updates maintain image mode
            onUpdate({ ...updated, layoutMode: "image" });
          }}
        />
      </div>
    </div>
  );
};

// All builders are now implemented

const builderComponents: {
  [K in Exclude<QuizType, "">]: React.FC<{
    question: QuestionMap[K];
    onUpdate: (updated: QuestionMap[K]) => void;
  }>;
} = {
  "drag-drop": EnhancedDragDropBuilder,
  "diagram-labeling": DiagramLabelingBuilder,
  matching: MatchingBuilder,
  "fill-blanks": FillBlanksBuilder,
  categorization: CategorizationBuilder,
  ordering: OrderingBuilder,
};

const getQuizTypeIcon = (type: QuizType) => {
  switch (type) {
    case "drag-drop": return "⚡";
    case "diagram-labeling": return "🏷️";
    case "matching": return "⇄";
    case "fill-blanks": return "📝";
    case "categorization": return "📊";
    case "ordering": return "#";
    default: return "?";
  }
};

const getQuizTypeName = (type: QuizType) => {
  switch (type) {
    case "drag-drop": return "Drag & Drop";
    case "diagram-labeling": return "Diagram Labeling";
    case "matching": return "Textual Matching";
    case "fill-blanks": return "Fill-in-the-Blanks";
    case "categorization": return "Column Sorting";
    case "ordering": return "Sequence Ordering";
    default: return "Unknown";
  }
};

export default function CreateInteractiveQuiz() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quizMeta, setQuizMeta] = useState<QuizMeta>({
    grade: "",
    subject: "",
    book: "",
    chapter: "",
    slo: "",
    type: "",
    difficulty: "Medium",
  });

  const [questions, setQuestions] = useState<AnyQuestion[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [touchedPrompts, setTouchedPrompts] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [existingQuestions, setExistingQuestions] = useState<{id: string}[]>([]);
  const [availableChapters, setAvailableChapters] = useState<string[]>([]);
  const [availableSLOs, setAvailableSLOs] = useState<string[]>([]);

  const grades = ['1', '2', '3', '4', '5'];
  const subjects = ['English', 'Math', 'Urdu', 'Science', 'Computer'];
  const books: Record<string, Record<string, string[]>> = {
    '1': { 'English': ['Oxford First Words', 'Primary English 1'], 'Math': ['Math Magic 1'], 'Urdu': ['Urdu Qaida'], 'Science': ['My First Science'], 'Computer': ['ICT Basics 1'] },
    '2': { 'English': ['Oxford Growing Up', 'Primary English 2'], 'Math': ['Math Magic 2'], 'Urdu': ['Urdu Adab 2'], 'Science': ['Science Explorer 2'], 'Computer': ['ICT Basics 2'] },
    '3': { 'English': ['Oxford Advantage', 'Primary English 3'], 'Math': ['Math Magic 3'], 'Urdu': ['Urdu Adab 3'], 'Science': ['Science Explorer 3'], 'Computer': ['Computer Studies 3'] },
    '4': { 'English': ['Spirit School', 'Primary English 4'], 'Math': ['Primary Mathematics'], 'Urdu': ['Urdu Say Dosti'], 'Science': ['Science World 4'], 'Computer': ['Computer Studies 4'] },
    '5': { 'English': ['English World', 'Oxford Skills'], 'Math': ['New Math 5'], 'Urdu': ['Urdu Bahar 5'], 'Science': ['Exploring Science 5'], 'Computer': ['Digital World 5'] },
  };
  const difficulties = ['Easy', 'Medium', 'Hard'];

  useEffect(() => {
    const fetchExistingQuestions = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'questions'));
        const questionList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExistingQuestions(questionList);
      } catch (error) {
        console.error('Error fetching questions:', error);
      }
    };
    fetchExistingQuestions();
  }, []);

  const getAvailableChapters = useCallback(() => {
    if (!quizMeta.grade || !quizMeta.subject || !quizMeta.book) return [];
    const chapters = new Set<string>();
    existingQuestions.forEach((q: Record<string, unknown>) => {
      const qGrade = ((q.grade || q.class || '') as string).toString().toLowerCase();
      const qSubject = ((q.subject || '') as string).toLowerCase();
      const qBook = ((q.book || '') as string).toLowerCase();
      const qChapter = (q.chapter || '') as string;
      if (qGrade === quizMeta.grade.toLowerCase() && 
          qSubject === quizMeta.subject.toLowerCase() && 
          qBook === quizMeta.book.toLowerCase() && 
          qChapter) {
        chapters.add(qChapter);
      }
    });
    return Array.from(chapters).sort();
  }, [quizMeta.grade, quizMeta.subject, quizMeta.book, existingQuestions]);

  const getAvailableSLOs = useCallback(() => {
    if (!quizMeta.grade || !quizMeta.subject || !quizMeta.book || !quizMeta.chapter) return [];
    const slos = new Set<string>();
    existingQuestions.forEach((q: Record<string, unknown>) => {
      const qGrade = ((q.grade || q.class || '') as string).toString().toLowerCase();
      const qSubject = ((q.subject || '') as string).toLowerCase();
      const qBook = ((q.book || '') as string).toLowerCase();
      const qChapter = ((q.chapter || '') as string).toLowerCase();
      const qSLO = (q.slo || '') as string;
      if (qGrade === quizMeta.grade.toLowerCase() && 
          qSubject === quizMeta.subject.toLowerCase() && 
          qBook === quizMeta.book.toLowerCase() && 
          qChapter === quizMeta.chapter.toLowerCase() && 
          qSLO) {
        slos.add(qSLO);
      }
    });
    return Array.from(slos).sort();
  }, [quizMeta.grade, quizMeta.subject, quizMeta.book, quizMeta.chapter, existingQuestions]);

  useEffect(() => {
    setAvailableChapters(getAvailableChapters());
  }, [getAvailableChapters]);

  useEffect(() => {
    setAvailableSLOs(getAvailableSLOs());
  }, [getAvailableSLOs]);

  const getAvailableBooks = () => {
    if (!quizMeta.grade || !quizMeta.subject) return [];
    return books[quizMeta.grade]?.[quizMeta.subject] || [];
  };

  const createEmptyQuestion = (type: QuizType): AnyQuestion | null => {
    const defaultFeedbackConfig = {
      showInstant: false,
      correctMessage: "Correct! Well done!",
      incorrectMessage: "Not quite right. Try again!",
      showCorrectAnswers: true,
    };

    switch (type) {
      case "drag-drop":
        return {
          prompt: "",
          dragItems: [],
          dropZones: [],
          layoutMode: "text",
          showDropZones: true,
          feedbackConfig: defaultFeedbackConfig,
        } as DragDropQuestion;
      case "diagram-labeling":
        return {
          prompt: "",
          dragItems: [],
          dropZones: [],
          layoutMode: "image",
          showDropZones: true,
          feedbackConfig: defaultFeedbackConfig,
        } as DragDropQuestion;
      case "matching":
        return {
          prompt: "",
          pairs: [],
        } as MatchingQuestion;
      case "fill-blanks":
        return {
          prompt: "",
          segments: [{ id: "1", type: "text", text: "Enter your sentence with " }, { id: "2", type: "blank", blankId: "blank1" }, { id: "3", type: "text", text: " here." }],
          bank: [],
          blanks: [{ id: "blank1", correctItemId: "" }],
          shuffleBank: true,
          feedbackConfig: defaultFeedbackConfig,
        } as FillBlanksQuestion;
      case "categorization":
        return {
          prompt: "",
          categories: [{ id: "1", label: "Category 1" }, { id: "2", label: "Category 2" }],
          items: [],
          shuffleItems: true,
          feedbackConfig: defaultFeedbackConfig,
        } as CategorizationQuestion;
      case "ordering":
        return {
          prompt: "",
          steps: [],
        } as OrderingQuestion;
      default:
        return null;
    }
  };

  const handleAddQuestion = () => {
    if (quizMeta.type !== "") {
      const newQuestion = createEmptyQuestion(quizMeta.type);
      if (newQuestion) {
        const newQuestions = [...questions, newQuestion];
        setQuestions(newQuestions);
        setSelectedQuestionIndex(newQuestions.length - 1); // Auto-select new question
      }
    } else {
      alert("Please select a quiz type first!");
    }
  };

  const handleUpdateQuestion = (index: number, updatedQuestion: AnyQuestion) => {
    const updated = [...questions];
    updated[index] = updatedQuestion;
    setQuestions(updated);
  };

  const handleDeleteQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    if (selectedQuestionIndex === index) {
      setSelectedQuestionIndex(updated.length > 0 ? 0 : null);
    } else if (selectedQuestionIndex !== null && selectedQuestionIndex > index) {
      setSelectedQuestionIndex(selectedQuestionIndex - 1);
    }
  };

  const handleDuplicateQuestion = (index: number) => {
    const questionToDuplicate = questions[index];
    const duplicatedQuestion = JSON.parse(JSON.stringify(questionToDuplicate)); // Deep clone
    const updated = [...questions];
    updated.splice(index + 1, 0, duplicatedQuestion);
    setQuestions(updated);
    setSelectedQuestionIndex(index + 1);
  };

  const mapQuizTypeToQuestionType = (type: QuizType): string => {
    switch (type) {
      case 'drag-drop': return 'dragdrop';
      case 'diagram-labeling': return 'diagramlabeling';
      case 'matching': return 'matching';
      case 'fill-blanks': return 'fillblanks';
      case 'categorization': return 'categorization';
      case 'ordering': return 'ordering';
      default: return type;
    }
  };

  const handleSaveQuiz = async () => {
    setShowValidation(true);
    const errors = validateQuiz();
    if (errors.length === 0) {
      setIsSaving(true);
      try {
        for (const question of questions) {
          const questionData = {
            grade: quizMeta.grade,
            class: quizMeta.grade,
            subject: quizMeta.subject,
            book: quizMeta.book,
            chapter: quizMeta.chapter,
            slo: quizMeta.slo,
            difficulty: quizMeta.difficulty || 'Medium',
            type: mapQuizTypeToQuestionType(quizMeta.type),
            questionType: mapQuizTypeToQuestionType(quizMeta.type),
            question: question.prompt,
            interactiveData: question,
            isInteractive: true,
            createdAt: new Date().toISOString(),
          };
          
          await addDoc(collection(db, 'questions'), questionData);
        }
        
        alert(`${questions.length} question(s) saved successfully!`);
        setShowValidation(false);
        setQuestions([]);
        setSelectedQuestionIndex(null);
        
        const snapshot = await getDocs(collection(db, 'questions'));
        const questionList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExistingQuestions(questionList);
      } catch (error) {
        console.error('Error saving questions:', error);
        alert('Failed to save questions. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const validateQuiz = () => {
    const errors: string[] = [];
    
    if (!quizMeta.grade) errors.push("Grade is required");
    if (!quizMeta.subject) errors.push("Subject is required");
    if (!quizMeta.book) errors.push("Book is required");
    if (!quizMeta.chapter) errors.push("Chapter is required");
    if (!quizMeta.type) errors.push("Question type is required");
    if (questions.length === 0) errors.push("At least one question is required");
    
    questions.forEach((q, idx) => {
      if (!q.prompt.trim()) errors.push(`Question ${idx + 1} needs a prompt`);
      if (q.prompt.length > 500) errors.push(`Question ${idx + 1} prompt too long (max 500 chars)`);
    });

    return errors;
  };

  const selectedQuestion = selectedQuestionIndex !== null ? questions[selectedQuestionIndex] : null;
  const BuilderComponent = quizMeta.type !== "" && selectedQuestion ? builderComponents[quizMeta.type] : null;
  const validationErrors = showValidation ? validateQuiz() : [];
  
  const handleFieldTouch = (fieldName: string) => {
    setTouchedFields(prev => new Set([...prev, fieldName]));
  };
  
  const getFieldError = (fieldName: string): string | null => {
    if (fieldName === 'prompt') {
      if (!selectedQuestion || selectedQuestionIndex === null) return null;
      if (!touchedPrompts.has(selectedQuestionIndex)) return null;
      if (!selectedQuestion.prompt.trim()) return 'Question prompt is required';
      if (selectedQuestion.prompt.length > 500) return 'Prompt too long (max 500 chars)';
      return null;
    }
    
    if (!touchedFields.has(fieldName)) return null;
    
    switch (fieldName) {
      case 'grade': return !quizMeta.grade ? 'Grade is required' : null;
      case 'subject': return !quizMeta.subject ? 'Subject is required' : null;
      case 'book': return !quizMeta.book ? 'Book is required' : null;
      case 'chapter': return !quizMeta.chapter ? 'Chapter is required' : null;
      case 'type': return !quizMeta.type ? 'Question type is required' : null;
      default: return null;
    }
  };
  
  const canSave = () => {
    const errors = validateQuiz();
    return errors.length === 0;
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="Teacher" currentPage="interactiveQuiz" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <i className="ri-menu-line text-2xl"></i>
              </button>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Create Interactive Quiz</h1>
            </div>
            <div className="flex items-center gap-3">
              {showValidation && validationErrors.length > 0 && (
                <span className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">
                  {validationErrors.length} validation {validationErrors.length === 1 ? 'error' : 'errors'}
                </span>
              )}
              <button
                onClick={handleSaveQuiz}
                disabled={isSaving}
                className={`px-6 py-2 rounded-lg font-medium transition-colors shadow-sm ${
                  isSaving 
                    ? 'bg-gray-400 cursor-not-allowed text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isSaving ? 'Saving...' : 'Save Questions'}
              </button>
            </div>
          </div>
        </div>

        {/* Two-Pane Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-auto lg:overflow-hidden">
          {/* Left Panel - Editor */}
          <div className="w-full lg:w-1/2 bg-white lg:border-r border-gray-200 flex flex-col min-h-0 overflow-y-auto">
            {/* Quiz Metadata */}
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Question Details</h2>
              <div className="grid grid-cols-2 gap-4">
                {/* Grade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                  <select
                    value={quizMeta.grade}
                    onChange={(e) => setQuizMeta({ ...quizMeta, grade: e.target.value, book: '', chapter: '', slo: '' })}
                    onBlur={() => handleFieldTouch('grade')}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${getFieldError('grade') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  >
                    <option value="">Select Grade</option>
                    {grades.map(g => (
                      <option key={g} value={g}>Grade {g}</option>
                    ))}
                  </select>
                  {getFieldError('grade') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('grade')}</p>
                  )}
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select
                    value={quizMeta.subject}
                    onChange={(e) => setQuizMeta({ ...quizMeta, subject: e.target.value, book: '', chapter: '', slo: '' })}
                    onBlur={() => handleFieldTouch('subject')}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${getFieldError('subject') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {getFieldError('subject') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('subject')}</p>
                  )}
                </div>

                {/* Book */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Book</label>
                  <select
                    value={quizMeta.book}
                    onChange={(e) => setQuizMeta({ ...quizMeta, book: e.target.value, chapter: '', slo: '' })}
                    onBlur={() => handleFieldTouch('book')}
                    disabled={!quizMeta.grade || !quizMeta.subject}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${getFieldError('book') ? 'border-red-500 bg-red-50' : 'border-gray-300'} ${!quizMeta.grade || !quizMeta.subject ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Select Book</option>
                    {getAvailableBooks().map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {getFieldError('book') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('book')}</p>
                  )}
                </div>

                {/* Chapter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={quizMeta.chapter}
                      onChange={(e) => setQuizMeta({ ...quizMeta, chapter: e.target.value, slo: '' })}
                      onBlur={() => handleFieldTouch('chapter')}
                      disabled={!quizMeta.book}
                      list="chapter-suggestions"
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${getFieldError('chapter') ? 'border-red-500 bg-red-50' : 'border-gray-300'} ${!quizMeta.book ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      placeholder="Enter or select chapter"
                    />
                    <datalist id="chapter-suggestions">
                      {availableChapters.map(ch => (
                        <option key={ch} value={ch} />
                      ))}
                    </datalist>
                  </div>
                  {getFieldError('chapter') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('chapter')}</p>
                  )}
                </div>

                {/* SLO */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SLO (Optional)</label>
                  <input
                    type="text"
                    value={quizMeta.slo}
                    onChange={(e) => setQuizMeta({ ...quizMeta, slo: e.target.value })}
                    disabled={!quizMeta.chapter}
                    list="slo-suggestions"
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 ${!quizMeta.chapter ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="Enter or select SLO"
                  />
                  <datalist id="slo-suggestions">
                    {availableSLOs.map(slo => (
                      <option key={slo} value={slo} />
                    ))}
                  </datalist>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                  <select
                    value={quizMeta.difficulty || 'Medium'}
                    onChange={(e) => setQuizMeta({ ...quizMeta, difficulty: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                  >
                    {difficulties.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Question Type */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                  <select
                    value={quizMeta.type}
                    onChange={(e) => setQuizMeta({ ...quizMeta, type: e.target.value as QuizMeta["type"] })}
                    onBlur={() => handleFieldTouch('type')}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${getFieldError('type') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  >
                    <option value="">Select Question Type</option>
                    <option value="drag-drop">⚡ Drag & Drop</option>
                    <option value="diagram-labeling">🏷️ Diagram Labeling</option>
                    <option value="matching">⇄ Textual Matching</option>
                    <option value="fill-blanks">📝 Fill-in-the-Blanks</option>
                    <option value="categorization">📊 Column Sorting</option>
                    <option value="ordering"># Sequence Ordering</option>
                  </select>
                  {getFieldError('type') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('type')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Question List */}
            <div className="flex-1 flex flex-col">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Questions ({questions.length})</h2>
                  <button
                    onClick={handleAddQuestion}
                    disabled={!quizMeta.type}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      !quizMeta.type
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                    }`}
                  >
                    + Add Question
                  </button>
                </div>
                
                {questions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2 text-gray-300">+</div>
                    <p className="text-gray-600">No questions yet. {quizMeta.type ? 'Click "Add Question" to get started!' : 'Select a quiz type first.'}</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {questions.map((q, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedQuestionIndex(idx)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedQuestionIndex === idx
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 mb-1">
                                Question {idx + 1}
                              </div>
                              <div className="text-sm text-gray-600 truncate">
                                {q.prompt || 'No prompt yet...'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateQuestion(idx);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Duplicate question"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteQuestion(idx);
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete question"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Question Editor */}
              {selectedQuestion && BuilderComponent && (
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Question Prompt</label>
                    <textarea
                      value={selectedQuestion.prompt}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[selectedQuestionIndex!].prompt = e.target.value;
                        setQuestions(updated);
                      }}
                      onBlur={() => {
                        if (selectedQuestionIndex !== null) {
                          setTouchedPrompts(prev => new Set([...prev, selectedQuestionIndex]));
                        }
                      }}
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${getFieldError('prompt') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                      rows={3}
                      placeholder="Enter your question prompt here..."
                    />
                    {getFieldError('prompt') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('prompt')}</p>
                    )}
                  </div>
                  
                  <BuilderComponent
                    question={selectedQuestion as any}
                    onUpdate={(updatedQuestion: any) =>
                      handleUpdateQuestion(selectedQuestionIndex!, updatedQuestion)
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Live Preview */}
          <div className="w-full lg:w-1/2 bg-gray-50 flex flex-col min-h-0 overflow-y-auto">
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-700">👁️ Live Preview</h2>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto">
              {selectedQuestion && quizMeta.type ? (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <PreviewWrapper question={selectedQuestion} type={quizMeta.type} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="text-6xl mb-4">👁️</div>
                    <p className="text-lg font-medium mb-2">Live Preview</p>
                    <p className="text-sm">
                      {!quizMeta.type 
                        ? 'Select a quiz type to see preview'
                        : questions.length === 0
                        ? 'Add a question to see preview'
                        : 'Select a question to see preview'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Validation Errors Footer */}
        {showValidation && validationErrors.length > 0 && (
          <div className="bg-red-50 border-t border-red-200 px-6 py-3">
            <div className="flex items-center gap-2">
              <span className="text-red-600">⚠️</span>
              <span className="text-sm font-medium text-red-800">Validation Errors:</span>
            </div>
            <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}