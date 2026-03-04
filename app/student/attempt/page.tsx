'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useUserProfile } from '@/hooks/useUserProfile';
import UrduKeyboard from '@/components/UrduKeyboard';

interface QuizItem {
  questionId: string;
  questionType: string;
  subject: string;
  difficulty: string;
  slo: string;
  cognitiveLevel?: string;
  question: { text: string; format: string; isRTL?: boolean };
  options: { text: string; format: string }[];
  answer: { type: string; value: any };
  explanation: string;
  marks: number;
  isInteractive: boolean;
  interactiveData: any;
}

interface Quiz {
  id: string;
  title: string;
  quizType: string;
  quizFormat: string;
  class: string;
  subject: string;
  book: string;
  chapters: string[];
  slos: string[];
  isMarked: boolean;
  timeLimitMinutes: number;
  schedule: { startAt: any; endAt: any };
  totalQuestions: number;
  items: QuizItem[];
  totalMarks: number;
  rendering: { respectRTL: boolean; renderMath: boolean };
}

function normalizeQuestionType(rawType: any): string {
  const value = String(rawType || '').trim().toLowerCase();
  if (!value) return 'short';
  if (value === 'mcq' || value === 'multiplechoice') return 'multiple';
  if (value === 'true/false') return 'truefalse';
  if (value === 'fillintheblank' || value === 'fill in the blank') return 'fillblanks';
  if (value === 'shortanswer') return 'short';
  if (value === 'longanswer') return 'long';
  return value;
}

function normalizeQuizItem(rawItem: any, index: number): QuizItem {
  const rawQuestion = rawItem?.question;
  const questionText =
    typeof rawQuestion === 'string'
      ? rawQuestion
      : (rawQuestion?.text || rawItem?.questionText || rawItem?.question_text || '');

  const questionFormat =
    typeof rawQuestion === 'object' && rawQuestion?.format
      ? rawQuestion.format
      : 'text';

  const questionIsRTL =
    typeof rawQuestion === 'object' && rawQuestion?.isRTL
      ? Boolean(rawQuestion.isRTL)
      : false;

  const rawOptions = Array.isArray(rawItem?.options) ? rawItem.options : [];
  const options = rawOptions.map((opt: any) => {
    if (typeof opt === 'string') {
      return { text: opt, format: 'text' };
    }
    return {
      text: String(opt?.text || ''),
      format: String(opt?.format || 'text'),
    };
  });

  const rawAnswer = rawItem?.answer ?? rawItem?.correctAnswer ?? null;
  const answer =
    rawAnswer && typeof rawAnswer === 'object' && 'value' in rawAnswer
      ? {
          type: String((rawAnswer as any).type || 'text'),
          value: (rawAnswer as any).value,
        }
      : {
          type: 'text',
          value: rawAnswer,
        };

  return {
    questionId: String(rawItem?.questionId || rawItem?.id || `item-${index + 1}`),
    questionType: normalizeQuestionType(rawItem?.questionType || rawItem?.type || rawItem?.question_type),
    subject: String(rawItem?.subject || ''),
    difficulty: String(rawItem?.difficulty || 'Medium'),
    slo: String(rawItem?.slo || ''),
    cognitiveLevel: rawItem?.cognitiveLevel ? String(rawItem.cognitiveLevel) : undefined,
    question: {
      text: String(questionText || ''),
      format: String(questionFormat || 'text'),
      isRTL: questionIsRTL,
    },
    options,
    answer,
    explanation:
      typeof rawItem?.explanation === 'string'
        ? rawItem.explanation
        : String(rawItem?.explanation?.text || ''),
    marks: Number(rawItem?.marks) || 1,
    isInteractive: Boolean(rawItem?.isInteractive || rawItem?.is_interactive),
    interactiveData: rawItem?.interactiveData ?? rawItem?.interactive_data ?? null,
  };
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      {children}
    </div>
  );
}

function QuizAttemptPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const quizId = searchParams.get('id');

  // Helper function to format correct answer in human-readable format
  const formatCorrectAnswer = (correctAnswer: any, correctAnswerText?: string): string => {
    // If correctAnswerText is already provided and not empty, use it
    if (correctAnswerText) {
      return correctAnswerText;
    }

    // If correctAnswer is a simple string, return it
    if (typeof correctAnswer === 'string') {
      return correctAnswer;
    }

    // If correctAnswer is an array
    if (Array.isArray(correctAnswer)) {
      // Filter out empty values and join with commas
      const filtered = correctAnswer.filter(ans => ans !== null && ans !== undefined && ans !== '');
      if (filtered.length === 0) return 'No answer provided';
      
      // If array contains objects, try to extract text/label
      if (typeof filtered[0] === 'object') {
        return filtered.map(item => item.text || item.label || item.value || JSON.stringify(item)).join(', ');
      }
      
      // Simple array of strings/numbers
      return filtered.join(', ');
    }

    // If correctAnswer is an object
    if (typeof correctAnswer === 'object' && correctAnswer !== null) {
      // Try common properties that might contain the answer
      if (correctAnswer.text) return correctAnswer.text;
      if (correctAnswer.label) return correctAnswer.label;
      if (correctAnswer.value) return correctAnswer.value;
      if (correctAnswer.answer) return correctAnswer.answer;
      
      // If it's an object with multiple properties, try to format it nicely
      const entries = Object.entries(correctAnswer);
      if (entries.length > 0) {
        return entries.map(([key, value]) => `${key}: ${value}`).join(', ');
      }
    }

    // Fallback to JSON.stringify but remove quotes for cleaner look
    const stringified = JSON.stringify(correctAnswer);
    // Remove outer quotes if it's a quoted string
    return stringified.replace(/^"(.*)"$/, '$1');
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: any }>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [resultsData, setResultsData] = useState<any>(null);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [showUrduKeyboard, setShowUrduKeyboard] = useState<{[key: number]: boolean}>({});
  const textAreaRefs = useRef<{[key: number]: HTMLTextAreaElement | null}>({});
  const blankInputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});
  const { user } = useUserProfile();

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!quizId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/quizzes/${quizId}`);
        if (response.ok) {
          const result = await response.json();
          const quizData = (result.quiz || {}) as any;
          const rawItems = Array.isArray(quizData.items)
            ? quizData.items
            : Array.isArray(quizData.quizItems)
              ? quizData.quizItems
              : Array.isArray(quizData.questions)
                ? quizData.questions
                : [];
          const normalizedItems = rawItems.map((item: any, idx: number) => normalizeQuizItem(item, idx));
          const normalizedQuiz: Quiz = {
            ...quizData,
            isMarked: Boolean(quizData.isMarked ?? quizData.is_marked),
            timeLimitMinutes: Number(quizData.timeLimitMinutes) || 30,
            totalQuestions: Number(quizData.totalQuestions) || normalizedItems.length,
            items: normalizedItems,
          };
          // Allow quizzes without quizFormat (legacy) or with quizFormat === 'Online'
          // Only reject if explicitly set to 'Offline'
          if (normalizedQuiz && normalizedQuiz.quizFormat !== 'Offline') {
            setQuiz(normalizedQuiz);
            setTimeRemaining((normalizedQuiz.timeLimitMinutes || 30) * 60);
          }
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  useEffect(() => {
    if (!quizStarted || quizSubmitted || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, quizSubmitted, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = useCallback((questionIndex: number, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: value }));
  }, []);

  const calculateScore = useCallback(() => {
    if (!quiz) return 0;
    let totalScore = 0;

    quiz.items.forEach((item, index) => {
      const userAnswer = answers[index];
      
      // Skip short and long answer questions (require manual grading)
      if (['short', 'shortanswer', 'long', 'longanswer'].includes(item.questionType)) {
        return;
      }
      
      if (!userAnswer) return;

      const isCorrect = checkAnswer(item, userAnswer);
      if (isCorrect) {
        totalScore += item.marks || 1;
      }
    });

    return totalScore;
  }, [quiz, answers]);

  const checkAnswer = (item: QuizItem, userAnswer: any): boolean => {
    const { questionType, answer, isInteractive, interactiveData } = item;

    if (isInteractive && interactiveData) {
      return checkInteractiveAnswer(interactiveData, userAnswer);
    }

    switch (questionType) {
      case 'multiple':
      case 'mcqs':
        // Case-insensitive comparison for MCQs
        const correctAnswerMCQ = String(answer.value || '').toLowerCase().trim();
        const userAnswerMCQ = String(userAnswer || '').toLowerCase().trim();
        return correctAnswerMCQ === userAnswerMCQ;
      case 'truefalse':
        // Case-insensitive comparison for True/False
        const correctAnswerTF = String(answer.value || '').toLowerCase().trim();
        const userAnswerTF = String(userAnswer || '').toLowerCase().trim();
        return correctAnswerTF === userAnswerTF;
      case 'fill':
      case 'fillinblank':
      case 'fillblanks':
        // Handle empty or missing answer
        if (!userAnswer) {
          return false;
        }
        
        if (Array.isArray(answer.value)) {
          // If answer is an array, compare each element
          return answer.value.every((ans: string, i: number) => {
            const userAns = typeof userAnswer === 'object' ? (userAnswer[i] || '') : '';
            return ans.toLowerCase().trim() === userAns.toLowerCase().trim();
          });
        } else if (typeof answer.value === 'object' && answer.value !== null && !Array.isArray(answer.value)) {
          // If answer is an object (key-value pairs)
          return Object.keys(answer.value).every((key: string) => {
            const correctAns = answer.value[key];
            const userAns = userAnswer[key];
            if (Array.isArray(correctAns)) {
              return correctAns.some((ans: string) => ans.toLowerCase().trim() === (userAns || '').toLowerCase().trim());
            }
            return correctAns.toLowerCase().trim() === (userAns || '').toLowerCase().trim();
          });
        } else if (typeof userAnswer === 'string') {
          // Simple string answer
          return answer.value?.toLowerCase().trim() === userAnswer?.toLowerCase().trim();
        } else if (typeof userAnswer === 'object') {
          // userAnswer is object with indices - check if all blanks are filled
          const values = Object.values(userAnswer) as string[];
          return values.length > 0 && values.every(v => typeof v === 'string' && v.trim().length > 0);
        }
        return false;
      case 'short':
      case 'shortanswer':
      case 'long':
      case 'longanswer':
        return true;
      default:
        return false;
    }
  };

  const checkInteractiveAnswer = (interactiveData: any, userAnswer: any): boolean => {
    if (!userAnswer) return false;

    switch (interactiveData.type) {
      case 'dragdrop':
      case 'drag-drop':
        const correctPairs = interactiveData.pairs || [];
        return correctPairs.every((pair: any, i: number) =>
          userAnswer[i] === pair.target
        );

      case 'matching':
      case 'textual-matching':
        const correctMatches = interactiveData.pairs || [];
        return correctMatches.every((pair: any, i: number) =>
          userAnswer[pair.left] === pair.right
        );

      case 'sequence':
      case 'sequence-ordering':
        const correctSequence = interactiveData.items?.map((item: any) => item.id || item.text) || [];
        return JSON.stringify(correctSequence) === JSON.stringify(userAnswer);

      case 'column-sorting':
        const correctColumns = interactiveData.columns || {};
        return Object.keys(correctColumns).every((col) =>
          JSON.stringify(correctColumns[col].sort()) === JSON.stringify((userAnswer[col] || []).sort())
        );

      case 'diagram-labeling':
        const correctLabels = interactiveData.labels || [];
        return correctLabels.every((label: any, i: number) =>
          userAnswer[i]?.toLowerCase().trim() === label.text?.toLowerCase().trim()
        );

      default:
        return false;
    }
  };

  const calculateTotalMarks = useCallback(() => {
    if (!quiz) return 0;
    let total = 0;

    quiz.items.forEach((item) => {
      // Include all questions (including short/long answer) in total marks
      total += item.marks || 1;
    });

    return total || quiz.items.length;
  }, [quiz]);

  const handleSubmitQuiz = async () => {
    if (!quiz || quizSubmitted) return;

    const finalScore = calculateScore();
    const totalMarks = calculateTotalMarks();
    setScore(finalScore);
    setQuizSubmitted(true);
    setShowResults(true);

    try {
      const response = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quiz.id,
          quizTitle: quiz.title,
          subject: quiz.subject,  // Include subject for dashboard display
          studentId: user?.uid || 'current_student',
          studentName: user?.name || 'Unknown Student',  // Include student name
          answers,
          score: finalScore,
          totalMarks: totalMarks,
          percentage: Math.round((finalScore / totalMarks) * 100),
          timeSpent: (quiz.timeLimitMinutes || 30) * 60 - timeRemaining,
          submittedAt: new Date().toISOString(),
          quizItems: quiz.items,
          isMarked: quiz.isMarked || false,  // Pass the quiz's marked status
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setResultsData(data);
      } else {
        const errorData = await response.json();
      }
    } catch (error) {
    }
  };

  const renderBasicQuestion = (item: QuizItem, index: number) => {
    const { questionType, options } = item;
    const question = item.question || { text: '', format: 'text', isRTL: false };
    const isRTL = Boolean(question.isRTL);

    switch (questionType) {
      case 'multiple':
      case 'mcqs':
        return (
          <div className="space-y-2">
            {options.map((option, optIndex) => (
              <label
                key={optIndex}
                onClick={() => handleAnswerChange(index, optIndex)}
                className={`group flex items-center p-3 sm:p-3.5 border-2 rounded-lg cursor-pointer transition-all shadow-sm ${
                  answers[index] === optIndex
                    ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-purple-400 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-blue-50/50'
                } ${ isRTL ? 'flex-row-reverse text-right font-noto-nastaliq' : ''}`}
              >
                <div className={`relative flex items-center justify-center flex-shrink-0 ${
                  answers[index] === optIndex
                    ? 'w-5 h-5 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full shadow-md'
                    : 'w-5 h-5 border-2 border-gray-300 rounded-full group-hover:border-purple-500 transition-colors'
                }`}>
                  {answers[index] === optIndex && (
                    <i className="ri-check-line text-white text-xs font-bold"></i>
                  )}
                </div>
                <span className={`${
                  isRTL ? 'mr-3' : 'ml-3'
                } flex-1 text-sm sm:text-base font-medium text-gray-700 group-hover:text-purple-700 transition-colors break-words`}>
                  <span className="font-bold text-purple-600 mr-1.5">
                    {isRTL ? ['ا', 'ب', 'ج', 'د'][optIndex] : String.fromCharCode(65 + optIndex)}.
                  </span>
                  {option.text}
                </span>
              </label>
            ))}
          </div>
        );

      case 'truefalse':
        return (
          <div className="flex gap-3">
            {[true, false].map((val) => (
              <label
                key={val.toString()}
                className={`group flex-1 flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all shadow-sm ${
                  answers[index] === val
                    ? val
                      ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md'
                      : 'border-red-500 bg-gradient-to-br from-red-50 to-rose-50 shadow-md'
                    : 'border-gray-200 hover:border-purple-400 hover:bg-gradient-to-br hover:from-purple-50 hover:to-blue-50'
                } ${ isRTL ? 'font-noto-nastaliq' : ''}`}
              >
                <input
                  type="radio"
                  name={`question-${index}`}
                  checked={answers[index] === val}
                  onChange={() => handleAnswerChange(index, val)}
                  className="w-5 h-5 text-purple-600 mr-2"
                />
                <span className="font-medium">{isRTL ? (val ? 'صحیح' : 'غلط') : val ? 'True' : 'False'}</span>
              </label>
            ))}
          </div>
        );

      case 'fill':
      case 'fillinblank':
      case 'fillblanks':
        // Detect blanks with both {blank#} and ______ patterns
        const blankPattern1 = question.text.match(/\{blank\d+\}/g) || [];
        const blankPattern2 = question.text.match(/_{3,}/g) || []; // 3 or more underscores
        const detectedBlanks = blankPattern1.length > 0 ? blankPattern1 : blankPattern2;
        
        if (detectedBlanks.length === 0) {
          // If no blanks detected, show fallback text area
          return (
            <div className="space-y-4">
              <div className={`p-4 bg-blue-50 border border-blue-200 rounded-lg ${isRTL ? 'text-right font-noto-nastaliq' : ''}`}>
                <p className="text-sm font-medium text-blue-800 mb-3">
                  {isRTL ? 'اپنا جواب یہاں درج کریں:' : 'Fill in the blanks:'}
                </p>
                {isRTL && (
                  <button
                    type="button"
                    onClick={() => setShowUrduKeyboard(prev => ({ ...prev, [index]: !prev[index] }))}
                    className="mb-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
                  >
                    <i className="ri-keyboard-line mr-1"></i>
                    {showUrduKeyboard[index] ? 'Hide Urdu Keyboard' : 'Show Urdu Keyboard'}
                  </button>
                )}
                {isRTL && showUrduKeyboard[index] && (
                  <UrduKeyboard
                    isVisible={true}
                    onInsert={(char) => {
                      const textarea = textAreaRefs.current[index];
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const currentValue = answers[index] || '';
                        const newValue = currentValue.slice(0, start) + char + currentValue.slice(end);
                        handleAnswerChange(index, newValue);
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + char.length, start + char.length);
                        }, 0);
                      }
                    }}
                  />
                )}
                <textarea
                  ref={(el) => { textAreaRefs.current[index] = el; }}
                  value={answers[index] || ''}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  className={`w-full px-3 py-2.5 border-2 border-purple-300 rounded-lg focus:border-transparent focus:ring-2 focus:ring-purple-200 resize-none shadow-sm bg-white transition-all hover:border-purple-400 focus:shadow-md text-sm ${
                    isRTL ? 'text-right font-noto-nastaliq' : ''
                  }`}
                  rows={2}
                  placeholder={isRTL ? 'اپنا جواب لکھیں' : 'Type your answer here...'}
                />
              </div>
            </div>
          );
        }
        
        // Split by either {blank#} or ______ pattern
        const splitPattern = /(\{blank\d+\}|_{3,})/;
        const parts = question.text.split(splitPattern);
        let blankIdx = 0;
        
        return (
          <div className="space-y-4">
            {isRTL && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUrduKeyboard(prev => ({ ...prev, [index]: !prev[index] }))}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
                >
                  <i className="ri-keyboard-line mr-1"></i>
                  {showUrduKeyboard[index] ? 'Hide Urdu Keyboard' : 'Show Urdu Keyboard'}
                </button>
              </div>
            )}
            {isRTL && showUrduKeyboard[index] && (
              <UrduKeyboard
                isVisible={true}
                onInsert={(char) => {
                  // Find the currently focused blank input
                  const focusedKey = Object.keys(blankInputRefs.current).find(key => {
                    return blankInputRefs.current[key] === document.activeElement;
                  });
                  if (focusedKey) {
                    const [qIndex, blankIndex] = focusedKey.split('-').map(Number);
                    if (qIndex === index) {
                      const input = blankInputRefs.current[focusedKey];
                      if (input) {
                        const start = input.selectionStart || 0;
                        const end = input.selectionEnd || 0;
                        const currentValue = answers[index]?.[blankIndex] || '';
                        const newValue = currentValue.slice(0, start) + char + currentValue.slice(end);
                        const newBlanks = { ...(answers[index] || {}) };
                        newBlanks[blankIndex] = newValue;
                        handleAnswerChange(index, newBlanks);
                        setTimeout(() => {
                          input.focus();
                          input.setSelectionRange(start + char.length, start + char.length);
                        }, 0);
                      }
                    }
                  }
                }}
              />
            )}
            <div className={`p-3 bg-white border-2 border-gray-200 rounded-lg leading-normal text-sm sm:text-base ${isRTL ? 'text-right font-noto-nastaliq' : ''}`}>
              <div className="inline-flex flex-wrap gap-1 items-baseline">
                {parts.map((part, partIndex) => {
                  // Check if this part is a blank placeholder
                  if (part.match(/(\{blank\d+\}|_{3,})/)) {
                    const currentBlankIndex = blankIdx++;
                    const refKey = `${index}-${currentBlankIndex}`;
                    return (
                      <input
                        key={`blank-${currentBlankIndex}`}
                        ref={(el) => { blankInputRefs.current[refKey] = el; }}
                        type="text"
                        value={answers[index]?.[currentBlankIndex] || ''}
                        onChange={(e) => {
                          const newBlanks = { ...(answers[index] || {}) };
                          newBlanks[currentBlankIndex] = e.target.value;
                          handleAnswerChange(index, newBlanks);
                        }}
                        className={`px-2.5 py-1.5 border-2 border-purple-400 bg-gradient-to-r from-purple-50 to-blue-50 focus:from-purple-100 focus:to-blue-100 focus:outline-none focus:ring-2 focus:ring-purple-300 min-w-[80px] text-center font-semibold text-sm rounded-lg shadow-sm transition-all hover:border-purple-500 ${
                          isRTL ? 'font-noto-nastaliq' : ''
                        }`}
                        placeholder="____"
                        style={{ width: Math.max(80, (answers[index]?.[currentBlankIndex] || '').length * 9 + 35) + 'px' }}
                      />
                    );
                  }
                  
                  // Regular text part
                  if (part.trim()) {
                    return (
                      <span key={`text-${partIndex}`} className="inline">
                        {part}
                      </span>
                    );
                  }
                  
                  return null;
                })}
              </div>
            </div>
          </div>
        );

      case 'short':
      case 'shortanswer':
        return (
          <div className="space-y-2">
            {isRTL && (
              <button
                type="button"
                onClick={() => setShowUrduKeyboard(prev => ({ ...prev, [index]: !prev[index] }))}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
              >
                <i className="ri-keyboard-line mr-1"></i>
                {showUrduKeyboard[index] ? 'Hide Urdu Keyboard' : 'Show Urdu Keyboard'}
              </button>
            )}
            {isRTL && showUrduKeyboard[index] && (
              <UrduKeyboard
                isVisible={true}
                onInsert={(char) => {
                  const textarea = textAreaRefs.current[index];
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const currentValue = answers[index] || '';
                    const newValue = currentValue.slice(0, start) + char + currentValue.slice(end);
                    handleAnswerChange(index, newValue);
                    setTimeout(() => {
                      textarea.focus();
                      textarea.setSelectionRange(start + char.length, start + char.length);
                    }, 0);
                  }
                }}
              />
            )}
            <textarea
              ref={(el) => { textAreaRefs.current[index] = el; }}
              value={answers[index] || ''}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              className={`w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:border-transparent focus:ring-2 focus:ring-purple-200 bg-white shadow-sm resize-none transition-all hover:border-purple-300 text-sm ${
                isRTL ? 'text-right font-noto-nastaliq' : ''
              } focus:shadow-md`}
              rows={2}
              placeholder={isRTL ? 'مختصر جواب لکھیں' : 'Write a short answer...'}
            />
          </div>
        );

      case 'long':
      case 'longanswer':
        return (
          <div className="space-y-2">
            {isRTL && (
              <button
                type="button"
                onClick={() => setShowUrduKeyboard(prev => ({ ...prev, [index]: !prev[index] }))}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
              >
                <i className="ri-keyboard-line mr-1"></i>
                {showUrduKeyboard[index] ? 'Hide Urdu Keyboard' : 'Show Urdu Keyboard'}
              </button>
            )}
            {isRTL && showUrduKeyboard[index] && (
              <UrduKeyboard
                isVisible={true}
                onInsert={(char) => {
                  const textarea = textAreaRefs.current[index];
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const currentValue = answers[index] || '';
                    const newValue = currentValue.slice(0, start) + char + currentValue.slice(end);
                    handleAnswerChange(index, newValue);
                    setTimeout(() => {
                      textarea.focus();
                      textarea.setSelectionRange(start + char.length, start + char.length);
                    }, 0);
                  }
                }}
              />
            )}
            <textarea
              ref={(el) => { textAreaRefs.current[index] = el; }}
              value={answers[index] || ''}
              onChange={(e) => handleAnswerChange(index, e.target.value)}
              className={`w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:border-transparent focus:ring-2 focus:ring-purple-200 bg-white shadow-sm resize-none transition-all hover:border-purple-300 text-sm ${
                isRTL ? 'text-right font-noto-nastaliq' : ''
              } focus:shadow-md`}
              rows={4}
              placeholder={isRTL ? 'تفصیلی جواب لکھیں' : 'Write a detailed answer...'}
            />
          </div>
        );

      default:
        return <p className="text-gray-500">Unsupported question type: {questionType}</p>;
    }
  };

  const renderInteractiveQuestion = (item: QuizItem, index: number) => {
    const { interactiveData } = item;
    const question = item.question || { text: '', format: 'text', isRTL: false };
    if (!interactiveData) return null;

    const isRTL = Boolean(question.isRTL);
    const type = interactiveData.type;

    switch (type) {
      case 'dragdrop':
      case 'drag-drop':
        return <DragDropQuestion data={interactiveData} index={index} answers={answers} onAnswer={handleAnswerChange} isRTL={isRTL} />;

      case 'matching':
      case 'textual-matching':
        return <MatchingQuestion data={interactiveData} index={index} answers={answers} onAnswer={handleAnswerChange} isRTL={isRTL} />;

      case 'sequence':
      case 'sequence-ordering':
        return <SequenceQuestion data={interactiveData} index={index} answers={answers} onAnswer={handleAnswerChange} isRTL={isRTL} />;

      case 'column-sorting':
        return <ColumnSortingQuestion data={interactiveData} index={index} answers={answers} onAnswer={handleAnswerChange} isRTL={isRTL} />;

      case 'diagram-labeling':
        return <DiagramLabelingQuestion data={interactiveData} index={index} answers={answers} onAnswer={handleAnswerChange} isRTL={isRTL} />;

      default:
        return <p className="text-gray-500">Unsupported interactive type: {type}</p>;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!quizId || !quiz) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole="Student" currentPage="attempt" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 lg:ml-64 p-4 lg:p-8">
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 bg-purple-100 rounded-full flex items-center justify-center">
              <i className="ri-file-list-3-line text-4xl text-purple-600"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Quiz Found</h2>
            <p className="text-gray-600 mb-6">The quiz you're looking for doesn't exist or is not available.</p>
            <button
              onClick={() => router.push('/student/dashboard')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!Array.isArray(quiz.items) || quiz.items.length === 0) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole="Student" currentPage="attempt" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 lg:ml-64 p-4 lg:p-8">
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
              <i className="ri-alert-line text-4xl text-amber-600"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Questions in Quiz</h2>
            <p className="text-gray-600 mb-6">This quiz has no question items available yet. Please contact your teacher.</p>
            <button
              onClick={() => router.push('/student/assigned')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Back to Assigned Quizzes
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (showResults) {
    // Calculate total marks including ALL questions (auto-graded + manual-graded)
    const totalMarksForResult = quiz.items.reduce((sum: number, item: any) => sum + (item.marks || 1), 0) || quiz.items.length;
    const percentage = Math.round((score / totalMarksForResult) * 100);
    const questionResults = resultsData?.questionResults || [];
    const correctCount = questionResults.filter((q: any) => q.isCorrect).length;

    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole="Student" currentPage="attempt" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 lg:ml-64 p-3 lg:p-4 flex items-center justify-center">
          <div className="max-w-4xl mx-auto w-full">
            {/* Summary Card */}
            <div className="bg-gradient-to-br from-white via-purple-50/20 to-blue-50/20 rounded-2xl shadow-xl border border-purple-200 p-4 sm:p-5 lg:p-6 relative overflow-hidden">
              {/* Decorative Background Elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-200/20 to-blue-200/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-200/20 to-purple-200/20 rounded-full blur-3xl -ml-20 -mb-20"></div>
              
              {/* Top Action Buttons */}
              <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-4">
                <button
                  onClick={() => {
                    setShowBreakdownModal(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-semibold flex items-center justify-center gap-2 shadow-md text-sm"
                >
                  <i className="ri-eye-line"></i>
                  View Detailed Breakdown
                </button>
                <button
                  onClick={() => router.push('/student/dashboard')}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-semibold flex items-center justify-center gap-2 shadow-md text-sm"
                >
                  <i className="ri-home-line"></i>
                  Back to Dashboard
                </button>
              </div>

              <div className="relative z-10 text-center mb-5">
                <div className={`w-32 sm:w-36 h-32 sm:h-36 mx-auto mb-4 rounded-full flex items-center justify-center shadow-xl relative ${
                  percentage >= 80 ? 'bg-gradient-to-br from-green-400 to-emerald-500' : percentage >= 50 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : 'bg-gradient-to-br from-red-400 to-rose-500'
                }`}>
                  <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                    <span className={`text-3xl sm:text-4xl font-black ${
                      percentage >= 80 ? 'bg-gradient-to-br from-green-600 to-emerald-600' : percentage >= 50 ? 'bg-gradient-to-br from-yellow-600 to-amber-600' : 'bg-gradient-to-br from-red-600 to-rose-600'
                    } bg-clip-text text-transparent`}>
                      {percentage}%
                    </span>
                  </div>
                  {percentage >= 80 && (
                    <div className="absolute -top-1 -right-1 w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                      <i className="ri-trophy-line text-2xl text-white"></i>
                    </div>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-purple-700 to-blue-600 bg-clip-text text-transparent mb-2">Quiz Completed!</h2>
                <p className="text-sm sm:text-base text-gray-600 font-semibold mb-2">{quiz.title}</p>
                <p className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold ${
                  percentage >= 80 ? 'bg-green-100 text-green-700' : percentage >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                }`}>
                  <i className={`${
                    percentage >= 80 ? 'ri-emotion-happy-line' : percentage >= 50 ? 'ri-emotion-normal-line' : 'ri-emotion-sad-line'
                  } text-base sm:text-lg`}></i>
                  {percentage >= 80 ? 'Excellent Performance!' : percentage >= 50 ? 'Good Effort!' : 'Keep Practicing!'}
                </p>
              </div>

              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-3 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                    <i className="ri-award-line text-lg text-white"></i>
                  </div>
                  <p className="text-xs font-semibold text-purple-600 mb-1">Your Score</p>
                  <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-purple-700 to-blue-600 bg-clip-text text-transparent">{score}<span className="text-base sm:text-lg">/{totalMarksForResult}</span></p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center shadow-md">
                    <i className="ri-check-double-line text-lg text-white"></i>
                  </div>
                  <p className="text-xs font-semibold text-green-600 mb-1">Correct Answers</p>
                  <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-green-700 to-emerald-600 bg-clip-text text-transparent">{correctCount}</p>
                  <p className="text-[10px] text-green-600 font-medium mt-0.5">(Auto-graded)</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-3 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center shadow-md">
                    <i className="ri-file-list-3-line text-lg text-white"></i>
                  </div>
                  <p className="text-xs font-semibold text-blue-600 mb-1">Total Questions</p>
                  <p className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">{quiz.items.length}</p>
                </div>
              </div>
            </div>

            {/* Cognitive Level Breakdown - HIDDEN, only shown in modal */}
            {/* {resultsData?.cognitiveBreakdown && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Cognitive Level Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(resultsData.cognitiveBreakdown).map(([level, data]: [string, any]) => {
                    const performanceColor = 
                      data.percentage >= 80 ? 'bg-green-50 border-green-300' :
                      data.percentage >= 60 ? 'bg-yellow-50 border-yellow-300' :
                      'bg-red-50 border-red-300';
                    
                    const textColor = 
                      data.percentage >= 80 ? 'text-green-700' :
                      data.percentage >= 60 ? 'text-yellow-700' :
                      'text-red-700';

                    return (
                      <div key={level} className={`border-2 rounded-xl p-4 ${performanceColor}`}>
                        <p className="text-sm font-semibold text-gray-700 mb-2">{level}</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Score:</span>
                            <span className={`text-lg font-bold ${textColor}`}>{data.percentage}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Correct:</span>
                            <span className="text-sm font-semibold text-gray-700">{data.correct}/{data.total}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                data.percentage >= 80 ? 'bg-green-500' :
                                data.percentage >= 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${data.percentage}%` }}
                            ></div>
                          </div>
                          {data.questionIndices && data.questionIndices.length > 0 && (
                            <div className="pt-2 border-t border-gray-300">
                              <p className="text-xs text-gray-600 font-medium mb-1">Questions:</p>
                              <div className="flex flex-wrap gap-1">
                                {data.questionIndices.map((idx: number) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white border border-gray-300 text-gray-700 font-medium">
                                    Q{idx + 1}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )} */}

            {/* Cognitive Level Breakdown - Only in Modal Header */}

            {/* Question Breakdown Modal */}
            {showBreakdownModal && (
              <>
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-fadeIn">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                    
                    {/* Modal Header with Cognitive Breakdown */}
                    <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-blue-600 text-white p-4 sm:p-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -ml-32 -mb-32"></div>
                      
                      <div className="relative z-10 flex justify-between items-center mb-4 sm:mb-6">
                        <div>
                          <h3 className="text-xl sm:text-2xl font-black flex items-center gap-2">
                            <i className="ri-file-list-3-line"></i>
                            Detailed Results
                          </h3>
                          <p className="text-purple-100 text-sm mt-1">Question-by-question breakdown</p>
                        </div>
                        <button
                          onClick={() => setShowBreakdownModal(false)}
                          className="text-white hover:bg-white/20 transition-all duration-300 w-10 h-10 rounded-xl flex items-center justify-center hover:rotate-90"
                        >
                          <i className="ri-close-line text-2xl"></i>
                        </button>
                      </div>
                      
                      {/* Cognitive Level Breakdown Grid */}
                      {resultsData?.cognitiveBreakdown && Object.keys(resultsData.cognitiveBreakdown).length > 0 && (
                        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                          {Object.entries(resultsData.cognitiveBreakdown).map(([level, data]: [string, any]) => {
                            const percentage = data.percentage;
                            const performanceColor = percentage >= 80 ? 'from-green-400 to-emerald-500' : percentage >= 60 ? 'from-yellow-400 to-amber-500' : 'from-red-400 to-rose-500';
                            const textColor = percentage >= 80 ? 'text-green-300' : percentage >= 60 ? 'text-yellow-300' : 'text-red-300';
                            return (
                              <div key={level} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 sm:p-4 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                                <p className="font-bold text-white text-sm sm:text-base truncate mb-2">{level}</p>
                                <div className={`text-2xl sm:text-3xl font-black bg-gradient-to-r ${performanceColor} bg-clip-text text-transparent mb-1`}>{percentage}%</div>
                                <p className="text-purple-100 text-xs">{data.correct}/{data.total} correct</p>
                                {data.questionIndices && data.questionIndices.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {data.questionIndices.slice(0, 3).map((idx: number) => (
                                      <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs bg-white/20 text-white font-medium">
                                        Q{idx + 1}
                                      </span>
                                    ))}
                                    {data.questionIndices.length > 3 && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs bg-white/20 text-white font-medium">
                                        +{data.questionIndices.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  {/* Modal Body - Scrollable */}
                  <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-3 sm:space-y-4 bg-gradient-to-b from-gray-50 to-white">
                    {questionResults.map((result: any, index: number) => (
                      <div key={index} className={`rounded-2xl p-4 sm:p-6 border-2 shadow-sm transition-all duration-300 hover:shadow-lg ${
                        result.status === 'Not Attempted' ? 'border-gray-300 bg-white hover:border-gray-400' : 
                        result.status === 'Attempted' ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50 hover:border-yellow-500' :
                        result.isCorrect ? 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 hover:border-green-500' : 'border-red-400 bg-gradient-to-br from-red-50 to-rose-50 hover:border-red-500'
                      }`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${
                              result.status === 'Not Attempted' ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                              result.status === 'Attempted' ? 'bg-gradient-to-br from-yellow-500 to-amber-600' :
                              result.isCorrect ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'
                            }`}>
                              {result.status === 'Not Attempted' ? <i className="ri-subtract-line"></i> :
                               result.status === 'Attempted' ? <i className="ri-time-line"></i> :
                               result.isCorrect ? <i className="ri-check-line text-xl"></i> : <i className="ri-close-line text-xl"></i>}
                            </div>
                            <div className="flex-1">
                              <span className="font-bold text-gray-800 text-base sm:text-lg">Question {index + 1}</span>
                              <div className="flex flex-wrap gap-2 mt-1.5">
                                {result.cognitiveLevel && result.cognitiveLevel !== 'Unknown' && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-200">
                                    <i className="ri-brain-line mr-1"></i>
                                    {result.cognitiveLevel}
                                  </span>
                                )}
                                {result.difficulty && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300 capitalize">
                                    <i className="ri-bar-chart-2-line mr-1"></i>
                                    {result.difficulty}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className={`text-sm font-bold whitespace-nowrap flex-shrink-0 px-3 py-1.5 rounded-lg ${
                            result.status === 'Not Attempted' ? 'bg-gray-200 text-gray-700' :
                            result.status === 'Attempted' ? 'bg-yellow-200 text-yellow-800' :
                            result.isCorrect ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                          }`}>
                            {result.status}
                          </span>
                        </div>

                        <div className="sm:ml-11 space-y-2 text-xs sm:text-sm">
                          <div>
                            <p className="font-medium text-gray-600">Question:</p>
                            <p className="text-gray-800 mt-0.5 break-words">
                              {typeof result.questionText === 'string'
                                ? result.questionText
                                : typeof result.questionText === 'object' && result.questionText?.text
                                ? result.questionText.text
                                : 'Question text unavailable'}
                            </p>
                            {/* Display image if available in results */}
                            {result.imageUrl && (
                              <div className="mt-2">
                                <img 
                                  src={result.imageUrl} 
                                  alt="Question illustration" 
                                  className="max-w-full h-auto rounded border border-gray-200 shadow-sm"
                                  style={{ maxHeight: '300px' }}
                                />
                              </div>
                            )}
                          </div>

                          {result.status !== 'Not Attempted' && (
                            <div>
                              <p className="font-medium text-gray-600">Your Answer:</p>
                              <p className="text-gray-700 mt-0.5 p-1.5 sm:p-2 bg-white rounded border border-gray-200 break-words">
                                {formatCorrectAnswer(result.userAnswer, result.userAnswerText)}
                              </p>
                            </div>
                          )}

                          {result.status === 'Correct' && (
                            <>
                              <div>
                                <p className="font-medium text-green-700">Correct Answer:</p>
                                <p className="text-green-800 mt-0.5 p-1.5 sm:p-2 bg-green-100 rounded border border-green-300 break-words">
                                  {formatCorrectAnswer(result.correctAnswer, result.correctAnswerText)}
                                </p>
                              </div>

                              {result.explanation && (
                                <div>
                                  <p className="font-medium text-blue-700">Explanation:</p>
                                  <p className="text-blue-900 mt-0.5 p-1.5 sm:p-2 bg-blue-100 rounded border border-blue-300 break-words">
                                    {typeof result.explanation === 'string'
                                      ? result.explanation
                                      : typeof result.explanation === 'object' && result.explanation?.text
                                      ? result.explanation.text
                                      : JSON.stringify(result.explanation)}
                                  </p>
                                </div>
                              )}
                            </>
                          )}

                          {result.status === 'Incorrect' && (
                            <>
                              <div>
                                <p className="font-medium text-green-700">Correct Answer:</p>
                                <p className="text-green-800 mt-0.5 p-1.5 sm:p-2 bg-green-100 rounded border border-green-300 break-words">
                                  {formatCorrectAnswer(result.correctAnswer, result.correctAnswerText)}
                                </p>
                              </div>

                              {result.explanation && (
                                <div>
                                  <p className="font-medium text-blue-700">Explanation:</p>
                                  <p className="text-blue-900 mt-0.5 p-1.5 sm:p-2 bg-blue-100 rounded border border-blue-300 break-words">
                                    {typeof result.explanation === 'string'
                                      ? result.explanation
                                      : typeof result.explanation === 'object' && result.explanation?.text
                                      ? result.explanation.text
                                      : JSON.stringify(result.explanation)}
                                  </p>
                                </div>
                              )}
                            </>
                          )}

                          {result.status === 'Attempted' && (
                            <div>
                              <p className="font-medium text-yellow-700">Note:</p>
                              <p className="text-yellow-800 mt-0.5 p-1.5 sm:p-2 bg-yellow-100 rounded border border-yellow-300">
                                This question requires manual grading by your teacher.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Modal Footer */}
                  <div className="bg-gray-100 p-3 sm:p-4 flex justify-end">
                    <button
                      onClick={() => setShowBreakdownModal(false)}
                      className="px-4 sm:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium text-sm sm:text-base"
                    >
                      Close
                    </button>
                  </div>
                </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole="Student" currentPage="attempt" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 lg:ml-64 p-4 lg:p-6 flex items-center justify-center">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed top-4 left-4 z-20 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors bg-white shadow-md"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>

          <div className="max-w-2xl mx-auto w-full">
            <div className="bg-gradient-to-br from-white via-purple-50/30 to-blue-50/30 rounded-2xl shadow-xl border border-purple-200 p-4 sm:p-5 lg:p-6">
              <div className="text-center mb-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 mx-auto mb-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <i className="ri-file-list-3-line text-xl sm:text-2xl lg:text-3xl text-white"></i>
                </div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-purple-700 to-blue-600 bg-clip-text text-transparent mb-1">{quiz.title}</h1>
                <p className="text-xs sm:text-sm text-gray-600 font-medium">{quiz.subject} • Grade {quiz.class}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-3 text-center">
                  <i className="ri-question-line text-2xl text-purple-600 mb-1"></i>
                  <p className="text-xs text-purple-600 font-semibold mb-0.5">Questions</p>
                  <p className="text-xl font-bold bg-gradient-to-r from-purple-700 to-blue-600 bg-clip-text text-transparent">{quiz.items.length}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-3 text-center">
                  <i className="ri-time-line text-2xl text-blue-600 mb-1"></i>
                  <p className="text-xs text-blue-600 font-semibold mb-0.5">Time Limit</p>
                  <p className="text-xl font-bold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">{quiz.timeLimitMinutes || 30} mins</p>
                </div>
                {quiz.isMarked && (
                  <>
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 text-center">
                      <i className="ri-medal-line text-2xl text-amber-600 mb-1"></i>
                      <p className="text-xs text-amber-600 font-semibold mb-0.5">Total Marks</p>
                      <p className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">{quiz.totalMarks}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <i className="ri-bar-chart-line text-2xl text-emerald-600 mb-1"></i>
                      <p className="text-xs text-emerald-600 font-semibold mb-0.5">Quiz Type</p>
                      <p className="text-xl font-bold bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">{quiz.quizType}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-3 mb-4">
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                    <i className="ri-information-line text-sm text-white"></i>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-amber-900 text-xs mb-1.5">Important Instructions</p>
                    <ul className="text-xs text-amber-800 space-y-1">
                      <li className="flex items-start gap-1.5"><i className="ri-check-line text-amber-600 mt-0.5"></i><span>Answer all questions before submitting</span></li>
                      <li className="flex items-start gap-1.5"><i className="ri-check-line text-amber-600 mt-0.5"></i><span>Cannot go back once submitted</span></li>
                      <li className="flex items-start gap-1.5"><i className="ri-check-line text-amber-600 mt-0.5"></i><span>Auto-submit when time runs out</span></li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setQuizStarted(true)}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-base font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <i className="ri-play-circle-line text-xl"></i>
                Start Quiz
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const currentItem = quiz.items[currentQuestion] || quiz.items[0];
  const currentQuestionText = String(currentItem?.question?.text || '');
  const currentQuestionRTL = Boolean(currentItem?.question?.isRTL);
  const progress = ((currentQuestion + 1) / quiz.items.length) * 100;
  const isUrgent = timeRemaining < 60;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="Student" currentPage="attempt" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 lg:ml-64 p-2 sm:p-3 lg:p-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden mb-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
        >
          <i className="ri-menu-line text-2xl"></i>
        </button>

        <div className="sticky top-0 z-10 bg-gradient-to-br from-white via-purple-50/30 to-blue-50/30 rounded-xl shadow-lg border border-purple-100/50 p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-2xs sm:text-xs font-semibold text-purple-600">Quiz in Progress</p>
              <h1 className="text-sm sm:text-base lg:text-lg font-bold bg-gradient-to-r from-purple-700 to-blue-600 bg-clip-text text-transparent truncate">{quiz.title}</h1>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-base sm:text-lg font-bold shadow-md transition-all duration-300 ${
              isUrgent ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white animate-pulse scale-105' : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
            }`}>
              <i className="ri-time-line text-lg sm:text-xl"></i>
              {formatTime(timeRemaining)}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs sm:text-sm font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full whitespace-nowrap">
              {currentQuestion + 1} / {quiz.items.length}
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white via-white to-purple-50/20 rounded-xl sm:rounded-2xl shadow-lg border border-purple-100 p-3 sm:p-4 lg:p-5 mb-3">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm">
              <i className="ri-question-line mr-1.5"></i>
              Question {currentQuestion + 1}
            </span>
            {quiz.isMarked && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs sm:text-sm font-semibold bg-amber-100 text-amber-700 border border-amber-300">
                <i className="ri-medal-line mr-1"></i>
                {currentItem.marks} marks
              </span>
            )}
          </div>

          <h2 className={`text-base sm:text-lg lg:text-xl font-semibold text-gray-800 mb-4 sm:mb-5 leading-normal ${
            currentQuestionRTL ? 'text-right font-noto-nastaliq' : ''
          }`}>
            {['fill', 'fillinblank', 'fillblanks'].includes(currentItem.questionType) 
              ? '' 
              : currentQuestionText.replace(/\{blank\d+\}/g, '_____')
            }
          </h2>

          {/* Display image if available */}
          {(currentItem as any).imageUrl && (
            <div className="mb-4">
              <img 
                src={(currentItem as any).imageUrl} 
                alt="Question illustration" 
                className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm mx-auto"
                style={{ maxHeight: '300px' }}
              />
            </div>
          )}

          {currentItem.isInteractive
            ? renderInteractiveQuestion(currentItem, currentQuestion)
            : renderBasicQuestion(currentItem, currentQuestion)
          }
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
          <button
            onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
            className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-lg font-semibold hover:from-gray-200 hover:to-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <i className="ri-arrow-left-line mr-1.5"></i>
            Previous
          </button>

          <div className="flex gap-1.5 overflow-x-auto py-1 px-1">
            {quiz.items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestion(i)}
                className={`w-9 h-9 rounded-lg font-bold transition-all flex-shrink-0 text-sm ${
                  i === currentQuestion
                    ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white scale-105 shadow-md'
                    : answers[i] !== undefined
                    ? 'bg-gradient-to-br from-green-100 to-emerald-100 text-green-700 border border-green-400'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {currentQuestion === quiz.items.length - 1 ? (
            <button
              onClick={handleSubmitQuiz}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-md text-sm"
            >
              Submit Quiz
              <i className="ri-check-line ml-1.5"></i>
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion((prev) => Math.min(quiz.items.length - 1, prev + 1))}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-md text-sm"
            >
              Next
              <i className="ri-arrow-right-line ml-2"></i>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default function QuizAttemptPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QuizAttemptPageContent />
    </Suspense>
  );
}

function DragDropQuestion({ data, index, answers, onAnswer, isRTL }: any) {
  const [items, setItems] = useState(data.items || []);
  const [droppedItems, setDroppedItems] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (answers[index]) {
      setDroppedItems(answers[index]);
    }
  }, [answers, index]);

  const handleDrop = (targetId: string, itemId: string) => {
    const newDropped = { ...droppedItems, [itemId]: targetId };
    setDroppedItems(newDropped);
    onAnswer(index, newDropped);
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'direction-rtl' : ''}`}>
      <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-xl min-h-[80px]">
        {items.filter((item: any) => !Object.keys(droppedItems).includes(item.id)).map((item: any) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg cursor-grab hover:bg-purple-200 transition"
          >
            {item.text}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(data.targets || []).map((target: any) => (
          <div
            key={target.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const itemId = e.dataTransfer.getData('text/plain');
              handleDrop(target.id, itemId);
            }}
            className="p-4 border-2 border-dashed border-gray-300 rounded-xl min-h-[100px] bg-white"
          >
            <p className="text-sm font-medium text-gray-600 mb-2">{target.text}</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(droppedItems)
                .filter(([_, tId]) => tId === target.id)
                .map(([itemId, _]) => {
                  const item = items.find((i: any) => i.id === itemId);
                  return item ? (
                    <span
                      key={itemId}
                      onClick={() => {
                        const newDropped = { ...droppedItems };
                        delete newDropped[itemId];
                        setDroppedItems(newDropped);
                        onAnswer(index, newDropped);
                      }}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-lg cursor-pointer hover:bg-red-100 hover:text-red-700 transition"
                    >
                      {item.text} ✕
                    </span>
                  ) : null;
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchingQuestion({ data, index, answers, onAnswer, isRTL }: any) {
  const [matches, setMatches] = useState<{ [key: string]: string }>({});
  const leftItems = data.leftItems || data.pairs?.map((p: any) => ({ id: p.left, text: p.left })) || [];
  const rightItems = data.rightItems || data.pairs?.map((p: any) => ({ id: p.right, text: p.right })) || [];

  useEffect(() => {
    if (answers[index]) {
      setMatches(answers[index]);
    }
  }, [answers, index]);

  const handleMatch = (leftId: string, rightId: string) => {
    const newMatches = { ...matches, [leftId]: rightId };
    setMatches(newMatches);
    onAnswer(index, newMatches);
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-600 mb-2">Items</p>
        {leftItems.map((item: any) => (
          <div
            key={item.id}
            className={`p-3 rounded-lg border-2 ${
              matches[item.id] ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
            } ${isRTL ? 'text-right font-noto-nastaliq' : ''}`}
          >
            {item.text}
            {matches[item.id] && (
              <span className="ml-2 text-green-600">→ {rightItems.find((r: any) => r.id === matches[item.id])?.text}</span>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-600 mb-2">Match With</p>
        {rightItems.map((item: any) => {
          const isMatched = Object.values(matches).includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => {
                const unmatched = leftItems.find((l: any) => !matches[l.id]);
                if (unmatched && !isMatched) {
                  handleMatch(unmatched.id, item.id);
                }
              }}
              disabled={isMatched}
              className={`w-full p-3 rounded-lg border-2 text-left transition ${
                isMatched
                  ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                  : 'bg-purple-50 border-purple-200 hover:bg-purple-100 cursor-pointer'
              } ${isRTL ? 'text-right font-noto-nastaliq' : ''}`}
            >
              {item.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SequenceQuestion({ data, index, answers, onAnswer, isRTL }: any) {
  const [sequence, setSequence] = useState<string[]>([]);

  useEffect(() => {
    if (answers[index]) {
      setSequence(answers[index]);
    } else {
      const shuffled = [...(data.items || [])].sort(() => Math.random() - 0.5).map((i: any) => i.id || i.text);
      setSequence(shuffled);
    }
  }, [data.items, answers, index]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sequence.indexOf(active.id as string);
      const newIndex = sequence.indexOf(over.id as string);
      const newSequence = arrayMove(sequence, oldIndex, newIndex);
      setSequence(newSequence);
      onAnswer(index, newSequence);
    }
  };

  const getItemText = (id: string) => {
    const item = (data.items || []).find((i: any) => (i.id || i.text) === id);
    return item?.text || id;
  };

  return (
    <div className={isRTL ? 'direction-rtl' : ''}>
      <p className="text-sm text-gray-600 mb-4">Drag and drop to arrange in the correct order:</p>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sequence} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sequence.map((id, i) => (
              <SortableItem key={id} id={id}>
                <div className={`flex items-center gap-3 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-300 transition ${
                  isRTL ? 'flex-row-reverse font-noto-nastaliq' : ''
                }`}>
                  <span className="w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-700 rounded-full font-bold">
                    {i + 1}
                  </span>
                  <span className="flex-1">{getItemText(id)}</span>
                  <i className="ri-draggable text-gray-400"></i>
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function ColumnSortingQuestion({ data, index, answers, onAnswer, isRTL }: any) {
  const columns = data.columns || {};
  const [sorted, setSorted] = useState<{ [key: string]: string[] }>({});
  const [unsortedItems, setUnsortedItems] = useState<string[]>([]);

  useEffect(() => {
    if (answers[index]) {
      setSorted(answers[index]);
      const allSorted = Object.values(answers[index]).flat();
      const remaining = (data.items || []).filter((i: any) => !allSorted.includes(i.id || i.text));
      setUnsortedItems(remaining.map((i: any) => i.id || i.text));
    } else {
      const allItems = (data.items || []).map((i: any) => i.id || i.text);
      setUnsortedItems(allItems.sort(() => Math.random() - 0.5));
      const initialSorted: { [key: string]: string[] } = {};
      Object.keys(columns).forEach((col) => {
        initialSorted[col] = [];
      });
      setSorted(initialSorted);
    }
  }, [data.items, data.columns, answers, index]);

  const handleDrop = (columnId: string, itemId: string) => {
    const newUnsorted = unsortedItems.filter((id) => id !== itemId);
    const newSorted = { ...sorted };
    Object.keys(newSorted).forEach((col) => {
      newSorted[col] = newSorted[col].filter((id) => id !== itemId);
    });
    newSorted[columnId] = [...(newSorted[columnId] || []), itemId];

    setUnsortedItems(newUnsorted);
    setSorted(newSorted);
    onAnswer(index, newSorted);
  };

  const getItemText = (id: string) => {
    const item = (data.items || []).find((i: any) => (i.id || i.text) === id);
    return item?.text || id;
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-xl min-h-[60px]">
        <p className="text-sm text-gray-600 mb-2">Drag items to columns:</p>
        <div className="flex flex-wrap gap-2">
          {unsortedItems.map((id) => (
            <div
              key={id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', id)}
              className={`px-3 py-2 bg-purple-100 text-purple-700 rounded-lg cursor-grab hover:bg-purple-200 ${
                isRTL ? 'font-noto-nastaliq' : ''
              }`}
            >
              {getItemText(id)}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(columns).map(([colId, colData]: [string, any]) => (
          <div
            key={colId}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const itemId = e.dataTransfer.getData('text/plain');
              handleDrop(colId, itemId);
            }}
            className="p-4 border-2 border-dashed border-gray-300 rounded-xl min-h-[120px] bg-white"
          >
            <p className={`text-sm font-semibold text-gray-700 mb-3 ${isRTL ? 'text-right font-noto-nastaliq' : ''}`}>
              {colData.title || colId}
            </p>
            <div className="space-y-2">
              {(sorted[colId] || []).map((itemId) => (
                <div
                  key={itemId}
                  onClick={() => {
                    const newSorted = { ...sorted };
                    newSorted[colId] = newSorted[colId].filter((id) => id !== itemId);
                    setSorted(newSorted);
                    setUnsortedItems([...unsortedItems, itemId]);
                    onAnswer(index, newSorted);
                  }}
                  className={`px-3 py-2 bg-green-100 text-green-700 rounded-lg cursor-pointer hover:bg-red-100 hover:text-red-700 transition ${
                    isRTL ? 'text-right font-noto-nastaliq' : ''
                  }`}
                >
                  {getItemText(itemId)} ✕
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiagramLabelingQuestion({ data, index, answers, onAnswer, isRTL }: any) {
  const [labels, setLabels] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    if (answers[index]) {
      setLabels(answers[index]);
    }
  }, [answers, index]);

  const handleLabelChange = (labelIndex: number, value: string) => {
    const newLabels = { ...labels, [labelIndex]: value };
    setLabels(newLabels);
    onAnswer(index, newLabels);
  };

  return (
    <div className="space-y-4">
      {data.imageUrl && (
        <div className="relative border rounded-xl overflow-hidden bg-gray-50 p-4">
          <img src={data.imageUrl} alt="Diagram" className="max-w-full mx-auto" />
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-600">Enter labels for each marker:</p>
        {(data.labels || []).map((label: any, i: number) => (
          <div key={i} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="w-8 h-8 flex items-center justify-center bg-purple-600 text-white rounded-full font-bold text-sm">
              {i + 1}
            </span>
            <input
              type="text"
              value={labels[i] || ''}
              onChange={(e) => handleLabelChange(i, e.target.value)}
              placeholder={label.hint || `Label ${i + 1}`}
              className={`flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 ${
                isRTL ? 'text-right font-noto-nastaliq' : ''
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
