'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ContentCreatorDashboard() {
  const { user, loading: profileLoading, error: profileError, refresh: refreshUserProfile } = useUserProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    questionsCreated: 0,
    questionsApproved: 0,
    pendingReview: 0,
    rejectedQuestions: 0,
    thisWeek: 0,
    approvalRate: 0
  });

  const [creationTrendData, setCreationTrendData] = useState<any[]>([]);
  const [subjectDistribution, setSubjectDistribution] = useState<any[]>([]);
  const [difficultyBreakdown, setDifficultyBreakdown] = useState<any[]>([]);
  const [recentQuestions, setRecentQuestions] = useState<any[]>([]);
  const [filters, setFilters] = useState({ subject: 'all', grade: 'all' });
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid || hasFetched) return;
    fetchDashboardData();
  }, [user?.uid, hasFetched]);

  useEffect(() => {
    if (!profileLoading && !user?.uid) {
      setLoading(false);
    }
  }, [profileLoading, user?.uid]);

  // Helper function to normalize grade
  const normalizeGrade = (grade: string) => {
    if (!grade) return '';
    return grade.replace(/^grade\s*/i, '').trim();
  };

  // Helper function to get filtered questions
  const getFilteredQuestions = () => {
    return allQuestions.filter(q => {
      const matchSubject = filters.subject === 'all' || q.subject === filters.subject;
      const matchGrade = filters.grade === 'all' || normalizeGrade(q.grade) === filters.grade;
      return matchSubject && matchGrade;
    });
  };

  // Recalculate difficulty distribution when filters change
  useEffect(() => {
    if (allQuestions.length === 0) return;

    const filteredQuestions = getFilteredQuestions();

    // Calculate difficulty distribution
    const difficultyCounts: { [key: string]: number } = { Easy: 0, Medium: 0, Hard: 0 };
    filteredQuestions.forEach(q => {
      const difficulty = q.difficulty || 'Medium';
      if (difficultyCounts[difficulty] !== undefined) {
        difficultyCounts[difficulty]++;
      }
    });

    // Create pie chart data
    const difficultyColors = { Easy: '#10B981', Medium: '#F59E0B', Hard: '#EF4444' };
    const difficultyPieData = Object.entries(difficultyCounts).map(([level, count]) => ({
      subject: level,
      count,
      color: difficultyColors[level as keyof typeof difficultyColors]
    }));
    setSubjectDistribution(difficultyPieData);

    // Calculate question type distribution with same filtered questions
    const typeLabels: { [key: string]: string } = {
      multiple: "MCQ",
      truefalse: "True/False",
      short: "Short Answer",
      long: "Long Answer",
      fillblanks: "Fill Blanks",
      matching: "Matching",
      ordering: "Ordering",
      categorization: "Categorization",
      "drag-drop": "Drag & Drop"
    };
    
    const typeColors: { [key: string]: string } = {
      "MCQ": "#8B5CF6",
      "True/False": "#10B981",
      "Short Answer": "#F59E0B",
      "Long Answer": "#EF4444",
      "Fill Blanks": "#06B6D4",
      "Matching": "#EC4899",
      "Ordering": "#6366F1",
      "Categorization": "#84CC16",
      "Drag & Drop": "#F97316"
    };
    
    const typeCounts: { [key: string]: number } = {};
    filteredQuestions.forEach(q => {
      const type = q.type || 'multiple';
      const label = typeLabels[type] || type;
      typeCounts[label] = (typeCounts[label] || 0) + 1;
    });
    
    const typeData = Object.entries(typeCounts)
      .map(([type, count]) => ({
        level: type,
        count: count,
        color: typeColors[type] || "#8B5CF6"
      }))
      .sort((a, b) => b.count - a.count);
    
    setDifficultyBreakdown(typeData);
  }, [filters, allQuestions]);

  // Extract unique subjects from questions
  useEffect(() => {
    if (allQuestions.length === 0) return;
    
    const uniqueSubjects = [...new Set(allQuestions.map(q => q.subject).filter(Boolean))].sort();
    setAvailableSubjects(uniqueSubjects);
  }, [allQuestions]);

  // Optional: Refetch data periodically (only if needed)
  // Removed aggressive refetch on window focus to prevent loading flicker

  const fetchDashboardData = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      setFetchError(null);

      const response = await fetch('/api/content-creator/dashboard-stats', {
        method: 'GET',
        headers: {
          'x-user-id': user.uid,
          'x-user-email': user.email || '',
          'x-user-role': user.role || 'content_creator',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to load dashboard (${response.status})`);
      }

      const payload = await response.json();
      const questions = (payload.allQuestions || []).map((q: any) => ({
        ...q,
        questionText: q.questionText || q.question_text || q.question || '',
        createdAt: q.createdAt || q.created_at || null,
      }));

      setStats(payload.stats || {
        questionsCreated: 0,
        questionsApproved: 0,
        pendingReview: 0,
        rejectedQuestions: 0,
        thisWeek: 0,
        approvalRate: 0
      });
      setCreationTrendData(payload.creationTrendData || []);
      setSubjectDistribution(payload.subjectDistribution || []);
      setDifficultyBreakdown(payload.difficultyBreakdown || []);
      setRecentQuestions(payload.recentQuestions || []);
      setAvailableGrades(payload.availableGrades || []);
      setAvailableSubjects(payload.availableSubjects || []);
      setAllQuestions(questions);
      
      setHasFetched(true);

    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-white">
        <Sidebar userRole="Content Creator" currentPage="dashboard" open={sidebarOpen} onClose={() => setSidebarOpen(false)} userOverride={user} />
        <div className="flex-1 lg:ml-[256px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1F46D8] mx-auto mb-4"></div>
            <p className="text-[#6B7280]">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user?.uid) {
    return (
      <div className="flex min-h-screen bg-white">
        <Sidebar userRole="Content Creator" currentPage="dashboard" open={sidebarOpen} onClose={() => setSidebarOpen(false)} userOverride={user} />
        <div className="flex-1 lg:ml-[256px] flex items-center justify-center">
          <div className="text-center">
            <p className="text-[#374151] text-lg font-semibold mb-2">Unable to load dashboard</p>
            <p className="text-[#6B7280] text-sm">
              {profileError || 'User session not available. Please log out and log in again.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex min-h-screen bg-white">
        <Sidebar userRole="Content Creator" currentPage="dashboard" open={sidebarOpen} onClose={() => setSidebarOpen(false)} userOverride={user} />
        <div className="flex-1 lg:ml-[256px] flex items-center justify-center">
          <div className="text-center">
            <p className="text-[#374151] text-lg font-semibold mb-2">Dashboard request failed</p>
            <p className="text-[#6B7280] text-sm">{fetchError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar userRole="Content Creator" currentPage="dashboard" open={sidebarOpen} onClose={() => setSidebarOpen(false)} userOverride={user} />
      
      <div className="flex-1 lg:ml-[256px] min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-7 py-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center text-[#0B1F3B] hover:text-[#1F46D8] hover:bg-[#E8EEFF] rounded-xl transition-all duration-200"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>

          <div className="flex items-center justify-between gap-3 min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-[#1F46D8] truncate font-gibson-semibold">
              Content Creator Dashboard
            </h1>
            {/* Profile Section */}
            {user && (
              <div className="flex items-center gap-3">
                {/* Refresh Button */}
                <button
                  onClick={async () => {
                    setIsRefreshing(true);
                    await refreshUserProfile();
                    setIsRefreshing(false);
                    // Re-fetch dashboard data after refresh
                    setHasFetched(false);
                  }}
                  disabled={isRefreshing}
                  className="p-2 hover:bg-[#E8EEFF] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  title="Refresh assignments"
                >
                  <svg
                    className={`w-5 h-5 text-[#1F46D8] ${isRefreshing ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
                <div className="w-10 h-10 bg-[#1F46D8] rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {(user.name || 'U').split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-bold text-[#0A0A0A]">{user.name || 'User'}</p>
                  <p className="text-xs text-[#6B7280] capitalize">{user.role || 'Content Creator'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content - 12 Column Grid Layout */}
        <div className="p-7 w-full">
          {/* ROW 1: Welcome Banner (col 1-8) + Approval Progress (col 9-12) */}
          <div className="grid grid-cols-12 gap-5 mb-5">
            {/* Welcome Banner - Spans 8 columns */}
            <div className="col-span-12 lg:col-span-8 h-[110px] bg-[#E8EEFF] rounded-[20px] p-6">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-[28px] font-bold text-[#1F46D8]">Welcome Back!</h2>
                <p className="text-[28px] font-bold text-[#1F46D8]">{user?.name || 'Content Creator'}</p>
              </div>
              <p className="text-[14px] text-[#0A0A0A]">Here is an overview of your question creation workplace</p>
            </div>

            {/* Approval Progress Stat Card - Spans 4 columns */}
            <div className="col-span-12 lg:col-span-4 h-[110px] bg-[#1F46D8] rounded-[20px] p-5 text-white hover:scale-[1.02] transition-all duration-200 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-[36px] font-bold mb-1">{stats.questionsApproved}</h3>
                <p className="text-[16px]">Questions Approved</p>
              </div>
              {/* Progress Ring */}
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#FFD600"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${(stats.approvalRate / 100) * 176} 176`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{stats.approvalRate}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: Three Stat Cards - Each spans 4 columns */}
          <div className="grid grid-cols-12 gap-5 mb-5">
            {/* Questions Created - Columns 1-4 */}
            <div className="col-span-12 md:col-span-4 h-[120px] bg-[#2148D8] rounded-[20px] p-5 text-white hover:scale-[1.02] transition-all duration-200 relative">
              <i className="ri-file-list-3-line text-4xl text-white absolute bottom-5 right-5"></i>
              <div className="flex flex-col justify-center h-full">
                <h3 className="text-[34px] font-bold mb-1">{stats.questionsCreated}</h3>
                <p className="text-[16px]">Questions Created</p>
              </div>
            </div>

            {/* Pending Review - Columns 5-8 */}
            <div className="col-span-12 md:col-span-4 h-[120px] bg-[#2148D8] rounded-[20px] p-5 text-white hover:scale-[1.02] transition-all duration-200 relative">
              <i className="ri-time-line text-4xl text-white absolute bottom-5 right-5"></i>
              <div className="flex flex-col justify-center h-full">
                <h3 className="text-[34px] font-bold mb-1">{stats.pendingReview}</h3>
                <p className="text-[16px]">Pending Review</p>
              </div>
            </div>

            {/* This Week - Columns 9-12 */}
            <div className="col-span-12 md:col-span-4 h-[120px] bg-[#2148D8] rounded-[20px] p-5 text-white hover:scale-[1.02] transition-all duration-200 relative">
              <i className="ri-calendar-check-line text-4xl text-white absolute bottom-5 right-5"></i>
              <div className="flex flex-col justify-center h-full">
                <h3 className="text-[34px] font-bold mb-1">{stats.thisWeek}</h3>
                <p className="text-[16px]">Created This Week</p>
              </div>
            </div>
          </div>

          {/* Centralized Filter Panel */}
          <div className="bg-white border-2 border-[#1F46D8] rounded-[20px] p-5 mb-5">
            <div className="flex items-center gap-4 flex-wrap">
              <h3 className="text-lg font-semibold text-[#1F46D8] flex items-center gap-2">
                <i className="ri-filter-3-line"></i>
                Filters
              </h3>
              
              {/* Subject Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Subject:</label>
                <select
                  value={filters.subject}
                  onChange={(e) => setFilters({...filters, subject: e.target.value})}
                  className="px-3 py-2 text-sm border border-[#1F46D8] rounded-xl focus:ring-2 focus:ring-[#1F46D8] focus:border-transparent bg-white text-[#1F46D8] hover:border-[#2148D8] transition-colors cursor-pointer"
                >
                  <option value="all">All Subjects</option>
                  {availableSubjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              {/* Grade Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Grade:</label>
                <select
                  value={filters.grade}
                  onChange={(e) => setFilters({...filters, grade: e.target.value})}
                  className="px-3 py-2 text-sm border border-[#1F46D8] rounded-xl focus:ring-2 focus:ring-[#1F46D8] focus:border-transparent bg-white text-[#1F46D8] hover:border-[#2148D8] transition-colors cursor-pointer"
                >
                  <option value="all">All Grades</option>
                  {availableGrades.map(grade => (
                    <option key={grade} value={grade}>Grade {grade}</option>
                  ))}
                </select>
              </div>

              {/* Clear Filters Button */}
              {(filters.subject !== 'all' || filters.grade !== 'all') && (
                <button
                  onClick={() => setFilters({subject: 'all', grade: 'all'})}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors flex items-center gap-2"
                >
                  <i className="ri-close-circle-line"></i>
                  Clear Filters
                </button>
              )}

              {/* Filter Status Indicator */}
              <div className="ml-auto text-sm text-gray-600">
                Showing <span className="font-bold text-[#1F46D8]">{getFilteredQuestions().length}</span> of <span className="font-bold">{allQuestions.length}</span> questions
              </div>
            </div>
          </div>

          {/* ROW 3: Charts Row */}
          <div className="grid grid-cols-12 gap-5">
            {/* Left: Question Creation Trend - Columns 1-8 */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-5 h-full">
              {/* Question Creation Trend */}
              <div className="bg-[#FFFEE0] border-2 border-[#1F46D8] rounded-[20px] p-5 flex-shrink-0">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-semibold text-[#1F46D8]">Question Creation Trend</h3>
                </div>
                <div className="w-full overflow-hidden">
                  <ResponsiveContainer width="100%" height={200} minHeight={200}>
                  <AreaChart data={creationTrendData}>
                    <defs>
                      <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="week" stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="created" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorCreated)" name="Created" />
                    <Area type="monotone" dataKey="approved" stroke="#10B981" strokeWidth={2} fillOpacity={0} fill="none" name="Approved" />
                  </AreaChart>
                </ResponsiveContainer>
                </div>
              </div>

              {/* Question Type Distribution */}
              <div className="bg-[#FFFEE0] border-2 border-[#1F46D8] rounded-[20px] p-5 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#1F46D8]">Question Type Distribution</h3>
                </div>
                <div className="w-full flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={difficultyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="level" stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Questions">
                      {difficultyBreakdown.map((entry, index) => {
                        // Default colors array as fallback
                        const defaultColors = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#6366F1', '#84CC16'];
                        const barColor = entry.color || defaultColors[index % defaultColors.length];
                        return <Cell key={`cell-${index}`} fill={barColor} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Right: Questions by Difficulty - Columns 9-12 */}
            <div className="col-span-12 lg:col-span-4 bg-[#E8EEFF] border-2 border-[#1F46D8] rounded-[20px] p-5 flex flex-col min-h-[600px]">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h3 className="text-lg font-semibold text-[#1F46D8]">Questions by Difficulty</h3>
                </div>
                <div className="w-full flex-1 flex items-center justify-center min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subjectDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {subjectDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2 flex-shrink-0">
                  {subjectDistribution.map((difficulty, index) => {
                    const total = subjectDistribution.reduce((sum, item) => sum + item.count, 0);
                    const percentage = total > 0 ? Math.round((difficulty.count / total) * 100) : 0;
                    return (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: difficulty.color }}></div>
                          <span className="text-sm font-medium text-gray-700">{difficulty.subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{difficulty.count}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
