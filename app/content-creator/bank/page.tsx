"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { useUserProfile } from "@/hooks/useUserProfile";
import QuestionBank from "@/components/QuestionBank";

export default function MyQuestionBankPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading: profileLoading, error: profileError } = useUserProfile();

  if (profileLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user?.uid) {
    return (
      <div className="flex items-center justify-center h-screen text-center px-4">
        <div>
          <p className="text-lg font-semibold text-gray-800 mb-2">Unable to load profile</p>
          <p className="text-sm text-gray-600">{profileError || "Please log out and log in again."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar userRole="Content Creator" currentPage="bank" open={sidebarOpen} onClose={() => setSidebarOpen(false)} userOverride={user} />

      {/* Main Content */}
      <div className="flex-1 lg:ml-[256px] min-w-0 flex flex-col">
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
            <h1 className="text-lg sm:text-2xl font-bold text-[#1F46D8] font-gibson-semibold">My Question Bank</h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <QuestionBank
            apiEndpoint="/api/oup-creator/questions"
            userRole="content_creator"
            userId={user.uid}
            userEmail={user.email}
            allowEdit={true}
            allowDelete={true}
          />
        </div>
      </div>
    </div>
  );
}
