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
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!user?.uid || hasFetched) return;
    fetchDashboardData();
  }, [user?.uid, hasFetched]);

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

  // Optional: Refetch data periodically (only if needed)
  // Removed aggressive refetch on window focus to prevent loading flicker

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
      
      setHasFetched(true);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-white">
        <Sidebar userRole="Content Creator" currentPage="dashboard" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 lg:ml-[256px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1F46D8] mx-auto mb-4"></div>
            <p className="text-[#6B7280]">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar userRole="Content Creator" currentPage="dashboard" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 xl:ml-[256px] min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-7 py-5 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="xl:hidden min-w-[44px] min-h-[44px] w-12 h-12 flex items-center justify-center text-[#0B1F3B] hover:text-[#1F46D8] hover:bg-[#E8EEFF] rounded-xl transition-all duration-200"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>

          <div className="flex items-center justify-between gap-3 min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-[#1F46D8] truncate">
              Content Creator Dashboard
            </h1>
            {/* Profile Section */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1F46D8] rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {(user.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
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

          {/* ROW 3: Charts Row */}
          <div className="grid grid-cols-12 gap-5 mb-5">
            {/* Left: Question Creation Trend - Columns 1-8 */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-5">
              {/* Question Creation Trend */}
              <div className="bg-[#FFFEE0] border-2 border-[#1F46D8] rounded-[20px] p-5">
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
              <div className="bg-[#FFFEE0] border-2 border-[#1F46D8] rounded-[20px] p-5 flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-[#1F46D8]">Question Type Distribution</h3>
                  </div>
                  
                  {/* Grade Filter Dropdown */}
                  <select
                    value={selectedTypeGrade}
                    onChange={(e) => setSelectedTypeGrade(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-[#1F46D8] rounded-xl focus:ring-2 focus:ring-[#1F46D8] focus:border-transparent bg-white text-[#1F46D8] hover:border-[#1F46D8] transition-colors cursor-pointer"
                  >
                    <option value="overall">All Grades</option>
                    {availableGrades.map(grade => (
                      <option key={grade} value={grade}>Grade {grade}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full overflow-hidden flex-1">
                  <ResponsiveContainer width="100%" height="100%" minHeight={200}>
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
            <div className="col-span-12 lg:col-span-4 bg-[#E8EEFF] border-2 border-[#1F46D8] rounded-[20px] p-5 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-[#1F46D8]">Questions by Difficulty</h3>
                  </div>
                  
                  {/* Grade Filter Dropdown */}
                  <select
                    value={selectedDifficultyGrade}
                    onChange={(e) => setSelectedDifficultyGrade(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-[#1F46D8] rounded-xl focus:ring-2 focus:ring-[#1F46D8] focus:border-transparent bg-white text-[#1F46D8] hover:border-[#1F46D8] transition-colors cursor-pointer"
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
                <div className="mt-4 space-y-2">
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
