"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import EnhancedDragDropBuilder from "@/components/EnhancedDragDropBuilder";
import MatchingBuilder from "@/components/MatchingBuilder";
import OrderingBuilder from "@/components/OrderingBuilder";
import FillBlanksBuilder from "@/components/FillBlanksBuilder";
import CategorizationBuilder from "@/components/CategorizationBuilder";
import PreviewWrapper from "../../teacher/interactiveQuiz/previews/PreviewWrapper";
import Sidebar from "@/components/Sidebar";
import { db } from "@/firebase/firebase";
import { collection, addDoc, getDocs, query, where, getDoc, doc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useUserProfile } from "@/hooks/useUserProfile";

import {
  QuizType,
  QuestionMap,
  QuizMeta,
  AnyQuestion,
  DragDropQuestion,
  DragItem,
  DropZone,
  MatchingQuestion,
  OrderingQuestion,
  FillBlanksQuestion,
  CategorizationQuestion,
} from "@/types/types";

// DiagramLabelingBuilder - Fill-in-the-blank for diagrams
// Students see numbered areas on image and type answers in corresponding blanks
interface DiagramLabel {
  id: string;
  number: number;
  answer: string;
  x?: number;  // Position on image (0-100%)
  y?: number;  // Position on image (0-100%)
}

const DiagramLabelingBuilder = ({ question, onUpdate }: { question: DragDropQuestion; onUpdate: (updated: DragDropQuestion) => void; }) => {
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(question.backgroundImage);
  const [labels, setLabels] = useState<DiagramLabel[]>(
    (question.dragItems as any[])?.map((item: any, idx: number) => ({
      id: item.id,
      number: idx + 1,
      answer: item.text || item.label || '',
      x: item.x,
      y: item.y
    })) || []
  );
  const [newAnswer, setNewAnswer] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [markingMode, setMarkingMode] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  // Update parent whenever changes occur
  useEffect(() => {
    onUpdate({
      ...question,
      layoutMode: "image",
      dragItems: labels.map(label => ({ id: label.id, label: label.answer, type: 'text' } as any)),
      backgroundImage,
    });
  }, [labels, backgroundImage]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setBackgroundImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const addLabel = () => {
    if (newAnswer.trim()) {
      setLabels([...labels, { 
        id: Date.now().toString(), 
        number: labels.length + 1, 
        answer: newAnswer 
      }]);
      setNewAnswer("");
    }
  };

  const updateLabel = (id: string, answer: string) => {
    setLabels(labels.map(label => 
      label.id === id ? { ...label, answer } : label
    ));
  };

  const removeLabel = (id: string) => {
    setLabels(labels.filter(label => label.id !== id).map((label, idx) => ({
      ...label,
      number: idx + 1
    })));
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!markingMode || labels.length === 0) return;
    
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Add marker to the last blank without a position
    const unpositionedIndex = labels.findIndex(l => l.x === undefined);
    if (unpositionedIndex !== -1) {
      const updated = [...labels];
      updated[unpositionedIndex] = { ...updated[unpositionedIndex], x, y };
      setLabels(updated);
      // Turn off marking mode after placing marker
      if (unpositionedIndex === labels.length - 1) {
        setMarkingMode(false);
      }
    }
  };

  const handleDragStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDraggingId(id);
  };

  const handleDragMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setLabels(labels.map(label =>
      label.id === draggingId ? { ...label, x, y } : label
    ));
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Image Upload Section */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2">🖼️ Upload Diagram Image</h3>
        <p className="text-xs text-gray-600 mb-3">Students will see numbered points on this image and write answers in blanks</p>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white">
          {backgroundImage ? (
            <div className="flex flex-col items-center">
              {/* Image with small dots at marked positions */}
              <div
                ref={imageRef}
                onClick={handleImageClick}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                className={`relative inline-block mb-4 ${markingMode ? 'cursor-crosshair' : 'cursor-default'}`}
                style={{ maxHeight: '300px', maxWidth: '100%' }}
              >
                <img src={backgroundImage} alt="Diagram" className="max-h-72 h-auto rounded pointer-events-none" />
                
                {/* Small dots on image at marked positions */}
                {labels.map((label) => (
                  label.x !== undefined && label.y !== undefined && (
                    <div
                      key={`dot-${label.id}`}
                      className="absolute w-2 h-2 bg-blue-600 rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ left: `${label.x}%`, top: `${label.y}%` }}
                    />
                  )
                ))}
              </div>

              {/* Numbered Legend Below Image */}
              {labels.length > 0 && (
                <div className="w-full bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 mb-2">Marked Areas:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {labels.map((label) => (
                      <div
                        key={`legend-${label.id}`}
                        className="flex items-center gap-2 p-2 bg-white rounded border border-blue-100"
                      >
                        <div
                          onMouseDown={(e) => markingMode && handleDragStart(e, label.id)}
                          className={`w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            draggingId === label.id ? 'ring-2 ring-yellow-400 cursor-move' : markingMode ? 'cursor-move' : 'cursor-default'
                          }`}
                          style={{ opacity: label.x !== undefined ? 1 : 0.5 }}
                        >
                          {label.number}
                        </div>
                        <span className="text-xs text-gray-700 font-medium flex-1">{label.answer || 'Not positioned'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 flex-wrap justify-center w-full mt-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1"
                >
                  Change Image
                </button>
                <button
                  onClick={() => setMarkingMode(!markingMode)}
                  disabled={labels.filter(l => l.x === undefined).length === 0}
                  className={`px-3 py-1 text-sm font-medium rounded ${
                    markingMode
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                      : 'bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed'
                  }`}
                >
                  {markingMode ? '✓ Click Image to Mark' : '📍 Mark Positions'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">Click to upload diagram image</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Choose Image
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Labels Section */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">✏️ Diagram Labels (Numbered Blanks)</h3>
        <p className="text-xs text-gray-600 mb-3">Add answers for each numbered point on the diagram</p>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addLabel()}
            placeholder="Enter answer for blank..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <button
            onClick={addLabel}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + Add Blank
          </button>
        </div>

        <div className="space-y-2">
          {labels.map((label) => (
            <div key={label.id} className="bg-white p-3 rounded border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {label.number}
                </div>
                <input
                  type="text"
                  value={label.answer}
                  onChange={(e) => updateLabel(label.id, e.target.value)}
                  placeholder="Answer..."
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => removeLabel(label.id)}
                  className="text-red-600 hover:text-red-800 text-xs font-medium whitespace-nowrap"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {labels.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-4">No labels added yet. Add blanks above.</p>
          )}
        </div>
      </div>

      {/* Preview Section */}
      {backgroundImage && labels.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">👁️ Student View Preview</h3>
          <p className="text-xs text-gray-600 mb-3">This is how students will see the diagram and blanks</p>
          
          <div className="bg-white rounded-lg p-4">
            <div className="relative inline-block mx-auto mb-4" style={{ maxHeight: '300px', maxWidth: '100%' }}>
              <img src={backgroundImage} alt="Diagram" className="max-h-72 h-auto rounded" />
              
              {/* Show numbered circles on positioned labels */}
              {labels.map((label, idx) => (
                label.x !== undefined && label.y !== undefined && (
                  <div
                    key={label.id}
                    className="absolute w-8 h-8 bg-blue-600 text-white rounded-full transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center font-bold text-sm pointer-events-none shadow-lg border-2 border-blue-800"
                    style={{ left: `${label.x}%`, top: `${label.y}%` }}
                  >
                    {idx + 1}
                  </div>
                )
              ))}
            </div>
            
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">Write answers in the blanks:</p>
              <div className="space-y-2">
                {labels.map((label) => (
                  <div key={label.id} className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-blue-600 min-w-fit">{label.number}.</span>
                    <span className="text-gray-700">
                      <span className="border-b-2 border-gray-400">________</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-900 mb-2">
          <strong>ℹ️ How it works:</strong> 
        </p>
        <ul className="text-xs text-blue-900 space-y-1 ml-4 list-disc">
          <li>Add blanks using the input field below</li>
          <li>Click "📍 Mark Positions" button to enter marking mode</li>
          <li>Click on the image to place numbered markers (1, 2, 3, etc.)</li>
          <li>Drag markers to adjust their exact positions</li>
          <li>Students will see the image with numbered circles and answer blanks below</li>
        </ul>
      </div>
    </div>
  );
};

// All builders are now implemented

const builderComponents: {
  [K in Exclude<QuizType, "" | "fill-blanks">]: React.FC<{
    question: QuestionMap[K];
    onUpdate: (updated: QuestionMap[K]) => void;
  }>;
} = {
  "drag-drop": EnhancedDragDropBuilder,
  "diagram-labeling": DiagramLabelingBuilder,
  matching: MatchingBuilder,
  categorization: CategorizationBuilder,
  ordering: OrderingBuilder,
};

const getQuizTypeIcon = (type: QuizType) => {
  switch (type) {
    case "drag-drop": return "⚡";
    case "diagram-labeling": return "🏷️";
    case "matching": return "⇄";
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
    case "categorization": return "Column Sorting";
    case "ordering": return "Sequence Ordering";
    default: return "Unknown";
  }
};

export default function CreateInteractiveQuiz() {
  const { user } = useUserProfile();
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
  const [grades, setGrades] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [books, setBooks] = useState<Record<string, Record<string, string[]>>>({});
  const [bookIdMap, setBookIdMap] = useState<Record<string, string>>({}); // Map book titles to IDs
  const [gradeSubjectMap, setGradeSubjectMap] = useState<Record<string, string[]>>({});
  const difficulties = ['Easy', 'Medium', 'Hard'];

  // Fetch grades and subjects from user profile (Content Creator)
  useEffect(() => {
    if (!user) {
      console.log('⏳ User profile still loading...');
      return;
    }

    console.log('📊 User profile loaded (Content Creator):', {
      hasAssignedBooks: !!user?.assignedBooks?.length,
      assignedBooksCount: user?.assignedBooks?.length || 0,
      assignedBooks: user?.assignedBooks,
    });

    // For Content Creators: Show all grades 1-8
    let availableGrades: string[] = ['1', '2', '3', '4', '5', '6', '7', '8'];
    let gradeSubjectMapping: Record<string, string[]> = {};
    let allAssignedSubjects: Set<string> = new Set();

    // Build subject mapping from assignedBooks - filter subjects by grade
    if (user?.assignedBooks && user.assignedBooks.length > 0) {
      const gradeSubjectSet: Record<string, Set<string>> = {};

      user.assignedBooks.forEach((book: any) => {
        const grade = String(book.grade || '').trim();
        const subject = String(book.subject || '').trim();
        
        if (grade && subject) {
          if (!gradeSubjectSet[grade]) gradeSubjectSet[grade] = new Set();
          gradeSubjectSet[grade].add(subject);
          allAssignedSubjects.add(subject); // Track all assigned subjects
        }
      });

      // For each grade, show subjects that are assigned for that grade
      availableGrades.forEach(grade => {
        gradeSubjectMapping[grade] = gradeSubjectSet[grade] 
          ? Array.from(gradeSubjectSet[grade]).sort()
          : [];
      });

      console.log('✅ Content Creator subjects mapping by grade:', gradeSubjectMapping);
      console.log('📚 All assigned subjects:', Array.from(allAssignedSubjects));

      // Pre-fill subject with the first assigned subject (just like individual question creation)
      if (!quizMeta.subject && allAssignedSubjects.size > 0) {
        const firstSubject = Array.from(allAssignedSubjects).sort()[0];
        setQuizMeta(prev => ({
          ...prev,
          subject: firstSubject
        }));
        console.log('✅ Pre-filled assigned subject:', firstSubject);
      }
    } else {
      console.log('⚠️ No assignedBooks found');
      availableGrades.forEach(grade => {
        gradeSubjectMapping[grade] = [];
      });
    }

    setGrades(availableGrades);
    setGradeSubjectMap(gradeSubjectMapping);

    // Auto-select first grade if not already set
    if (!quizMeta.grade && availableGrades.length > 0) {
      const firstGrade = availableGrades[0];
      setQuizMeta(prev => ({ ...prev, grade: firstGrade }));
      console.log('✅ Auto-selected first grade:', firstGrade);
    }
  }, [user]);

  // Update subjects when grade changes
  useEffect(() => {
    if (quizMeta.grade && gradeSubjectMap[quizMeta.grade]) {
      const availableSubjects = gradeSubjectMap[quizMeta.grade];
      setSubjects(availableSubjects);
      console.log('📌 Updated subjects for grade', quizMeta.grade, ':', availableSubjects);
    } else {
      setSubjects([]);
    }
  }, [quizMeta.grade, gradeSubjectMap]);

  // Build books map from user's assignedBooks (Content Creator)
  useEffect(() => {
    if (!user?.assignedBooks || user.assignedBooks.length === 0) {
      console.log('⚠️ No assigned books found for content creator');
      setBooks({});
      return;
    }

    const booksMap: Record<string, Record<string, Set<string>>> = {};
    const titleToIdMap: Record<string, string> = {};

    user.assignedBooks.forEach((book: any) => {
      // Normalize grade: extract just the number from "Grade 1", "Class 1", "1", etc.
      const gradeRaw = String(book.grade || '').trim();
      const grade = gradeRaw.replace(/^(Grade|Class)\s+/i, '').trim();
      const subject = String(book.subject || '').trim();
      const bookTitle = String(book.title || '').trim();
      const bookId = String(book.id || '').trim();

      if (grade && subject && bookTitle) {
        if (!booksMap[grade]) booksMap[grade] = {};
        if (!booksMap[grade][subject]) booksMap[grade][subject] = new Set();
        booksMap[grade][subject].add(bookTitle);
        if (bookId) titleToIdMap[bookTitle] = bookId;
      }
    });

    // Convert Sets to Arrays
    const booksArray: Record<string, Record<string, string[]>> = {};
    Object.keys(booksMap).forEach(grade => {
      booksArray[grade] = {};
      Object.keys(booksMap[grade]).forEach(subject => {
        booksArray[grade][subject] = Array.from(booksMap[grade][subject]).sort();
      });
    });

    console.log('📚 Content Creator Books map built:', booksArray, 'IDs:', titleToIdMap);
    setBooks(booksArray);
    setBookIdMap(titleToIdMap);
  }, [user?.assignedBooks]);

  useEffect(() => {
    const fetchExistingQuestions = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'oupQuestionBanks'));
        const questionList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExistingQuestions(questionList);
      } catch (error) {
        console.error('Error fetching questions:', error);
      }
    };
    fetchExistingQuestions();
  }, []);

  const fetchChaptersForBook = useCallback(async () => {
    if (!quizMeta.book || !quizMeta.subject) {
      setAvailableChapters([]);
      return;
    }

    try {
      // Get the book ID from the map
      const bookId = bookIdMap[quizMeta.book];
      
      if (!bookId) {
        console.error('Book ID not found for:', quizMeta.book);
        setAvailableChapters([]);
        return;
      }

      // Call the chapters API - same as QuestionForm.tsx
      const response = await fetch(
        `/api/admin/chapters?subject=${encodeURIComponent(quizMeta.subject)}&book=${encodeURIComponent(quizMeta.book)}&bookId=${encodeURIComponent(bookId)}`
      );

      if (!response.ok) {
        console.error('Failed to fetch chapters:', response.statusText);
        setAvailableChapters([]);
        return;
      }

      const data = await response.json();
      console.log('📚 Chapters API response:', data);
      const chapters = (data.chapters || []).map((ch: string) => {
        // Remove quotes if present
        let cleaned = ch.trim();
        if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
          cleaned = cleaned.slice(1, -1);
        }
        return cleaned;
      });
      console.log('📖 Chapters to display:', chapters);
      setAvailableChapters(chapters);
    } catch (error) {
      console.error('Error fetching chapters:', error);
      setAvailableChapters([]);
    }
  }, [quizMeta.book, quizMeta.subject, bookIdMap]);

  const getAvailableChapters = useCallback(() => {
    if (!quizMeta.grade || !quizMeta.subject || !quizMeta.book) return [];
    const chapters = new Set<string>();
    existingQuestions.forEach((q: Record<string, unknown>) => {
      const qGradeNormalized = ((q.grade || q.class || '') as string).toString().replace('Grade ', '').trim().toLowerCase();
      const quizGradeNormalized = String(quizMeta.grade).replace('Grade ', '').trim().toLowerCase();
      const qSubject = ((q.subject || '') as string).toLowerCase();
      const qBook = ((q.book || '') as string).toLowerCase();
      const qChapter = (q.chapter || '') as string;
      if (qGradeNormalized === quizGradeNormalized && 
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
      const qGradeNormalized = ((q.grade || q.class || '') as string).toString().replace('Grade ', '').trim().toLowerCase();
      const quizGradeNormalized = String(quizMeta.grade).replace('Grade ', '').trim().toLowerCase();
      const qSubject = ((q.subject || '') as string).toLowerCase();
      const qBook = ((q.book || '') as string).toLowerCase();
      const qChapter = ((q.chapter || '') as string).toLowerCase();
      const qSLO = (q.slo || '') as string;
      if (qGradeNormalized === quizGradeNormalized && 
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
    fetchChaptersForBook();
  }, [quizMeta.book, quizMeta.subject, fetchChaptersForBook]);

  useEffect(() => {
    setAvailableSLOs(getAvailableSLOs());
  }, [getAvailableSLOs]);

  const getAvailableBooks = () => {
    if (!quizMeta.grade || !quizMeta.subject) {
      console.log('⚠️ getAvailableBooks: Missing grade or subject', { grade: quizMeta.grade, subject: quizMeta.subject });
      return [];
    }
    const availableBooks = books[quizMeta.grade]?.[quizMeta.subject] || [];
    console.log('📚 getAvailableBooks:', { grade: quizMeta.grade, subject: quizMeta.subject, availableBooks, booksMap: books });
    return availableBooks;
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
            createdBy: 'contentCreator',
            bankType: 'oup',
            createdAt: new Date().toISOString(),
          };
          
          // Save to OUP question bank for content creators
          await addDoc(collection(db, 'oupQuestionBanks'), questionData);
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
  const BuilderComponent = quizMeta.type && quizMeta.type !== "fill-blanks" && selectedQuestion ? (builderComponents as any)[quizMeta.type] : null;
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
      <Sidebar userRole="Content Creator" currentPage="interactiveQuiz" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 font-gibson-semibold">Create Interactive Quiz</h1>
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Single Pane - No Left/Right Split */}
          <div className="w-full bg-gradient-to-br from-gray-50 to-purple-50 flex flex-col min-h-0 overflow-y-auto">
            {/* Quiz Metadata */}
            <div className="p-6 border-b-2 border-purple-200 bg-white shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                <span className="text-purple-600">⚙️</span>
                Question Details
              </h2>
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

                {/* Subject - Pre-filled and disabled (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={quizMeta.subject}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed border-gray-300"
                  />
                  <p className="mt-1 text-xs text-gray-500">Pre-filled based on your assignment</p>
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
                  <select
                    value={quizMeta.chapter}
                    onChange={(e) => setQuizMeta({ ...quizMeta, chapter: e.target.value, slo: '' })}
                    onBlur={() => handleFieldTouch('chapter')}
                    disabled={!quizMeta.book}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${getFieldError('chapter') ? 'border-red-500 bg-red-50' : 'border-gray-300'} ${!quizMeta.book ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Select Chapter</option>
                    {availableChapters.map(ch => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Type *</label>
                  <select
                    value={quizMeta.type}
                    onChange={(e) => setQuizMeta({ ...quizMeta, type: e.target.value as QuizMeta["type"] })}
                    onBlur={() => handleFieldTouch('type')}
                    className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${getFieldError('type') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  >
                    <option value="">Select Question Type</option>
                    <option value="drag-drop">⚡ Drag & Drop - Students drag items to drop zones</option>
                    <option value="diagram-labeling">🏷️ Diagram Labeling - Label specific parts of an image</option>
                    <option value="matching">⇄ Textual Matching - Match pairs of text items</option>
                    <option value="categorization">📊 Column Sorting - Categorize items into columns</option>
                    <option value="ordering"># Sequence Ordering - Order items in correct sequence</option>
                  </select>
                  {getFieldError('type') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('type')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Question List */}
            <div className="flex-1 flex flex-col">
              <div className="p-6 border-b-2 border-purple-200 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-purple-600">📋</span>
                    Questions ({questions.length})
                  </h2>
                  <button
                    onClick={handleAddQuestion}
                    disabled={!quizMeta.type}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      !quizMeta.type
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-sm'
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
                  <div className="space-y-2 max-h-80 overflow-y-auto p-4 bg-gradient-to-b from-purple-50 to-pink-50">
                    {questions.map((q, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedQuestionIndex(idx)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedQuestionIndex === idx
                            ? 'border-purple-500 bg-white shadow-md scale-105'
                            : 'border-purple-200 hover:border-purple-400 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-medium text-white">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 mb-1">
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

                  {/* Type-specific Instructions */}
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-sm text-amber-900">
                      {quizMeta.type === 'drag-drop' && (
                        <>
                          <strong>📌 Drag & Drop Instructions:</strong> Add drag items (text to be dragged) and drop zones (target areas). Students will drag items to matching zones.
                        </>
                      )}
                      {quizMeta.type === 'diagram-labeling' && (
                        <>
                          <strong>🖼️ Diagram Labeling Instructions:</strong> Upload an image and create drop zones by clicking on different parts. Students will drag labels onto these zones.
                        </>
                      )}
                      {quizMeta.type === 'matching' && (
                        <>
                          <strong>🔗 Matching Instructions:</strong> Create pairs of items that students must match together. Add as many pairs as needed.
                        </>
                      )}
                      {quizMeta.type === 'categorization' && (
                        <>
                          <strong>📂 Categorization Instructions:</strong> Define categories and items. Students will sort items into the correct categories.
                        </>
                      )}
                      {quizMeta.type === 'ordering' && (
                        <>
                          <strong>📋 Ordering Instructions:</strong> Add steps that students must arrange in the correct sequence.
                        </>
                      )}
                    </div>
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
