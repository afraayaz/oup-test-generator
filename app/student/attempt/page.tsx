'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface QuizItem {
  questionId: string;
  questionType: string;
  subject: string;
  difficulty: string;
  slo: string;
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

export default function QuizAttemptPage() {
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
        if (Array.isArray(answer.value)) {
          return answer.value.every((ans: string, i: number) =>
            ans.toLowerCase().trim() === (userAnswer[i] || '').toLowerCase().trim()
          );
        }
        return answer.value?.toLowerCase().trim() === userAnswer?.toLowerCase().trim();
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

  const handleSubmitQuiz = async () => {
    if (!quiz || quizSubmitted) return;

    const finalScore = calculateScore();
    setScore(finalScore);
    setQuizSubmitted(true);
    setShowResults(true);

    try {
      await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quiz.id,
          quizTitle: quiz.title,
          studentId: 'current_student',
          answers,
          score: finalScore,
          totalMarks: quiz.totalMarks || quiz.items.length,
          percentage: Math.round((finalScore / (quiz.totalMarks || quiz.items.length)) * 100),
          timeSpent: (quiz.timeLimitMinutes || 30) * 60 - timeRemaining,
          submittedAt: new Date().toISOString(),
        })
      });
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
        const blanks = question.text.match(/\{blank\d+\}/g) || [];
        return (
          <div className="space-y-4">
            {blanks.map((_, blankIndex) => (
              <div key={blankIndex} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className={`font-medium ${isRTL ? 'font-noto-nastaliq' : ''}`}>
                  {isRTL ? `خالی جگہ ${blankIndex + 1}` : `Blank ${blankIndex + 1}`}:
                </span>
                <input
                  type="text"
                  value={answers[index]?.[blankIndex] || ''}
                  onChange={(e) => {
                    const newBlanks = { ...(answers[index] || {}) };
                    newBlanks[blankIndex] = e.target.value;
                    handleAnswerChange(index, newBlanks);
                  }}
                  className={`flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 ${
                    isRTL ? 'text-right font-noto-nastaliq' : ''
                  }`}
                  placeholder={isRTL ? 'اپنا جواب لکھیں' : 'Enter your answer'}
                />
              </div>
            ))}
          </div>
        );

      case 'short':
      case 'shortanswer':
        return (
          <textarea
            value={answers[index] || ''}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
            className={`w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none ${
              isRTL ? 'text-right font-noto-nastaliq' : ''
            }`}
            rows={3}
            placeholder={isRTL ? 'مختصر جواب لکھیں' : 'Write a short answer...'}
          />
        );

      case 'long':
      case 'longanswer':
        return (
          <textarea
            value={answers[index] || ''}
            onChange={(e) => handleAnswerChange(index, e.target.value)}
            className={`w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none ${
              isRTL ? 'text-right font-noto-nastaliq' : ''
            }`}
            rows={8}
            placeholder={isRTL ? 'تفصیلی جواب لکھیں' : 'Write a detailed answer...'}
          />
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
    const percentage = Math.round((score / (quiz.totalMarks || quiz.items.length)) * 100);
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole="Student" currentPage="attempt" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 lg:ml-64 p-4 lg:p-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
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

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-sm text-purple-600 font-medium">Score</p>
                  <p className="text-2xl font-bold text-purple-700">{score} / {quiz.totalMarks || quiz.items.length}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-blue-600 font-medium">Questions</p>
                  <p className="text-2xl font-bold text-blue-700">{quiz.items.length}</p>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => router.push('/student/dashboard')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={() => router.push('/student/history')}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                >
                  View History
                </button>
              </div>
            </div>
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

          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                  <i className="ri-file-list-3-line text-3xl text-purple-600"></i>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">{quiz.title}</h1>
                <p className="text-gray-600">{quiz.subject} - Grade {quiz.class}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <i className="ri-question-line text-2xl text-purple-600 mb-2"></i>
                  <p className="text-sm text-gray-600">Questions</p>
                  <p className="text-xl font-bold text-gray-800">{quiz.items.length}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <i className="ri-time-line text-2xl text-purple-600 mb-2"></i>
                  <p className="text-sm text-gray-600">Time Limit</p>
                  <p className="text-xl font-bold text-gray-800">{quiz.timeLimitMinutes || 30} mins</p>
                </div>
                {quiz.isMarked && (
                  <>
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <i className="ri-medal-line text-2xl text-purple-600 mb-2"></i>
                      <p className="text-sm text-gray-600">Total Marks</p>
                      <p className="text-xl font-bold text-gray-800">{quiz.totalMarks}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <i className="ri-bar-chart-line text-2xl text-purple-600 mb-2"></i>
                      <p className="text-sm text-gray-600">Quiz Type</p>
                      <p className="text-xl font-bold text-gray-800">{quiz.quizType}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
                <div className="flex items-start gap-3">
                  <i className="ri-information-line text-xl text-yellow-600 mt-0.5"></i>
                  <div>
                    <p className="font-medium text-yellow-800">Instructions</p>
                    <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                      <li>• Answer all questions before submitting</li>
                      <li>• You cannot go back once the quiz is submitted</li>
                      <li>• The quiz will auto-submit when time runs out</li>
                      <li>• Make sure you have a stable internet connection</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setQuizStarted(true)}
                className="w-full py-4 bg-purple-600 text-white text-lg font-semibold rounded-xl hover:bg-purple-700 transition shadow-lg"
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
            {currentItem.question.text.replace(/\{blank\d+\}/g, '_____')}
          </h2>

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
