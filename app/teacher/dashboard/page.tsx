"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import {
  FiPlus,
  FiEdit,
  FiCheckSquare,
  FiMenu,
} from "react-icons/fi";
import { FaBook, FaPencilAlt, FaClipboardList, FaTasks } from "react-icons/fa";

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
  <div className={`${color} p-4 sm:p-6 rounded-2xl text-white`}>
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-sm sm:text-lg font-semibold">{title}</h3>
        <p className="text-2xl sm:text-4xl font-bold">{value}</p>
      </div>
      {progress ? (
        <div className="relative hidden sm:block">
          <svg className="w-14 h-14 sm:w-16 sm:h-16">
            <circle
              className="text-white opacity-20"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              r="24"
              cx="28"
              cy="28"
            />
            <circle
              className="text-white"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              r="24"
              cx="28"
              cy="28"
              strokeDasharray={2 * Math.PI * 24}
              strokeDashoffset={2 * Math.PI * 24 * (1 - progress / 100)}
              strokeLinecap="round"
              transform="rotate(-90 28 28)"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs sm:text-sm font-bold">
            {progress}%
          </span>
        </div>
      ) : (
        <div className="text-2xl sm:text-4xl opacity-80">{icon}</div>
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

const TodoItem = ({
  task,
  date,
  color,
}: {
  task: string;
  date: string;
  color: string;
}) => (
  <div
    className="bg-white p-3 sm:p-4 rounded-2xl border-l-4"
    style={{ borderColor: color }}
  >
    <div className="flex items-start sm:items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm sm:text-base">{task}</p>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">{date}</p>
      </div>
      <button className="text-blue-600 bg-blue-100 rounded-full p-2 flex-shrink-0 touch-manipulation">
        <FiCheckSquare size={18} />
      </button>
    </div>
  </div>
);

export default function TeacherDashboard() {
  const { user } = useUserProfile();
  const { isAuthenticated, isLoading } = useAuthGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  console.log('🎯 Teacher Dashboard - User:', user);
  console.log('🎯 Teacher Dashboard - Assigned Books:', user?.assignedBooks);
  console.log('🎯 Teacher Dashboard - Assigned Books Type:', typeof user?.assignedBooks);
  console.log('🎯 Teacher Dashboard - Assigned Books Length:', user?.assignedBooks?.length);

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar userRole="Teacher" currentPage="dashboard" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full lg:ml-[256px]">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 touch-manipulation"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FiMenu size={24} />
            </button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
              Teacher Dashboard
            </h1>
          </div>
        </header>

        <section className="bg-[#FFDBBB] p-4 sm:p-6 rounded-2xl mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-900">
            Welcome back, {user?.name || 'Teacher'}!
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Here is an overview of your quiz activities.
          </p>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <StatCard
            title="Assigned Books"
            value={user?.assignedBooks ? user.assignedBooks.length.toString() : "0"}
            icon={<FaBook />}
            color="bg-[#FF7A50]"
          />
          <StatCard
            title="Total Questions"
            value="151"
            icon={<FaPencilAlt />}
            color="bg-[#FF7A50]"
          />
          <StatCard
            title="Quizzes Created"
            value="28"
            icon={<FaClipboardList />}
            color="bg-[#FF7A50]"
          />
          <StatCard
            title="Chapters Done"
            value="22"
            icon={<FaTasks />}
            color="bg-[#FF7A50]"
            progress={73}
          />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          <div className="xl:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">
                Assigned Books
              </h3>
              <button className="text-blue-600 bg-blue-100 rounded-full p-2 touch-manipulation hover:bg-blue-200 transition-colors">
                <FiPlus size={18} />
              </button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {user?.assignedBooks && user.assignedBooks.length > 0 ? (
                user.assignedBooks.map((book, index) => (
                  <AssignedBookItem
                    key={book.id}
                    title={book.title}
                    subject={book.subject}
                    chapters={book.chapters}
                    questions={0} // You can add question count logic later
                    status="Active"
                  />
                ))
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

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">To-Do List</h3>
              <button className="text-orange-600 bg-orange-100 rounded-full p-2 touch-manipulation hover:bg-orange-200 transition-colors">
                <FiPlus size={18} />
              </button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <TodoItem
                task="Add Questions for Science Explorer Chapter 2"
                date="January 5, 2025"
                color="#FF7A50"
              />
              <TodoItem
                task="Review Math Essential Chapter 1 Content"
                date="January 10, 2025"
                color="#FFC107"
              />
              <TodoItem
                task="Create Quiz for English Skills Builder"
                date="January 12, 2025"
                color="#4CAF50"
              />
              <TodoItem
                task="Check Student List for Social Sciences"
                date="January 12, 2025"
                color="#2196F3"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
