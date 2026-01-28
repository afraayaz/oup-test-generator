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
          const quizData = result.quiz as Quiz;
          // Allow quizzes without quizFormat (legacy) or with quizFormat === 'Online'
          // Only reject if explicitly set to 'Offline'
          if (quizData && quizData.quizFormat !== 'Offline') {
            console.log('📋 Quiz loaded:', {
              title: quizData.title,
              totalItems: quizData.items?.length,
              firstItemCognitiveLevel: quizData.items?.[0]?.cognitiveLevel,
              firstItemFields: Object.keys(quizData.items?.[0] || {}),
            });
            setQuiz(quizData);
            setTimeRemaining((quizData.timeLimitMinutes || 30) * 60);
          }
        }
      } catch (error) {
        console.error('Error fetching quiz:', error);
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
        return answer.value === userAnswer;
      case 'truefalse':
        return answer.value === userAnswer;
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
        console.log('✅ Quiz submission response:', data);
        console.log('📊 Question Results:', data.questionResults);
        console.log('📈 Cognitive Breakdown:', data.cognitiveBreakdown);
        setResultsData(data);
      } else {
        const errorData = await response.json();
        console.error('❌ Quiz submission error:', errorData);
      }
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
    }
  };

  const renderBasicQuestion = (item: QuizItem, index: number) => {
    const { questionType, question, options } = item;
    const isRTL = question.isRTL;

    switch (questionType) {
      case 'multiple':
      case 'mcqs':
        return (
          <div className="space-y-3">
            {options.map((option, optIndex) => (
              <label
                key={optIndex}
                className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  answers[index] === optIndex
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                } ${isRTL ? 'flex-row-reverse text-right font-noto-nastaliq' : ''}`}
              >
                <input
                  type="radio"
                  name={`question-${index}`}
                  checked={answers[index] === optIndex}
                  onChange={() => handleAnswerChange(index, optIndex)}
                  className="w-5 h-5 text-purple-600"
                />
                <span className={`${isRTL ? 'mr-3' : 'ml-3'} flex-1`}>
                  {isRTL ? ['ا', 'ب', 'ج', 'د'][optIndex] : String.fromCharCode(65 + optIndex)}. {option.text}
                </span>
              </label>
            ))}
          </div>
        );

      case 'truefalse':
        return (
          <div className="flex gap-4">
            {[true, false].map((val) => (
              <label
                key={val.toString()}
                className={`flex-1 flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  answers[index] === val
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                } ${isRTL ? 'font-noto-nastaliq' : ''}`}
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
                  className={`w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none ${
                    isRTL ? 'text-right font-noto-nastaliq' : ''
                  }`}
                  rows={3}
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
            <div className={`p-4 bg-white border-2 border-gray-200 rounded-lg leading-relaxed ${isRTL ? 'text-right font-noto-nastaliq' : ''}`}>
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
                        className={`px-2 py-1 border-b-2 border-purple-500 bg-purple-50 focus:bg-purple-100 focus:outline-none min-w-[80px] text-center font-medium text-sm focus:border-purple-700 transition-colors ${
                          isRTL ? 'font-noto-nastaliq' : ''
                        }`}
                        placeholder="_"
                        style={{ width: Math.max(80, (answers[index]?.[currentBlankIndex] || '').length * 8 + 30) + 'px' }}
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
              className={`w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none ${
                isRTL ? 'text-right font-noto-nastaliq' : ''
              }`}
              rows={3}
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
              className={`w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none ${
                isRTL ? 'text-right font-noto-nastaliq' : ''
              }`}
              rows={8}
              placeholder={isRTL ? 'تفصیلی جواب لکھیں' : 'Write a detailed answer...'}
            />
          </div>
        );

      default:
        return <p className="text-gray-500">Unsupported question type: {questionType}</p>;
    }
  };

  const renderInteractiveQuestion = (item: QuizItem, index: number) => {
    const { interactiveData, question } = item;
    if (!interactiveData) return null;

    const isRTL = question.isRTL;
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

  if (showResults) {
    // Calculate total marks including ALL questions (auto-graded + manual-graded)
    const totalMarksForResult = quiz.items.reduce((sum: number, item: any) => sum + (item.marks || 1), 0) || quiz.items.length;
    const percentage = Math.round((score / totalMarksForResult) * 100);
    const questionResults = resultsData?.questionResults || [];
    const correctCount = questionResults.filter((q: any) => q.isCorrect).length;

    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole="Student" currentPage="attempt" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 lg:ml-64 p-4 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Summary Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 relative">
              {/* Top Action Buttons */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <button
                  onClick={() => {
                    console.log('📂 Opening breakdown modal, questionResults:', questionResults);
                    setShowBreakdownModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
                >
                  <i className="ri-eye-line"></i>
                  View Breakdown
                </button>
                <button
                  onClick={() => router.push('/student/dashboard')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium flex items-center gap-2"
                >
                  <i className="ri-home-line"></i>
                  Back to Dashboard
                </button>
              </div>

              <div className="text-center mb-8 pt-12">
                <div className={`w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center ${
                  percentage >= 80 ? 'bg-green-100' : percentage >= 50 ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  <span className={`text-4xl font-bold ${
                    percentage >= 80 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {percentage}%
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-gray-800 mb-2">Quiz Completed!</h2>
                <p className="text-gray-600 mb-6">{quiz.title}</p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-purple-600 font-medium">Score</p>
                    <p className="text-2xl font-bold text-purple-700">{score}/{totalMarksForResult}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4">
                    <p className="text-sm text-green-600 font-medium">Correct (Auto-graded)</p>
                    <p className="text-2xl font-bold text-green-700">{correctCount}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-blue-600 font-medium">Total Questions</p>
                    <p className="text-2xl font-bold text-blue-700">{quiz.items.length}</p>
                  </div>
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
                {console.log('🎬 Modal is rendering, showBreakdownModal:', showBreakdownModal, 'questionResults:', questionResults)}
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 lg:ml-64">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h2 className="text-lg sm:text-xl font-bold">Question Breakdown</h2>
                        <p className="text-purple-100 mt-0.5 text-xs sm:text-sm">{questionResults.length} questions</p>
                      </div>
                      <button
                        onClick={() => setShowBreakdownModal(false)}
                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition flex-shrink-0 ml-2"
                      >
                        <i className="ri-close-line text-xl"></i>
                      </button>
                    </div>
                    
                    {/* Cognitive Level Performance in Modal */}
                    {resultsData?.cognitiveBreakdown && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 mt-2 pt-2.5 border-t border-purple-400">
                        {Object.entries(resultsData.cognitiveBreakdown).map(([level, data]: [string, any]) => {
                          const percentage = data.percentage;
                          const performanceColor = percentage >= 80 ? 'text-green-300' : percentage >= 60 ? 'text-yellow-300' : 'text-red-300';
                          return (
                            <div key={level} className="text-xs">
                              <p className="font-semibold text-purple-100 truncate">{level}</p>
                              <p className={`text-base font-bold ${performanceColor}`}>{percentage}%</p>
                              <p className="text-purple-100 text-2xs">{data.correct}/{data.total}</p>
                              {data.questionIndices && data.questionIndices.length > 0 && (
                                <p className="text-purple-100 text-2xs mt-0.5 truncate">Q: {data.questionIndices.map((idx: number) => idx + 1).join(',')}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Modal Body - Scrollable */}
                  <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-3 sm:space-y-4">
                    {questionResults.map((result: any, index: number) => (
                      <div key={index} className={`rounded-xl p-3 sm:p-5 border-2 ${
                        result.status === 'Not Attempted' ? 'border-gray-300 bg-gray-50' : 
                        result.status === 'Attempted' ? 'border-yellow-300 bg-yellow-50' :
                        result.isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                      }`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-3">
                          <div className="flex items-center gap-2 sm:gap-3 flex-1">
                            <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white text-sm sm:text-base ${
                              result.status === 'Not Attempted' ? 'bg-gray-400' :
                              result.status === 'Attempted' ? 'bg-yellow-500' :
                              result.isCorrect ? 'bg-green-500' : 'bg-red-500'
                            }`}>
                              {result.status === 'Not Attempted' ? '−' :
                               result.status === 'Attempted' ? '✓' :
                               result.isCorrect ? '✓' : '✗'}
                            </div>
                            <div className="flex-1">
                              <span className="font-medium text-gray-700 text-sm sm:text-base">Question {index + 1}</span>
                              <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                                {result.cognitiveLevel && result.cognitiveLevel !== 'Unknown' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                                    {result.cognitiveLevel}
                                  </span>
                                )}
                                {result.difficulty && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-200 text-gray-700 capitalize">
                                    {result.difficulty}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className={`text-xs sm:text-sm font-semibold whitespace-nowrap flex-shrink-0 ${
                            result.status === 'Not Attempted' ? 'text-gray-700' :
                            result.status === 'Attempted' ? 'text-yellow-700' :
                            result.isCorrect ? 'text-green-700' : 'text-red-700'
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
                                {result.userAnswerText 
                                  ? result.userAnswerText 
                                  : typeof result.userAnswer === 'string' 
                                  ? result.userAnswer 
                                  : JSON.stringify(result.userAnswer)}
                              </p>
                            </div>
                          )}

                          {result.status === 'Correct' && (
                            <>
                              <div>
                                <p className="font-medium text-green-700">Correct Answer:</p>
                                <p className="text-green-800 mt-0.5 p-1.5 sm:p-2 bg-green-100 rounded border border-green-300 break-words">
                                  {result.correctAnswerText
                                    ? result.correctAnswerText
                                    : typeof result.correctAnswer === 'string'
                                    ? result.correctAnswer 
                                    : JSON.stringify(result.correctAnswer)}
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
                                  {result.correctAnswerText
                                    ? result.correctAnswerText
                                    : typeof result.correctAnswer === 'string'
                                    ? result.correctAnswer 
                                    : JSON.stringify(result.correctAnswer)}
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
        <main className="flex-1 lg:ml-64 p-4 lg:p-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mb-4 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>

          <div className="max-w-2xl mx-auto h-auto">
            <div className="bg-white rounded-2xl shadow-xl p-2 sm:p-3 lg:p-6">
              <div className="text-center mb-1 sm:mb-2 lg:mb-4">
                <div className="w-12 sm:w-14 lg:w-20 h-12 sm:h-14 lg:h-20 mx-auto mb-1 sm:mb-1.5 lg:mb-3 bg-purple-100 rounded-full flex items-center justify-center">
                  <i className="ri-file-list-3-line text-sm sm:text-base lg:text-3xl text-purple-600"></i>
                </div>
                <h1 className="text-base sm:text-lg lg:text-2xl font-bold text-gray-800 mb-0 lg:mb-1">{quiz.title}</h1>
                <p className="text-2xs sm:text-xs lg:text-sm text-gray-600">{quiz.subject} - Grade {quiz.class}</p>
              </div>

              <div className="grid grid-cols-2 gap-1 sm:gap-1.5 lg:gap-4 mb-1.5 sm:mb-2.5 lg:mb-4">
                <div className="bg-gray-50 rounded-md sm:rounded-lg lg:rounded-xl p-1.5 sm:p-2 lg:p-3 text-center">
                  <i className="ri-question-line text-xs sm:text-sm lg:text-2xl text-purple-600 mb-0 sm:mb-0.5 lg:mb-1"></i>
                  <p className="text-2xs text-gray-600 lg:text-sm">Questions</p>
                  <p className="text-xs sm:text-sm lg:text-xl font-bold text-gray-800">{quiz.items.length}</p>
                </div>
                <div className="bg-gray-50 rounded-md sm:rounded-lg lg:rounded-xl p-1.5 sm:p-2 lg:p-3 text-center">
                  <i className="ri-time-line text-xs sm:text-sm lg:text-2xl text-purple-600 mb-0 sm:mb-0.5 lg:mb-1"></i>
                  <p className="text-2xs text-gray-600 lg:text-sm">Time Limit</p>
                  <p className="text-xs sm:text-sm lg:text-xl font-bold text-gray-800">{quiz.timeLimitMinutes || 30} mins</p>
                </div>
                {quiz.isMarked && (
                  <>
                    <div className="bg-gray-50 rounded-md sm:rounded-lg lg:rounded-xl p-1.5 sm:p-2 lg:p-3 text-center">
                      <i className="ri-medal-line text-xs sm:text-sm lg:text-2xl text-purple-600 mb-0 sm:mb-0.5 lg:mb-1"></i>
                      <p className="text-2xs text-gray-600 lg:text-sm">Total Marks</p>
                      <p className="text-xs sm:text-sm lg:text-xl font-bold text-gray-800">{quiz.totalMarks}</p>
                    </div>
                    <div className="bg-gray-50 rounded-md sm:rounded-lg lg:rounded-xl p-1.5 sm:p-2 lg:p-3 text-center">
                      <i className="ri-bar-chart-line text-xs sm:text-sm lg:text-2xl text-purple-600 mb-0 sm:mb-0.5 lg:mb-1"></i>
                      <p className="text-2xs text-gray-600 lg:text-sm">Quiz Type</p>
                      <p className="text-xs sm:text-sm lg:text-xl font-bold text-gray-800">{quiz.quizType}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Instructions - Hidden on small screens, shown on lg and up */}
              <div className="hidden lg:block bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <i className="ri-information-line text-lg text-yellow-600 mt-0.5 flex-shrink-0"></i>
                  <div className="min-w-0">
                    <p className="font-medium text-yellow-800 text-sm">Instructions</p>
                    <ul className="text-xs text-yellow-700 mt-1 space-y-0.5">
                      <li>• Answer all questions before submitting</li>
                      <li>• Cannot go back once submitted</li>
                      <li>• Auto-submit when time runs out</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setQuizStarted(true)}
                className="w-full py-1.5 sm:py-2 lg:py-3 bg-purple-600 text-white text-xs sm:text-sm lg:text-base font-semibold rounded-lg lg:rounded-xl hover:bg-purple-700 transition shadow-lg"
              >
                Start Quiz
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const currentItem = quiz.items[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.items.length) * 100;
  const isUrgent = timeRemaining < 60;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="Student" currentPage="attempt" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden mb-4 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
        >
          <i className="ri-menu-line text-2xl"></i>
        </button>

        <div className="sticky top-0 z-10 bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-800 truncate">{quiz.title}</h1>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${
              isUrgent ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-purple-100 text-purple-600'
            }`}>
              <i className="ri-time-line"></i>
              {formatTime(timeRemaining)}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-600">
              {currentQuestion + 1} / {quiz.items.length}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
              Question {currentQuestion + 1}
            </span>
            {quiz.isMarked && (
              <span className="text-sm text-gray-500">{currentItem.marks} marks</span>
            )}
          </div>

          <h2 className={`text-xl font-medium text-gray-800 mb-6 ${
            currentItem.question.isRTL ? 'text-right font-noto-nastaliq' : ''
          }`}>
            {['fill', 'fillinblank', 'fillblanks'].includes(currentItem.questionType) 
              ? '' 
              : currentItem.question.text.replace(/\{blank\d+\}/g, '_____')
            }
          </h2>

          {/* Display image if available */}
          {(currentItem as any).imageUrl && (
            <div className="mb-6">
              <img 
                src={(currentItem as any).imageUrl} 
                alt="Question illustration" 
                className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm mx-auto"
                style={{ maxHeight: '400px' }}
              />
            </div>
          )}

          {currentItem.isInteractive
            ? renderInteractiveQuestion(currentItem, currentQuestion)
            : renderBasicQuestion(currentItem, currentQuestion)
          }
        </div>

        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="ri-arrow-left-line mr-2"></i>
            Previous
          </button>

          <div className="flex gap-2 overflow-x-auto py-2 px-1">
            {quiz.items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestion(i)}
                className={`w-10 h-10 rounded-lg font-medium transition flex-shrink-0 ${
                  i === currentQuestion
                    ? 'bg-purple-600 text-white'
                    : answers[i] !== undefined
                    ? 'bg-green-100 text-green-700 border-2 border-green-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {currentQuestion === quiz.items.length - 1 ? (
            <button
              onClick={handleSubmitQuiz}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition"
            >
              Submit Quiz
              <i className="ri-check-line ml-2"></i>
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion((prev) => Math.min(quiz.items.length - 1, prev + 1))}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition"
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
