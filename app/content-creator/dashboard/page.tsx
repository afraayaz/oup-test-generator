'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '@/firebase/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

export default function ContentCreatorDashboard() {
  const { user } = useUserProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
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
  const [selectedDifficultyGrade, setSelectedDifficultyGrade] = useState<string>('overall');
  const [selectedTypeGrade, setSelectedTypeGrade] = useState<string>('overall');
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (user?.uid) {
      fetchDashboardData();
    }
  }, [user?.uid]);

  // Recalculate difficulty distribution when grade filter changes
  useEffect(() => {
    if (allQuestions.length === 0) return;

    const normalizeGrade = (grade: string) => {
      if (!grade) return '';
      return grade.replace(/^grade\s*/i, '').trim();
    };

    // Filter questions by selected grade
    const filteredQuestions = selectedDifficultyGrade === 'overall' 
      ? allQuestions 
      : allQuestions.filter(q => normalizeGrade(q.grade) === selectedDifficultyGrade);

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
  }, [selectedDifficultyGrade, allQuestions]);

  // Recalculate question type distribution when grade filter changes
  useEffect(() => {
    if (allQuestions.length === 0) return;

    const normalizeGrade = (grade: string) => {
      if (!grade) return '';
      return grade.replace(/^grade\s*/i, '').trim();
    };

    // Filter questions by selected grade
    const filteredQuestions = selectedTypeGrade === 'overall' 
      ? allQuestions 
      : allQuestions.filter(q => normalizeGrade(q.grade) === selectedTypeGrade);

    // Calculate question type distribution
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
  }, [selectedTypeGrade, allQuestions]);

  // Refetch data when window gains focus (user comes back to dashboard)
  useEffect(() => {
    const handleFocus = () => {
      if (user?.uid) {
        fetchDashboardData();
      }
    };

    window.addEventListener('focus', handleFocus);
    
    // Also refetch every 30 seconds while on the page
    const interval = setInterval(() => {
      if (user?.uid && document.visibilityState === 'visible') {
        fetchDashboardData();
      }
    }, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [user?.uid]);

  const fetchDashboardData = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      
      console.log('🔍 Fetching dashboard data for user:', user.uid);
      
      // Fetch all questions created by this content creator
      // Note: API stores as 'createdBy', not 'createdById'
      const questionsRef = collection(db, 'questions', 'oup', 'items');
      const q = query(questionsRef, where('createdBy', '==', user.uid));
      const snapshot = await getDocs(q);
      
      console.log('📊 Found questions:', snapshot.size);
      
      const questions = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Question data:', {
          id: doc.id,
          createdById: data.createdById,
          createdBy: data.createdBy,
          subject: data.subject,
          questionText: data.questionText?.substring(0, 50)
        });
        return {
          id: doc.id,
          ...data
        } as any;
      });

      // Calculate stats
      const totalQuestions = questions.length;
      
      // Calculate this week's questions
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeekQuestions = questions.filter(q => {
        const createdAt = q.createdAt?.toDate ? q.createdAt.toDate() : new Date(q.createdAt);
        return createdAt >= oneWeekAgo;
      }).length;

      // Calculate week-wise data for last 4 weeks
      const weekData = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        
        const weekQuestions = questions.filter(q => {
          const createdAt = q.createdAt?.toDate ? q.createdAt.toDate() : new Date(q.createdAt);
          return createdAt >= weekStart && createdAt < weekEnd;
        });
        
        weekData.push({
          week: `Week ${4 - i}`,
          created: weekQuestions.length,
          approved: 0,
          rejected: 0
        });
      }
      setCreationTrendData(weekData);

      // Extract unique grades from questions
      const normalizeGrade = (grade: string) => {
        if (!grade) return '';
        return grade.replace(/^grade\s*/i, '').trim();
      };
      
      const uniqueGrades = [...new Set(questions.map(q => normalizeGrade(q.grade)).filter(Boolean))].sort((a, b) => {
        const aNum = parseInt(a);
        const bNum = parseInt(b);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return a.localeCompare(b);
      });
      setAvailableGrades(uniqueGrades);

      // Store all questions for later filtering
      setAllQuestions(questions);

      // Filter questions by selected grade for difficulty calculation
      const filteredQuestions = selectedDifficultyGrade === 'overall' 
        ? questions 
        : questions.filter(q => normalizeGrade(q.grade) === selectedDifficultyGrade);

      // Calculate difficulty distribution for pie chart
      const difficultyCounts: { [key: string]: number } = { Easy: 0, Medium: 0, Hard: 0 };
      filteredQuestions.forEach(q => {
        const difficulty = q.difficulty || 'Medium';
        if (difficultyCounts[difficulty] !== undefined) {
          difficultyCounts[difficulty]++;
        }
      });
      
      // Create pie chart data for difficulty
      const difficultyColors = { Easy: '#10B981', Medium: '#F59E0B', Hard: '#EF4444' };
      const difficultyPieData = Object.entries(difficultyCounts).map(([level, count]) => ({
        subject: level, // Keep 'subject' key for compatibility with PieChart component
        count,
        color: difficultyColors[level as keyof typeof difficultyColors]
      }));
      setSubjectDistribution(difficultyPieData);

      // Question type distribution will be calculated in separate useEffect
      // based on selectedTypeGrade filter

      // Get recent questions (last 4)
      const sortedQuestions = questions
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return bTime.getTime() - aTime.getTime();
        })
        .slice(0, 4)
        .map(q => {
          const createdAt = q.createdAt?.toDate ? q.createdAt.toDate() : new Date(q.createdAt);
          const timeDiff = Date.now() - createdAt.getTime();
          const hours = Math.floor(timeDiff / (1000 * 60 * 60));
          const days = Math.floor(hours / 24);
          const timeAgo = days > 0 ? `${days} day${days > 1 ? 's' : ''} ago` : 
                         hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ago` : 
                         'Just now';
          
          return {
            id: q.id,
            text: q.questionText || q.question || 'No question text',
            subject: q.subject || 'N/A',
            grade: q.grade || 'N/A',
            difficulty: q.difficulty || 'Medium',
            status: 'approved', // Since approval queue is removed, all are approved
            time: timeAgo
          };
        });
      setRecentQuestions(sortedQuestions);

      setStats({
        questionsCreated: totalQuestions,
        questionsApproved: totalQuestions, // Since approval is removed
        pendingReview: 0, // No approval queue
        rejectedQuestions: 0, // No rejection
        thisWeek: thisWeekQuestions,
        approvalRate: 100 // All approved since no approval workflow
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole="Content Creator" currentPage="dashboard" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 lg:ml-[256px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar userRole="Content Creator" currentPage="dashboard" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 xl:ml-[256px] min-w-0">
        {/* Header with Glass Effect */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="xl:hidden min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all duration-200 hover:scale-105"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="hidden sm:flex w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl items-center justify-center shadow-lg flex-shrink-0">
              <i className="ri-dashboard-line text-white text-lg md:text-xl"></i>
            </div>
            <h1 className="text-base sm:text-lg md:text-xl xl:text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent truncate">
              Content Creator Dashboard
            </h1>
          </div>
          <div className="w-12 h-12"></div>
        </div>

        {/* Main Content */}
        <div className="p-3 sm:p-4 md:p-6 xl:p-8 w-full">
          {/* Welcome Section - Larger Size */}
          <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 xl:p-10 mb-4 sm:mb-6 text-white shadow-xl overflow-hidden">
            {/* Animated Background Patterns */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-300 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
            </div>
            <div className="relative z-10 flex items-center gap-3 sm:gap-4 md:gap-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                <i className="ri-quill-pen-line text-2xl sm:text-3xl md:text-4xl text-white"></i>
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl md:text-3xl xl:text-4xl font-bold mb-1">Welcome Back!</h2>
                <p className="text-violet-100 text-base sm:text-lg">{user?.name || 'Content Creator'}</p>
              </div>
            </div>
          </div>

          {/* KPI Cards Row with Enhanced Design */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            {/* Questions Created */}
            <div className="group bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-violet-200 hover:-translate-y-1">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <i className="ri-file-list-3-line text-xl sm:text-2xl text-white"></i>
                </div>
                <div className="px-2 sm:px-3 py-1 bg-violet-50 text-violet-600 text-xs font-bold rounded-full border border-violet-100">
                  TOTAL
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-1 sm:mb-2">{stats.questionsCreated}</h3>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Questions Created</p>
            </div>

            {/* Approved Questions */}
            <div className="group bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-green-200 hover:-translate-y-1">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <i className="ri-checkbox-circle-line text-xl sm:text-2xl text-white"></i>
                </div>
                <div className="px-2 sm:px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-full border border-green-100">
                  {stats.approvalRate}%
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-1 sm:mb-2">{stats.questionsApproved}</h3>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Approved Questions</p>
            </div>

            {/* Pending Review */}
            <div className="group bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-orange-200 hover:-translate-y-1">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <i className="ri-time-line text-xl sm:text-2xl text-white"></i>
                </div>
                <div className="px-2 sm:px-3 py-1 bg-orange-50 text-orange-600 text-xs font-bold rounded-full border border-orange-100">
                  REVIEW
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-1 sm:mb-2">{stats.pendingReview}</h3>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Pending Review</p>
            </div>

            {/* This Week */}
            <div className="group bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200 hover:-translate-y-1">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <i className="ri-calendar-check-line text-xl sm:text-2xl text-white"></i>
                </div>
                <div className="px-2 sm:px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-100">
                  7 DAYS
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-1 sm:mb-2">{stats.thisWeek}</h3>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Created This Week</p>
            </div>
          </div>

          {/* Charts Row with Enhanced Design */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            {/* Left Column - Creation Trend & Question Type Distribution stacked */}
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              {/* Question Creation Trend */}
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 lg:p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <i className="ri-line-chart-line text-white text-base sm:text-lg"></i>
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">Question Creation Trend</h3>
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
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 lg:p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <i className="ri-bar-chart-box-line text-white text-base sm:text-lg"></i>
                    </div>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">Question Type Distribution</h3>
                  </div>
                  
                  {/* Grade Filter Dropdown */}
                  <select
                    value={selectedTypeGrade}
                    onChange={(e) => setSelectedTypeGrade(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-700 hover:border-indigo-400 transition-colors cursor-pointer"
                  >
                    <option value="overall">All Grades</option>
                    {availableGrades.map(grade => (
                      <option key={grade} value={grade}>Grade {grade}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full overflow-hidden">
                  <ResponsiveContainer width="100%" height={200}>
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

            {/* Right Column - Difficulty Pie Chart */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 lg:p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <i className="ri-pie-chart-2-line text-white text-base sm:text-lg"></i>
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">Questions by Difficulty</h3>
                </div>
                
                {/* Grade Filter Dropdown */}
                <select
                  value={selectedDifficultyGrade}
                  onChange={(e) => setSelectedDifficultyGrade(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-700 hover:border-purple-400 transition-colors cursor-pointer"
                >
                  <option value="overall">All Grades</option>
                  {availableGrades.map(grade => (
                    <option key={grade} value={grade}>Grade {grade}</option>
                  ))}
                </select>
              </div>
              <div className="w-full overflow-hidden flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%" minHeight={350}>
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
              <div className="mt-4 sm:mt-6 space-y-2">
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

          {/* Recent Questions */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 lg:p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className="ri-article-line text-white text-base sm:text-lg"></i>
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate">Recent Questions</h3>
              </div>
              <button className="min-w-[44px] min-h-[44px] px-4 py-2 text-violet-600 hover:text-white text-xs sm:text-sm font-semibold bg-violet-50 hover:bg-violet-600 rounded-xl transition-all duration-200 hover:shadow-lg flex-shrink-0">
                View All →
              </button>
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              {recentQuestions.map((question) => (
                <div key={question.id} className="group border-2 border-gray-100 rounded-xl p-4 sm:p-5 hover:border-violet-200 hover:shadow-md transition-all duration-200 bg-gradient-to-r from-white to-gray-50">
                  {/* Mobile: Stacked layout */}
                  <div className="block sm:hidden">
                    <p className="text-sm font-semibold text-gray-900 mb-3 line-clamp-2">{question.text}</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">{question.subject}</span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">{question.grade}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <span className={`px-2 py-1 text-xs rounded text-center ${
                        question.difficulty === 'Easy' ? 'bg-green-50 text-green-600' :
                        question.difficulty === 'Medium' ? 'bg-orange-50 text-orange-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {question.difficulty}
                      </span>
                      <span className="px-2 py-1 text-xs text-gray-400 text-center">{question.time}</span>
                      <div className={`px-2 py-1 rounded-full text-xs font-semibold text-center ${
                        question.status === 'approved' ? 'bg-green-100 text-green-700' :
                        question.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {question.status === 'approved' ? '✓' : question.status === 'pending' ? '⏳' : '✗'}
                      </div>
                    </div>
                  </div>

                  {/* Tablet+: Horizontal layout */}
                  <div className="hidden sm:flex sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">{question.text}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">{question.subject}</span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">{question.grade}</span>
                        <span className={`px-2 py-1 text-xs rounded ${
                          question.difficulty === 'Easy' ? 'bg-green-50 text-green-600' :
                          question.difficulty === 'Medium' ? 'bg-orange-50 text-orange-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {question.difficulty}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className="text-xs text-gray-400 whitespace-nowrap">{question.time}</p>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        question.status === 'approved' ? 'bg-green-100 text-green-700' :
                        question.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {question.status.charAt(0).toUpperCase() + question.status.slice(1)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
