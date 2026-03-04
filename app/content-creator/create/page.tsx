"use client";

import React, { useState, useEffect } from "react";
import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSearchParams } from "next/navigation";
import QuestionCreationModePage from "@/components/QuestionCreationModePage";
import QuestionBank from "@/components/QuestionBank";
import BulkUploadPage from "@/components/BulkUploadPage";
import { FiMenu } from "react-icons/fi";

// interactive mode is not part of teacher-style UI so we can discard dynamic import

function ContentCreatorCreateQuestionPageContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "bulk" | "bank">("create");
  const { user, loading: profileLoading, error: profileError } = useUserProfile();
  const searchParams = useSearchParams();

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "bank") setMode("bank");
    else if (modeParam === "bulk") setMode("bulk");
  }, [searchParams]);

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

  const tabs: { key: "create" | "bulk" | "bank"; label: string }[] = [
    { key: "create", label: "Create Questions" },
    { key: "bulk", label: "Bulk Upload" },
    { key: "bank", label: "Question Bank" },
  ];

  return (
    <div className="h-screen bg-gray-50 w-screen overflow-hidden">
      <Sidebar userRole="Content Creator" currentPage="create" open={sidebarOpen} onClose={() => setSidebarOpen(false)} userOverride={user} />

      <div className="fixed top-0 right-0 bottom-0 left-0 lg:left-64 flex flex-col overflow-hidden">
        {/* ── OUP-style top bar ── */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <nav className="flex flex-wrap items-center rounded-lg border border-gray-200 overflow-hidden">
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
                userRole="Content Creator"
                baseRoute="/content-creator/create"
                apiEndpoint="/api/oup-creator/questions"
                embeddedMode={true}
                user={user}
              />
            )}
          {mode === "bulk" && (
            <BulkUploadPage
              userRole="Content Creator"
              apiEndpoint="/api/oup-creator/questions"
              userRoleParam="content_creator"
            />
          )}
          {mode === "bank" && (
            <QuestionBank
              apiEndpoint="/api/oup-creator/questions"
              userRole="content_creator"
              userId={user?.uid}
              userEmail={user?.email}
              allowEdit={true}
              allowDelete={true}
            />
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContentCreatorCreateQuestionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ContentCreatorCreateQuestionPageContent />
    </Suspense>
  );
}
