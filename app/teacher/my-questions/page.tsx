"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useUserProfile } from "@/hooks/useUserProfile";
import QuestionBank from "@/components/QuestionBank";

export default function TeacherQuestionsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useUserProfile();

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="h-screen bg-gray-50 w-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar userRole="Teacher" currentPage="questions" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="fixed top-0 right-0 bottom-0 left-0 lg:left-64 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">My Question Bank</h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <QuestionBank
              apiEndpoint="/api/teacher/questions"
              userRole="teacher"
              userId={user.uid}
              schoolId={user.schoolId}
              schoolName={user.schoolName}
              allowEdit={true}
              allowDelete={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
