"use client";

import React, { useState, useEffect } from "react";
import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSearchParams } from "next/navigation";
import QuestionCreationModePage from "@/components/QuestionCreationModePage";
import QuestionBank from "@/components/QuestionBank";
import BulkUploadPage from "@/components/BulkUploadPage";
import OnboardingTour from "@/components/OnboardingTour";
import { teacherCreateQuestionsTabTourSteps } from "@/components/tours/teacherCreateQuestionsTabTourSteps";
import { FiMenu } from "react-icons/fi";

type Mode = "create" | "bulk" | "bank";

function TeacherCreateQuestionPageContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [mounted, setMounted] = useState(false);
  const { user } = useUserProfile();
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "bank") setMode("bank");
    else if (modeParam === "bulk") setMode("bulk");
  }, [searchParams]);

  // Prevent hydration mismatch by only showing content after mount
  if (!mounted || !user) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const tabs: { key: Mode; label: string }[] = [
    { key: "create", label: "Create Questions" },
    { key: "bulk", label: "Bulk Upload" },
    { key: "bank", label: "Question Bank" },
  ];

  return (
    <div className="h-screen bg-gray-50 w-screen overflow-hidden">
      <Sidebar userRole="Teacher" currentPage="create" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="fixed top-0 right-0 bottom-0 left-0 lg:left-64 flex flex-col overflow-hidden">
        {/* ── OUP-style top bar ── */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">

            {/* Left: hamburger (mobile) + pill tabs */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <FiMenu size={22} />
              </button>

              {/* Pill-tab group */}
              <nav className="flex flex-wrap items-center rounded-lg border border-gray-200 overflow-hidden tab-navigation">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setMode(tab.key)}
                    className={`px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap
                      ${mode === tab.key
                        ? "bg-[#1b2d5b] text-white"
                        : "bg-white text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>



          </div>
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-auto">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            {mode === "create" && (
              <QuestionCreationModePage
                userRole="Teacher"
                baseRoute="/teacher/create-questions"
                apiEndpoint="/api/teacher/questions"
                embeddedMode={true}
                user={user}
              />
            )}
          {mode === "bulk" && (
            <BulkUploadPage
              userRole="Teacher"
              apiEndpoint="/api/teacher/questions"
              userRoleParam="teacher"
            />
          )}
            {mode === "bank" && (
            <QuestionBank
              apiEndpoint="/api/teacher/questions"
              userRole="teacher"
              userId={user?.uid}
              schoolId={user?.schoolId}
              schoolName={user?.schoolName}
              allowEdit={true}
              allowDelete={true}
            />
          )}
          </div>
        </div>
      </div>
      <OnboardingTour steps={teacherCreateQuestionsTabTourSteps} storageKey="teacher-create-questions-tab-tour-completed" />
    </div>
  );
}

export default function TeacherCreateQuestionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TeacherCreateQuestionPageContent />
    </Suspense>
  );
}
