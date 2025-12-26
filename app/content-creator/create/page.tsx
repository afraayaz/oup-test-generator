"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSearchParams } from "next/navigation";
import QuestionCreationModePage from "@/components/QuestionCreationModePage";
import QuestionBank from "@/components/QuestionBank";

export default function ContentCreatorCreateQuestionPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'bank'>('create');
  const { user } = useUserProfile();
  const searchParams = useSearchParams();

  // Handle mode from query parameter
  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'bank') {
      setMode('bank');
    }
  }, [searchParams]);

  // Debug log
  React.useEffect(() => {
    console.log('📝 CC Create page - user:', {
      name: user?.name,
      assignedBooksLength: user?.assignedBooks?.length,
    });
  }, [user]);

  if (!user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="h-screen bg-gray-50 w-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar userRole="Content Creator" currentPage="create" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="fixed top-0 right-0 bottom-0 left-0 lg:left-64 flex flex-col overflow-hidden">
        {/* Header with Toggle */}
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
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
              {mode === 'create' ? 'Create Questions' : 'My Question Bank'}
            </h1>
            
            {/* Toggle Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode('create')}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'create'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span className="hidden sm:inline">Create</span>
                <span className="sm:hidden">+</span>
              </button>
              <button
                onClick={() => setMode('bank')}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'bank'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span className="hidden sm:inline">Question Bank</span>
                <span className="sm:hidden">📚</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {mode === 'create' ? (
            <QuestionCreationModePage
              userRole="Content Creator"
              baseRoute="/content-creator/create"
              apiEndpoint="/api/oup-creator/questions"
              embeddedMode={true}
              user={user}
            />
          ) : (
            <QuestionBank
              apiEndpoint="/api/oup-creator/questions"
              userRole="content_creator"
              userId={user?.uid}
              allowEdit={true}
              allowDelete={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
