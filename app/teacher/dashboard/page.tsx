"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  FiPlus,
  FiEdit,
  FiBookOpen,
  FiFileText,
  FiCheckSquare,
  FiMenu,
  FiChevronDown,
  FiBell,
  FiEye,
  FiCalendar,
} from "react-icons/fi";
import { FaBook, FaPencilAlt, FaClipboardList } from "react-icons/fa";

const StatCard = ({
  title,
  value,
  icon,
  color,
  progress,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  progress?: number;
}) => (
  <div className={`${color} p-3 sm:p-4 rounded-[24px] text-white w-full min-h-[108px] border border-transparent transition-all duration-300 ease-out hover:bg-[#b32031] hover:-translate-y-1 hover:shadow-xl hover:border-white/40`}>
    <p className="text-[36px] font-bold leading-none">{value}</p>
    <div className="mt-2 flex items-end justify-between gap-3">
      <h3 className="text-[18px] font-semibold" style={{ letterSpacing: "1.2px" }}>{title}</h3>
      {progress ? (
        <div className="relative hidden sm:block">
          <svg className="w-[89px] h-[89px]">
            <circle
              className="text-[#69000C]"
              stroke="currentColor"
              strokeWidth="7.5"
              fill="transparent"
              r="35"
              cx="44"
              cy="44"
            />
            <circle
              className="text-[#FFF200]"
              stroke="currentColor"
              strokeWidth="7.5"
              fill="transparent"
              r="35"
              cx="44"
              cy="44"
              strokeDasharray={2 * Math.PI * 35}
              strokeDashoffset={2 * Math.PI * 35 * (1 - progress / 100)}
              strokeLinecap="round"
              transform="rotate(-90 44 44)"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm sm:text-[20px] font-bold">
            {progress}%
          </span>
        </div>
      ) : (
        <div className="text-2xl sm:text-[34px]">{icon}</div>
      )}
    </div>
    {progress && (
      <div className="sm:hidden mt-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/20 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-bold">{progress}%</span>
        </div>
      </div>
    )}
  </div>
);

const AssignedBookItem = ({
  title,
  subject,
  chapters,
  questions,
  status,
}: {
  title: string;
  subject: string;
  chapters: number;
  questions: number;
  status: string;
}) => (
  <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-gray-800 truncate">{title}</h4>
        <p className="text-sm text-gray-500">{subject}</p>
        <div className="flex items-center flex-wrap gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600">
          <span className="flex items-center">
            <FaBook className="mr-1 sm:mr-2 flex-shrink-0" />
            {chapters} Chapters
          </span>
          <span className="flex items-center">
            <FaPencilAlt className="mr-1 sm:mr-2 flex-shrink-0" />
            {questions} Questions
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
        <button
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${status === "Active" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"}`}
        >
          {status}
        </button>
        <button className="text-gray-400 hover:text-gray-600 p-2 touch-manipulation">
          <FiEdit size={18} />
        </button>
      </div>
    </div>
  </div>
);

const BookGroupSection = ({
  groupTitle,
  bookCount,
  books,
  isExpanded,
  onToggle,
  questionCounts,
  chapterQuestionCounts,
}: {
  groupTitle: string;
  bookCount: number;
  books: { id: string; title: string; subject: string; grade: string; chapters: number }[];
  isExpanded: boolean;
  onToggle: () => void;
  questionCounts: { [bookId: string]: { total: number; oup: number; school: number } };
  chapterQuestionCounts: { [bookId: string]: { [chapter: string]: number } };
}) => {
  const [expandedBooks, setExpandedBooks] = useState<{ [bookId: string]: boolean }>({});

  const toggleBookChapters = (bookId: string) => {
    setExpandedBooks((prev) => ({
      ...prev,
      [bookId]: !prev[bookId],
    }));
  };

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-left">
            <h4 className="text-lg sm:text-xl font-bold text-[#1b45d8]" style={{ letterSpacing: "0.8px" }}>{groupTitle}</h4>
            <p className="text-xs text-gray-500">{bookCount} book{bookCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          <FiChevronDown size={20} className="text-[#1b45d8]" />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50">
          {books.map((book) => {
            const counts = questionCounts[book.id] || { total: 0, oup: 0, school: 0 };
            const chapterCounts = chapterQuestionCounts[book.id] || {};
            const chapterEntries = Object.entries(chapterCounts).sort((a, b) => a[0].localeCompare(b[0]));
            const hasChapterCounts = chapterEntries.length > 0;
            const isBookExpanded = !!expandedBooks[book.id];
            return (
              <div key={book.id} className="bg-[#fdfdfd] px-4 sm:px-5 py-4 rounded-[24px] border border-gray-200 w-full max-w-[698px] min-h-[127px]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-[#9b1827] text-base sm:text-lg">{book.title}</h5>
                    <p className="text-sm text-[#757575] mt-0.5">{String(book.grade || "").replace(/^Grade\s+/i, "Grade ")}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-[#757575]">
                      <span className="flex items-center">
                        <FaBook className="mr-2 flex-shrink-0 text-[#9b1827]" />
                        {book.chapters} Chapters
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => toggleBookChapters(book.id)}
                      className="text-[#0F172A] p-1 transition-colors"
                      aria-label="Show chapter-wise question count"
                    >
                      <FiEye size={16} />
                    </button>
                  </div>
                </div>
                {isBookExpanded && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    {hasChapterCounts ? (
                      <div className="space-y-2">
                        {chapterEntries.map(([chapter, count]) => (
                          <div
                            key={`${book.id}-${chapter}`}
                            className="group flex items-center justify-between text-xs sm:text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 transition-colors hover:bg-[#ffe6e8]"
                          >
                            <span className="truncate pr-2 text-black font-open-sans font-bold transition-colors group-hover:text-[#9b1827]">{chapter || "Untitled Chapter"}</span>
                            <span className="font-open-sans font-bold text-black transition-colors group-hover:text-[#9b1827]">{count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-gray-500">No teacher-created questions by chapter yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const TodoItem = ({
  id,
  task,
  date,
  color,
  completed,
  onToggle,
  onDelete,
}: {
  id: string;
  task: string;
  date: string;
  color: string;
  completed: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) => (
  <div
    className="bg-white p-3 sm:p-4 rounded-[18px] border-l-4"
    style={{ borderColor: color }}
  >
    <div className="flex items-start sm:items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p
          className={`font-semibold text-sm sm:text-base ${completed ? "text-gray-400 line-through" : "text-[#0F172A]"}`}
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {task}
        </p>
        <p className="text-xs sm:text-sm text-[#888888] mt-1 flex items-center gap-1.5">
          <FiCalendar size={14} />
          <span>{date}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onDelete(id)}
          className="text-red-600 bg-red-100 rounded-full px-2.5 py-1.5 text-xs font-semibold flex-shrink-0 touch-manipulation"
          aria-label="Delete task"
        >
          Delete
        </button>
        <button
          onClick={() => onToggle(id)}
          className={`rounded-full p-2 flex-shrink-0 touch-manipulation ${completed ? "text-green-600 bg-green-100" : "text-blue-600 bg-blue-100"}`}
          aria-label={completed ? "Mark as pending" : "Mark as completed"}
        >
          <FiCheckSquare size={18} />
        </button>
      </div>
    </div>
  </div>
);

type TodoTask = {
  id: string;
  task: string;
  date: string;
  color: string;
  completed: boolean;
};

const TODO_COLORS = ["#FF7A50", "#FFC107", "#4CAF50", "#2196F3"];

const buildDefaultTodos = (assignedBooks: any[] = []): TodoTask[] => {
  const createdDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return assignedBooks.slice(0, 4).map((book, index) => ({
    id: `todo-default-${index + 1}`,
    task: `Add questions for ${book.title}`,
    date: createdDate,
    color: TODO_COLORS[index % TODO_COLORS.length],
    completed: false,
  }));
};

export default function TeacherDashboard() {
  const { user } = useUserProfile();
  const { isAuthenticated, isLoading } = useAuthGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
  const [questionCounts, setQuestionCounts] = useState<{ [bookId: string]: { total: number; oup: number; school: number } }>({});
  const [chapterQuestionCounts, setChapterQuestionCounts] = useState<{ [bookId: string]: { [chapter: string]: number } }>({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [quizzesCreated, setQuizzesCreated] = useState(0);
  const [assignedQuizzes, setAssignedQuizzes] = useState(0);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [teacherCreatedQuestions, setTeacherCreatedQuestions] = useState(0);
  const [loadingTeacherCreatedQuestions, setLoadingTeacherCreatedQuestions] = useState(false);
  const [todos, setTodos] = useState<TodoTask[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [showTodoInput, setShowTodoInput] = useState(false);
  const assignedQuizzesProgress = quizzesCreated > 0
    ? Math.min(100, Math.max(0, Math.round((assignedQuizzes / quizzesCreated) * 100)))
    : 0;
  const profileRoleLabel = String(user?.role || "Teacher")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const getTodoStorageKey = () => `teacher-dashboard-todos-${user?.uid || "guest"}`;

  useEffect(() => {
    if (!user?.uid) return;
    try {
      const raw = localStorage.getItem(getTodoStorageKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setTodos(parsed);
          return;
        }
      }
      setTodos(buildDefaultTodos(user?.assignedBooks || []));
    } catch {
      setTodos(buildDefaultTodos(user?.assignedBooks || []));
    }
  }, [user?.uid, user?.assignedBooks]);

  useEffect(() => {
    if (!user?.uid) return;
    localStorage.setItem(getTodoStorageKey(), JSON.stringify(todos));
  }, [todos, user?.uid]);

  // Fetch quiz data (created and assigned)
  useEffect(() => {
    if (!user?.uid) return;

    const fetchQuizData = async () => {
      setLoadingQuizzes(true);
      try {
        const response = await fetch(`/api/teacher/quizzes`);
        if (response.ok) {
          const data = await response.json();
          const quizzes = data.quizzes || [];
          
          // Count total quizzes created by this teacher
          setQuizzesCreated(quizzes.length);
          
          // Count online quizzes that have been assigned (have assignments)
          const onlineWithAssignments = quizzes.filter((q: any) => 
            q.quizFormat === 'Online' && q.totalAssignments > 0
          ).length;
          setAssignedQuizzes(onlineWithAssignments);
        }
      } catch (error) {
      } finally {
        setLoadingQuizzes(false);
      }
    };

    fetchQuizData();
  }, [user?.uid]);

  // Fetch only teacher-created questions for the stat card
  useEffect(() => {
    if (!user?.uid || !user?.schoolId) {
      setTeacherCreatedQuestions(0);
      return;
    }

    const fetchTeacherCreatedQuestions = async () => {
      setLoadingTeacherCreatedQuestions(true);
      try {
        const params = new URLSearchParams({
          qb: "school",
          mine: "true",
          schoolId: String(user.schoolId),
          userId: String(user.uid),
          userRole: String(user.role || "teacher"),
          userEmail: String(user.email || ""),
        });
        const response = await fetch(`/api/teacher/questions?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) {
          setTeacherCreatedQuestions(0);
          return;
        }
        const data = await response.json();
        const questions = Array.isArray(data?.questions) ? data.questions : [];
        setTeacherCreatedQuestions(questions.length);
      } catch {
        setTeacherCreatedQuestions(0);
      } finally {
        setLoadingTeacherCreatedQuestions(false);
      }
    };

    fetchTeacherCreatedQuestions();
  }, [user?.uid, user?.schoolId]);

  // Fetch question counts for all assigned books from API
  useEffect(() => {
    const assignedBooks = user?.assignedBooks || [];
    if (assignedBooks.length === 0 || !user?.schoolId) {
      setQuestionCounts({});
      return;
    }

    setLoadingQuestions(true);

    const fetchQuestionCounts = async () => {
      try {
        const params = new URLSearchParams({
          qb: "school",
          mine: "true",
          schoolId: String(user.schoolId),
          userId: String(user.uid),
          userRole: String(user.role || "teacher"),
          userEmail: String(user.email || ""),
        });
        const response = await fetch(`/api/teacher/questions?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) {
          setQuestionCounts({});
          return;
        }

        const data = await response.json();
        const questions = Array.isArray(data?.questions) ? data.questions : [];

        const counts: { [bookId: string]: { total: number; oup: number; school: number } } = {};
        const chapterCountsByBook: { [bookId: string]: { [chapter: string]: number } } = {};
        const lookup: Record<string, string[]> = {};

        assignedBooks.forEach((book: any) => {
          counts[book.id] = { total: 0, oup: 0, school: 0 };
          chapterCountsByBook[book.id] = {};
          const gradeKey = String(book.grade || "").replace(/^Grade\s+/i, "").trim().toLowerCase();
          const key = `${String(book.title || "").trim().toLowerCase()}|${String(book.subject || "").trim().toLowerCase()}|${gradeKey}`;
          if (!lookup[key]) lookup[key] = [];
          lookup[key].push(book.id);
        });

        questions.forEach((question: any) => {
          const gradeKey = String(question.grade || "").replace(/^Grade\s+/i, "").trim().toLowerCase();
          const key = `${String(question.book || "").trim().toLowerCase()}|${String(question.subject || "").trim().toLowerCase()}|${gradeKey}`;
          const matchedBookIds = lookup[key] || [];
          const source = String(question.source || "").toLowerCase();
          const chapterName = String(question.chapter || "").trim() || "Untitled Chapter";

          matchedBookIds.forEach((bookId) => {
            if (!counts[bookId]) {
              counts[bookId] = { total: 0, oup: 0, school: 0 };
            }
            counts[bookId].total += 1;
            if (source === "oup") {
              counts[bookId].oup += 1;
            } else {
              counts[bookId].school += 1;
            }

            if (!chapterCountsByBook[bookId]) {
              chapterCountsByBook[bookId] = {};
            }
            chapterCountsByBook[bookId][chapterName] = (chapterCountsByBook[bookId][chapterName] || 0) + 1;
          });
        });

        setQuestionCounts(counts);
        setChapterQuestionCounts(chapterCountsByBook);
      } catch {
        setQuestionCounts({});
        setChapterQuestionCounts({});
      } finally {
        setLoadingQuestions(false);
      }
    };
    
    fetchQuestionCounts();
  }, [user?.assignedBooks, user?.schoolId]);

  // Toggle group expansion
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const addTodo = () => {
    const trimmed = newTodo.trim();
    if (!trimmed) return;
    const createdDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const task: TodoTask = {
      id: `${Date.now()}`,
      task: trimmed,
      date: createdDate,
      color: TODO_COLORS[todos.length % TODO_COLORS.length],
      completed: false,
    };
    setTodos((prev) => [task, ...prev]);
    setNewTodo("");
    setShowTodoInput(false);
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, return null (will be redirected by useAuthGuard)
  if (!isAuthenticated) {
    return null;
  }

  // Debug logging

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar userRole="Teacher" currentPage="dashboard" />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3 lg:pt-4 pb-4 sm:pb-6 lg:pb-8 w-full lg:ml-[256px]">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2 sm:mb-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 touch-manipulation"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FiMenu size={24} />
            </button>
            <h1 className="text-[36px] font-medium tracking-[-1.08px] text-[#1b45d8] font-gibson">
              Teacher Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto mr-1 sm:mr-2 lg:mr-5">
            {/*
            <div className="w-[49px] h-[49px] rounded-[14px] bg-[#ffe6e8] flex items-center justify-center text-[#0F172A] font-semibold">
              {(user?.name || "T")
                .split(" ")
                .map((part: string) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            */}
            {/*
            <div className="text-right sm:text-left leading-tight">
              <p className="text-sm sm:text-base font-semibold text-[#0F172A]">{user?.name || "Teacher"}</p>
              <p className="text-xs sm:text-sm text-[#8f8f8f]">{profileRoleLabel}</p>
            </div>
            */}
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-5">
          <div className="bg-[#ffe6e9] p-3 sm:p-4 rounded-[24px] md:col-span-1 xl:col-span-2 border border-transparent transition-all duration-300 ease-out hover:bg-[#ffd9df] hover:-translate-y-0.5 hover:shadow-lg hover:border-[#f7bcc5]">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#9b1827]">
              Welcome back, {user?.name || 'Teacher'}!
            </h2>
            <p className="text-sm sm:text-base text-[#0F172A] font-semibold mt-0.5">
              Here is an overview of your quiz activities.
            </p>
          </div>

          <div className="bg-[#9b1827] rounded-[24px] p-3 sm:p-4 w-full min-h-[108px] text-white flex justify-between items-start border border-transparent transition-all duration-300 ease-out hover:bg-[#b32031] hover:-translate-y-1 hover:shadow-xl hover:border-white/40">
            <div>
              <p className="text-[36px] font-bold leading-none">{loadingQuizzes ? "..." : assignedQuizzes.toString()}</p>
              <h4 className="text-lg sm:text-xl font-bold leading-normal text-white mt-3" style={{ letterSpacing: "0.8px" }}>Assigned Quizzes</h4>
            </div>
            <div className="relative">
              <svg className="w-[89px] h-[89px]">
                <circle
                  className="text-[#69000C]"
                  stroke="currentColor"
                  strokeWidth="7.5"
                  fill="transparent"
                  r="35"
                  cx="44"
                  cy="44"
                />
                <circle
                  className="text-[#FFF200]"
                  stroke="currentColor"
                  strokeWidth="7.5"
                  fill="transparent"
                  r="35"
                  cx="44"
                  cy="44"
                  strokeDasharray={2 * Math.PI * 35}
                  strokeDashoffset={2 * Math.PI * 35 * (1 - assignedQuizzesProgress / 100)}
                  strokeLinecap="round"
                  transform="rotate(-90 44 44)"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[20px] font-bold text-white">
                {loadingQuizzes ? "..." : `${assignedQuizzesProgress}%`}
              </span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <StatCard
            title="Assigned Books"
            value={user?.assignedBooks ? user.assignedBooks.length.toString() : "0"}
            icon={<FiBookOpen />}
            color="bg-[#9b1827]"
          />
          <StatCard
            title="Total Questions"
            value={loadingTeacherCreatedQuestions ? "..." : teacherCreatedQuestions.toString()}
            icon={<FaPencilAlt />}
            color="bg-[#9b1827]"
          />
          <StatCard
            title="Quizzes Created"
            value={loadingQuizzes ? "..." : quizzesCreated.toString()}
            icon={<FiFileText />}
            color="bg-[#9b1827]"
          />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          <div className="xl:col-span-2">
            <div className="space-y-3">
              {user?.assignedBooks && user.assignedBooks.length > 0 ? (
                <BookGroupSection
                  key="assigned-books"
                  groupTitle="Assigned Books"
                  bookCount={user.assignedBooks.length}
                  books={user.assignedBooks}
                  isExpanded={expandedGroups["assigned-books"] ?? true}
                  onToggle={() => toggleGroup("assigned-books")}
                  questionCounts={questionCounts}
                  chapterQuestionCounts={chapterQuestionCounts}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FaBook className="mx-auto mb-3 text-4xl text-gray-300" />
                  <p className="text-lg font-medium">No books assigned yet</p>
                  <p className="text-sm">Contact your admin to get books assigned to you</p>
                  {/* Debug info */}
                  <div className="mt-4 text-xs text-gray-400 bg-gray-100 p-3 rounded">
                    <p><strong>Debug Information:</strong></p>
                    <p>• User exists: {user ? 'Yes' : 'No'}</p>
                    <p>• User role: {user?.role}</p>
                    <p>• Subjects: {user?.subjects ? user.subjects.join(', ') : 'None'}</p>
                    <p>• Assigned Grades: {user?.assignedGrades ? user.assignedGrades.join(', ') : 'None'}</p>
                    <p>• AssignedBooks field: {user?.assignedBooks ? 'Exists' : 'Missing'}</p>
                    <p>• AssignedBooks count: {user?.assignedBooks?.length || 0}</p>
                    {user?.assignedBooks && user.assignedBooks.length > 0 && (
                      <div className="mt-2">
                        <p><strong>Books:</strong></p>
                        {user.assignedBooks.map((book, idx) => (
                          <p key={idx} className="ml-2">- {book.title} ({book.subject}, {book.grade})</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#ffe6e8] border-2 border-[#9b1827] rounded-[25px] pt-4 px-4 pb-3 sm:pt-5 sm:px-5 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-[#9b1827]">To-Do List</h3>
              <button
                onClick={() => setShowTodoInput((prev) => !prev)}
                className="text-[#9b1827] bg-[#ffd7dc] rounded-full p-2 touch-manipulation hover:bg-[#ffc7cf] transition-colors"
                aria-label="Add todo"
              >
                <FiPlus size={18} />
              </button>
            </div>
            {showTodoInput && (
              <div className="mb-3 flex items-center gap-2">
                <input
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addTodo();
                  }}
                  placeholder="Add a new task"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
                <button
                  onClick={addTodo}
                  className="bg-orange-600 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-orange-700"
                >
                  Add
                </button>
              </div>
            )}
            <div className="todo-scrollbar space-y-3 sm:space-y-4 max-h-[430px] overflow-y-auto pr-1">
              {todos.length > 0 ? (
                todos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    id={todo.id}
                    task={todo.task}
                    date={todo.date}
                    color={todo.color}
                    completed={todo.completed}
                    onToggle={toggleTodo}
                    onDelete={deleteTodo}
                  />
                ))
              ) : (
                <div className="bg-white p-4 rounded-2xl border border-gray-200 text-sm text-gray-500">
                  No tasks yet. Add one using the + button.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
