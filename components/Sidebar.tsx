"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserProfile } from "@/hooks/useUserProfile";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/firebase";

interface SidebarProps {
  userRole:
    | "Admin"
    | "Teacher"
    | "Student"
    | "School Admin"
    | "Moderator"
    | "Content Creator";
  currentPage: string;
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  userRole,
  currentPage,
  open,
  onClose,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const { user } = useUserProfile();
  const router = useRouter();

  const isMobileOpen = open !== undefined ? open : internalMobileOpen;

  const adminMenuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "ri-dashboard-line",
      href: "/admin/dashboard",
    },
    {
      id: "users",
      label: "User Management",
      icon: "ri-user-settings-line",
      href: "/admin/users",
    },
    {
      id: "organization",
      label: "Organization Setup",
      icon: "ri-building-line",
      href: "/admin/organization",
    },
    {
      id: "monitoring",
      label: "Content Monitoring",
      icon: "ri-shield-check-line",
      href: "/admin/monitoring",
    },
    {
      id: "question-banks",
      label: "Question Banks",
      icon: "ri-database-line",
      href: "/admin/question-banks",
    },
    {
      id: "profile",
      label: "Profile & Settings",
      icon: "ri-settings-line",
      href: "/admin/profile",
    },
  ];

  const teacherMenuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "ri-dashboard-line",
      href: "/teacher/dashboard",
    },
    {
      id: "books",
      label: "Books & Chapters",
      icon: "ri-book-line",
      href: "/teacher/books",
    },
    {
      id: "create",
      label: "Create Questions",
      icon: "ri-file-add-line",
      href: "/teacher/create-questions",
    },
    {
      id: "questions",
      label: "My Question Bank",
      icon: "ri-database-line",
      href: "/teacher/my-questions",
    },
    {
      id: "quiz",
      label: "Quiz Generator",
      icon: "ri-file-list-3-line",
      href: "/teacher/quiz",
    },
    {
      id: "interactiveQuiz",
      label: "Interactive Quiz",
      icon: "ri-file-list-3-line",
      href: "/teacher/interactiveQuiz",
    },
    {
      id: "profile",
      label: "Profile",
      icon: "ri-user-line",
      href: "/teacher/profile",
    },
  ];

  const studentMenuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "ri-dashboard-line",
      href: "/student/dashboard",
    },
    {
      id: "assigned",
      label: "Assigned Quizzes",
      icon: "ri-file-list-3-line",
      href: "/student/assigned",
    },
    {
      id: "profile",
      label: "Profile",
      icon: "ri-user-line",
      href: "/student/profile",
    },
  ];

  const schoolAdminMenuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "ri-dashboard-line",
      href: "/school-admin/dashboard",
    },
    {
      id: "question-bank",
      label: "Question Bank",
      icon: "ri-database-line",
      href: "/school-admin/question-bank",
    },
    {
      id: "users",
      label: "User Management",
      icon: "ri-team-line",
      href: "/school-admin/users",
    },
    {
      id: "reports",
      label: "Reports & Analytics",
      icon: "ri-bar-chart-line",
      href: "/school-admin/reports",
    },
    {
      id: "settings",
      label: "School Settings",
      icon: "ri-settings-line",
      href: "/school-admin/settings",
    },
  ];

  const moderatorMenuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "ri-dashboard-line",
      href: "/moderator/dashboard",
    },
    {
      id: "review",
      label: "Review Queue",
      icon: "ri-file-check-line",
      href: "/moderator/review",
    },
    {
      id: "approved",
      label: "Approved Content",
      icon: "ri-checkbox-circle-line",
      href: "/moderator/approved",
    },
    {
      id: "rejected",
      label: "Rejected Content",
      icon: "ri-close-circle-line",
      href: "/moderator/rejected",
    },
    {
      id: "analytics",
      label: "Quality Analytics",
      icon: "ri-line-chart-line",
      href: "/moderator/analytics",
    },
  ];

  const contentCreatorMenuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "ri-dashboard-line",
      href: "/content-creator/dashboard",
    },
    {
      id: "create",
      label: "Create Questions",
      icon: "ri-file-add-line",
      href: "/content-creator/create",
    },
    {
      id: "bank",
      label: "My Question Bank",
      icon: "ri-database-line",
      href: "/content-creator/bank",
    },
  ];

  const menuItems =
    userRole === "Admin"
      ? adminMenuItems
      : userRole === "Teacher"
        ? teacherMenuItems
        : userRole === "Student"
          ? studentMenuItems
          : userRole === "School Admin"
            ? schoolAdminMenuItems
            : userRole === "Moderator"
              ? moderatorMenuItems
              : contentCreatorMenuItems;

  const handleLogout = async () => {
    try {
      // Sign out from Firebase
      await signOut(auth);
      console.log("✓ Signed out from Firebase");
      
      // Clear any session storage
      sessionStorage.removeItem('tab_id');
      localStorage.removeItem('multitab_sessions');
      
      // Redirect to login
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      // Still redirect even if sign out fails
      router.push("/login");
    }
  };

  const closeMobileMenu = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalMobileOpen(false);
    }
  };

  const toggleMobileMenu = () => {
    if (open !== undefined && onClose) {
      onClose();
    } else {
      setInternalMobileOpen(!internalMobileOpen);
    }
  };

  return (
    <>
      {/* Mobile Menu Toggle Button - Hidden when controlled externally */}
      {open === undefined && (
        <button
          onClick={toggleMobileMenu}
          className="lg:hidden fixed top-4 left-4 z-50 min-h-[44px] min-w-[44px] flex items-center justify-center bg-[#002147] text-white rounded-lg shadow-lg active:bg-blue-900"
        >
          <i
            className={`${isMobileOpen ? "ri-close-line" : "ri-menu-line"} text-2xl`}
          ></i>
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={closeMobileMenu}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed top-0 left-0 bg-[#002147] border-r border-gray-200 h-screen transition-all duration-300 z-40
        ${isCollapsed ? "w-16" : "w-64"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}
      >
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {!isCollapsed && (
                <div>
                  <h1 className="text-xl font-bold text-white">
                    Test Generator
                  </h1>
                  <p className="text-xs text-gray-300">{userRole} Panel</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-blue-900 active:bg-blue-800 cursor-pointer transition-colors"
            >
              <i
                className={`ri-menu-${isCollapsed ? "unfold" : "fold"}-line text-gray-300 text-xl`}
              ></i>
            </button>
          </div>
        </div>

        <nav className="px-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors cursor-pointer ${
                    currentPage === item.id
                      ? "bg-blue-800 text-white border-r-2 border-white"
                      : "text-gray-300 hover:bg-blue-900"
                  }`}
                >
                  <i
                    className={`${item.icon} w-5 h-5 flex items-center justify-center`}
                  ></i>
                  {!isCollapsed && (
                    <span className="text-sm font-medium whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="absolute bottom-6 left-0 right-0 px-4 space-y-3">
          {/* User Profile Card */}
          {user && !isCollapsed && (
            <div className="bg-blue-900 rounded-lg p-3 mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-blue-800 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {(user.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{user.name || 'User'}</p>
                  <p className="text-xs text-blue-200 truncate capitalize">{user.role || 'User'}</p>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={() => {
              handleLogout();
              closeMobileMenu();
            }}
            className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-gray-300 hover:bg-blue-900 transition-colors cursor-pointer"
          >
            <i className="ri-logout-box-line w-5 h-5 flex items-center justify-center"></i>
            {!isCollapsed && (
              <span className="text-sm font-medium whitespace-nowrap">
                Logout
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
