'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { db } from '@/firebase/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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
    approvalRate: 100
  });

  const [creationTrendData, setCreationTrendData] = useState<any[]>([]);
  const [subjectDistribution, setSubjectDistribution] = useState<any[]>([]);
  const [difficultyBreakdown, setDifficultyBreakdown] = useState<any[]>([]);
  const [recentQuestions, setRecentQuestions] = useState<any[]>([]);
  const [selectedDifficultyGrade, setSelectedDifficultyGrade] = useState<string>('overall');
  const [selectedTypeGrade, setSelectedTypeGrade] = useState<string>('overall');
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);

  // Initial fetch
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

    const filteredQuestions = selectedDifficultyGrade === 'overall'
      ? allQuestions
      : allQuestions.filter(q => normalizeGrade(q.grade) === selectedDifficultyGrade);

    const difficultyCounts: { [key: string]: number } = { Easy: 0, Medium: 0, Hard: 0 };
    filteredQuestions.forEach(q => {
      const difficulty = q.difficulty || 'Medium';
      if (difficultyCounts[difficulty] !== undefined) difficultyCounts[difficulty]++;
    });

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

    const filteredQuestions = selectedTypeGrade === 'overall'
      ? allQuestions
      : allQuestions.filter(q => normalizeGrade(q.grade) === selectedTypeGrade);

    const typeLabels: { [key: string]: string } = {
      multiple: 'MCQ',
      truefalse: 'True/False',
      short: 'Short Answer',
      long: 'Long Answer',
      fillblanks: 'Fill Blanks',
      matching: 'Matching',
      ordering: 'Ordering',
      categorization: 'Categorization',
      'drag-drop': 'Drag & Drop'
    };

    const typeColors: { [key: string]: string } = {
      'MCQ': '#8B5CF6',
      'True/False': '#10B981',
      'Short Answer': '#F59E0B',
      'Long Answer': '#EF4444',
      'Fill Blanks': '#06B6D4',
      'Matching': '#EC4899',
      'Ordering': '#6366F1',
      'Categorization': '#84CC16',
      'Drag & Drop': '#F97316'
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
        color: typeColors[type] || '#8B5CF6'
      }))
      .sort((a, b) => b.count - a.count);

    setDifficultyBreakdown(typeData);
  }, [selectedTypeGrade, allQuestions]);

  // Refetch on focus and interval
  useEffect(() => {
    const handleFocus = () => {
      if (user?.uid) fetchDashboardData();
    };
    window.addEventListener('focus', handleFocus);
    const interval = setInterval(() => {
      if (user?.uid && document.visibilityState === 'visible') fetchDashboardData();
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
      const questionsRef = collection(db, 'questions', 'oup', 'items');
      const q = query(questionsRef, where('createdBy', '==', user.uid));
      const snapshot = await getDocs(q);

      const questions = snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data } as any;
      });

      const totalQuestions = questions.length;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeekQuestions = questions.filter(q => {
        const createdAt = q.createdAt?.toDate ? q.createdAt.toDate() : new Date(q.createdAt);
        return createdAt >= oneWeekAgo;
      }).length;

      // last 4 weeks trend (created only; approved static 0 just for legend)
      const weekData: any[] = [];
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

      setAllQuestions(questions);

      const filteredQuestions = selectedDifficultyGrade === 'overall'
        ? questions
        : questions.filter(q => normalizeGrade(q.grade) === selectedDifficultyGrade);

      const difficultyCounts: { [key: string]: number } = { Easy: 0, Medium: 0, Hard: 0 };
      filteredQuestions.forEach(q => {
        const difficulty = q.difficulty || 'Medium';
        if (difficultyCounts[difficulty] !== undefined) difficultyCounts[difficulty]++;
      });

      const difficultyColors = { Easy: '#10B981', Medium: '#F59E0B', Hard: '#EF4444' };
      const difficultyPieData = Object.entries(difficultyCounts).map(([level, count]) => ({
        subject: level,
        count,
        color: difficultyColors[level as keyof typeof difficultyColors]
      }));
      setSubjectDistribution(difficultyPieData);

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
          const timeAgo = days > 0 ? `${days} day${days > 1 ? 's' : ''} ago`
            : hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ago`
            : 'Just now';

          return {
            id: q.id,
            text: q.questionText || q.question || 'No question text',
            subject: q.subject || 'N/A',
            grade: q.grade || 'N/A',
            difficulty: q.difficulty || 'Medium',
            status: 'approved',
            time: timeAgo
          };
        });
      setRecentQuestions(sortedQuestions);

      setStats({
        questionsCreated: totalQuestions,
        questionsApproved: totalQuestions,
        pendingReview: 0,
        rejectedQuestions: 0,
        thisWeek: thisWeekQuestions,
        approvalRate: 100
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F5F8FF]">
        <Sidebar userRole="Content Creator" currentPage="dashboard" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 xl:pl-[256px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003087] mx-auto mb-4"></div>
            <p className="text-[#003087]">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F5F8FF]">
      <Sidebar userRole="Content Creator" currentPage="dashboard" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 xl:pl-[256px] min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-[#D0DAF5] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="xl:hidden w-10 h-10 flex items-center justify-center text-[#003087]"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-[#003087]">Content Creator Dashboard</h1>
          <div className="w-10 h-10" />
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 xl:p-8 w-full">
          {/* Welcome Section */}
          <div className="relative bg-[#EAF2FF] border border-[#C9D9FF] rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 text-[#003087] shadow">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#003087] text-white rounded-xl flex items-center justify-center">
                <i className="ri-quill-pen-line text-2xl"></i>
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Welcome back, {user?.name || 'Creator'}!</h2>
                <p className="text-[#244986] mt-1">Here is an overview of your question creation workplace.</p>
              </div>
            </div>
          </div>

          {/* KPI Cards Row — rearranged like screenshot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-6">
            {/* 1. Questions Created */}
            <div className="bg-white border border-[#D0DAF5] rounded-xl p-5 shadow hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-[#003087] rounded-lg flex items-center justify-center text-white">
                  <i className="ri-file-list-3-line text-2xl"></i>
                </div>
                <div className="px-2 py-1 bg-[#EAF2FF] text-[#003087] text-xs font-bold rounded-full border border-[#C9D9FF]">
                  TOTAL
                </div>
              </div>
              <h3 className="text-3xl font-extrabold text-[#003087]">{stats.questionsCreated}</h3>
              <p className="text-sm text-[#4A5568] mt-1">Questions Created</p>
            </div>

            {/* 2. Created This Week */}
            <div className="bg-white border border-[#D0DAF5] rounded-xl p-5 shadow hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-[#003087] rounded-lg flex items-center justify-center text-white">
                  <i className="ri-calendar-check-line text-2xl"></i>
                </div>
                <div className="px-2 py-1 bg-[#EAF2FF] text-[#003087] text-xs font-bold rounded-full border border-[#C9D9FF]">
                  7 DAYS
                </div>
              </div>
              <h3 className="text-3xl font-extrabold text-[#003087]">{stats.thisWeek}</h3>
              <p className="text-sm text-[#4A5568] mt-1">Created This Week</p>
            </div>

            {/* 3. Questions Approved */}
            <div className="bg-white border border-[#D0DAF5] rounded-xl p-5 shadow hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-[#0054A6] rounded-lg flex items-center justify-center text-white">
                  <i className="ri-checkbox-circle-line text-2xl"></i>
                </div>
                <div className="px-2 py-1 bg-[#FDF7CC] text-[#5C4A00] text-xs font-bold rounded-full border border-[#FFE680]">
                  {stats.approvalRate}%
                </div>
              </div>
              <h3 className="text-3xl font-extrabold text-[#003087]">{stats.questionsApproved}</h3>
              <p className="text-sm text-[#4A5568] mt-1">Questions Approved</p>
            </div>

            {/* 4. Pending Review */}
            <div className="bg-white border border-[#D0DAF5] rounded-xl p-5 shadow hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-[#244986] rounded-lg flex items-center justify-center text-white">
                  <i className="ri-time-line text-2xl"></i>
                </div>
                <div className="px-2 py-1 bg-[#EAF2FF] text-[#003087] text-xs font-bold rounded-full border border-[#C9D9FF]">
                  REVIEW
                </div>
              </div>
              <h3 className="text-3xl font-extrabold text-[#003087]">{stats.pendingReview}</h3>
              <p className="text-sm text-[#4A5568] mt-1">Pending Review</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 mb-6">
            {/* Left column - stacked: Creation Trend then Type Distribution */}
            <div className="space-y-4 md:space-y-6">
              {/* Creation Trend */}
              <div className="bg-white border border-[#D0DAF5] rounded-xl p-5 shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0054A6] rounded-lg flex items-center justify-center text-white">
                      <i className="ri-line-chart-line"></i>
                    </div>
                    <h3 className="text-lg font-bold text-[#003087]">Question Creation Trend</h3>
                  </div>
                  <div className="text-[#244986] text-sm">→</div>
                </div>
                <div className="w-full overflow-hidden">
                  <ResponsiveContainer width="100%" height={220} minHeight={200}>
                    <AreaChart data={creationTrendData}>
                      <defs>
                        <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0054A6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0054A6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3EAFD" />
                      <XAxis dataKey="week" stroke="#6B7280" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #D0DAF5', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="created" stroke="#0054A6" strokeWidth={2} fillOpacity={1} fill="url(#colorCreated)" name="Created" />
                      <Area type="monotone" dataKey="approved" stroke="#10B981" strokeWidth={2} fillOpacity={0} fill="none" name="Approved" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Question Type Distribution */}
              <div className="bg-white border border-[#D0DAF5] rounded-xl p-5 shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0054A6] rounded-lg flex items-center justify-center text-white">
                      <i className="ri-bar-chart-box-line"></i>
                    </div>
                    <h3 className="text-lg font-bold text-[#003087]">Question Type Distribution</h3>
                  </div>

                  <select
                    value={selectedTypeGrade}
                    onChange={(e) => setSelectedTypeGrade(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-[#D0DAF5] rounded-lg focus:ring-2 focus:ring-[#0054A6] focus:border-[#0054A6] bg-white text-[#244986]"
                  >
                    <option value="overall">All Grades</option>
                    {availableGrades.map(grade => (
                      <option key={grade} value={grade}>Grade {grade}</option>
                    ))}
                  </select>
                </div>

                <div className="w-full overflow-hidden">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={difficultyBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3EAFD" />
                      <XAxis dataKey="level" stroke="#6B7280" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #D0DAF5', borderRadius: '8px' }} />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Questions">
                        {difficultyBreakdown.map((entry, index) => {
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

            {/* Right Column - Difficulty Pie */}
            <div className="bg-white border border-[#D0DAF5] rounded-xl p-5 shadow flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0054A6] rounded-lg flex items-center justify-center text-white">
                    <i className="ri-pie-chart-2-line"></i>
                  </div>
                  <h3 className="text-lg font-bold text-[#003087]">Questions by Difficulty</h3>
                </div>

                <select
                  value={selectedDifficultyGrade}
                  onChange={(e) => setSelectedDifficultyGrade(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-[#D0DAF5] rounded-lg focus:ring-2 focus:ring-[#0054A6] focus:border-[#0054A6] bg-white text-[#244986]"
                >
                  <option value="overall">All Grades</option>
                  {availableGrades.map(grade => (
                    <option key={grade} value={grade}>Grade {grade}</option>
                  ))}
                </select>
              </div>

              <div className="w-full overflow-hidden flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%" minHeight={360}>
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
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #D0DAF5', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 space-y-2">
                {subjectDistribution.map((difficulty, index) => {
                  const total = subjectDistribution.reduce((sum, item) => sum + item.count, 0);
                  const percentage = total > 0 ? Math.round((difficulty.count / total) * 100) : 0;
                  return (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F5F8FF]">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: difficulty.color }}></div>
                        <span className="text-sm font-medium text-[#244986]">{difficulty.subject}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#003087]">{difficulty.count}</span>
                        <span className="text-xs text-[#244986] bg-[#EAF2FF] px-2 py-1 rounded-full border border-[#C9D9FF]">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Questions */}
          <div className="bg-white border border-[#D0DAF5] rounded-xl p-5 shadow">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-[#003087] rounded-lg flex items-center justify-center text-white">
                  <i className="ri-article-line"></i>
                </div>
                <h3 className="text-lg font-bold text-[#003087] truncate">Recent Questions</h3>
              </div>
              <button className="min-w-[44px] min-h-[36px] px-4 py-2 text-[#003087] hover:text-white text-sm font-semibold bg-[#EAF2FF] hover:bg-[#003087] rounded-lg border border-[#C9D9FF] transition">
                View All →
              </button>
            </div>

            <div className="space-y-3">
              {recentQuestions.map((question) => (
                <div key={question.id} className="group border border-[#E3EAFD] rounded-lg p-4 hover:border-[#C9D9FF] hover:shadow-sm transition bg-white">
                  {/* Mobile */}
                  <div className="block sm:hidden">
                    <p className="text-sm font-semibold text-[#003087] mb-3 line-clamp-2">{question.text}</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <span className="px-2 py-1 bg-[#EAF2FF] text-[#003087] text-xs rounded border border-[#C9D9FF]">{question.subject}</span>
                      <span className="px-2 py-1 bg-[#F5F8FF] text-[#244986] text-xs rounded border border-[#E3EAFD]">{question.grade}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-1">
                      <span className={`px-2 py-1 text-xs rounded text-center ${
                        question.difficulty === 'Easy' ? 'bg-green-50 text-green-700 border border-green-200' :
                        question.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {question.difficulty}
                      </span>
                      <span className="px-2 py-1 text-xs text-[#6B7280] text-center">{question.time}</span>
                      <div className={`px-2 py-1 rounded-full text-xs font-semibold text-center ${
                        question.status === 'approved' ? 'bg-green-100 text-green-700' :
                        question.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {question.status === 'approved' ? '✓' : question.status === 'pending' ? '⏳' : '✗'}
                      </div>
                    </div>
                  </div>

                  {/* Tablet+ */}
                  <div className="hidden sm:flex sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#003087] mb-2 line-clamp-2">{question.text}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-1 bg-[#EAF2FF] text-[#003087] text-xs rounded border border-[#C9D9FF]">{question.subject}</span>
                        <span className="px-2 py-1 bg-[#F5F8FF] text-[#244986] text-xs rounded border border-[#E3EAFD]">{question.grade}</span>
                        <span className={`px-2 py-1 text-xs rounded border ${
                          question.difficulty === 'Easy' ? 'bg-green-50 text-green-700 border-green-200' :
                          question.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {question.difficulty}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className="text-xs text-[#6B7280] whitespace-nowrap">{question.time}</p>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        question.status === 'approved' ? 'bg-green-100 text-green-700' :
                        question.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {question.status.charAt(0).toUpperCase() + question.status.slice(1)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {recentQuestions.length === 0 && (
                <div className="text-center text-[#244986] py-6 border border-dashed border-[#D0DAF5] rounded-lg bg-[#F5F8FF]">
                  No recent questions yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
