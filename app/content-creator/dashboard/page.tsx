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

  useEffect(() => {
    if (user?.uid) {
      fetchDashboardData();
    }
  }, [user?.uid]);

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
        };
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

      // Calculate subject distribution
      const subjectCounts: { [key: string]: number } = {};
      questions.forEach(q => {
        const subject = q.subject || 'Others';
        subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
      });
      
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899'];
      const subjectData = Object.entries(subjectCounts).map(([subject, count], index) => ({
        subject,
        count,
        color: colors[index % colors.length]
      }));
      setSubjectDistribution(subjectData);

      // Calculate difficulty breakdown
      const difficultyCounts: { [key: string]: number } = { Easy: 0, Medium: 0, Hard: 0 };
      questions.forEach(q => {
        const difficulty = q.difficulty || 'Medium';
        if (difficultyCounts[difficulty] !== undefined) {
          difficultyCounts[difficulty]++;
        }
      });
      
      const difficultyData = [
        { level: 'Easy', count: difficultyCounts.Easy, target: Math.ceil(totalQuestions * 0.3) },
        { level: 'Medium', count: difficultyCounts.Medium, target: Math.ceil(totalQuestions * 0.5) },
        { level: 'Hard', count: difficultyCounts.Hard, target: Math.ceil(totalQuestions * 0.2) }
      ];
      setDifficultyBreakdown(difficultyData);

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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="Content Creator" currentPage="dashboard" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 lg:ml-[256px]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>

          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">Content Creator Dashboard</h1>
          <div className="w-11 h-11"></div>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-violet-500 to-violet-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 text-white shadow-lg">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">Welcome, {user?.name || 'Content Creator'}! ✍️</h2>
            <p className="text-sm sm:text-base text-violet-50">Your question creation workspace</p>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Questions Created */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                  <i className="ri-file-list-line text-2xl text-violet-600"></i>
                </div>
                <span className="px-2 py-1 bg-violet-50 text-violet-600 text-xs font-semibold rounded-full">
                  Total
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.questionsCreated}</h3>
              <p className="text-sm text-gray-500">Questions Created</p>
            </div>

            {/* Approved Questions */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="ri-checkbox-circle-line text-2xl text-green-600"></i>
                </div>
                <span className="px-2 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-full">
                  {stats.approvalRate}%
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.questionsApproved}</h3>
              <p className="text-sm text-gray-500">Approved Questions</p>
            </div>

            {/* Pending Review */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <i className="ri-time-line text-2xl text-orange-600"></i>
                </div>
                <span className="px-2 py-1 bg-orange-50 text-orange-600 text-xs font-semibold rounded-full">
                  Review
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.pendingReview}</h3>
              <p className="text-sm text-gray-500">Pending Review</p>
            </div>

            {/* This Week */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="ri-calendar-line text-2xl text-blue-600"></i>
                </div>
                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">
                  Week
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.thisWeek}</h3>
              <p className="text-sm text-gray-500">Created This Week</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Creation Trend */}
            <div className="lg:col-span-2 bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">Question Creation Trend</h3>
              <div className="w-full overflow-hidden">
                <ResponsiveContainer width="100%" height={250}>
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

            {/* Subject Distribution */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">Questions by Subject</h3>
              <div className="w-full overflow-hidden">
                <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={subjectDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
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
                {subjectDistribution.map((subject, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }}></div>
                      <span className="text-sm text-gray-600">{subject.subject}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{subject.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Difficulty Breakdown */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">Question Difficulty Distribution</h3>
            <div className="w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={200}>
              <BarChart data={difficultyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="level" stroke="#6B7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#8B5CF6" radius={[8, 8, 0, 0]} name="Created" />
                <Bar dataKey="target" fill="#E5E7EB" radius={[8, 8, 0, 0]} name="Target" />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Questions */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Recent Questions</h3>
              <button className="min-w-[44px] min-h-[44px] px-3 py-2 text-violet-600 hover:text-violet-700 text-xs sm:text-sm font-medium hover:bg-violet-50 rounded-lg transition-colors flex-shrink-0">
                View All
              </button>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {recentQuestions.map((question) => (
                <div key={question.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-violet-300 hover:shadow-sm transition-all">
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

          {/* Quick Actions */}
          <div className="mt-6 sm:mt-8 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 sm:p-6 border border-violet-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 sm:mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <button className="min-w-[44px] min-h-[44px] px-2 sm:px-4 py-2 sm:py-3 bg-white hover:bg-violet-50 text-gray-700 text-xs sm:text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-violet-300 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                <i className="ri-file-add-line text-base sm:text-lg"></i>
                <span className="text-center">Create</span>
              </button>
              <button className="min-w-[44px] min-h-[44px] px-2 sm:px-4 py-2 sm:py-3 bg-white hover:bg-violet-50 text-gray-700 text-xs sm:text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-violet-300 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                <i className="ri-draft-line text-base sm:text-lg"></i>
                <span className="text-center">Drafts</span>
              </button>
              <button className="min-w-[44px] min-h-[44px] px-2 sm:px-4 py-2 sm:py-3 bg-white hover:bg-violet-50 text-gray-700 text-xs sm:text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-violet-300 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                <i className="ri-database-line text-base sm:text-lg"></i>
                <span className="text-center">Bank</span>
              </button>
              <button className="min-w-[44px] min-h-[44px] px-2 sm:px-4 py-2 sm:py-3 bg-white hover:bg-violet-50 text-gray-700 text-xs sm:text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-violet-300 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                <i className="ri-bar-chart-line text-base sm:text-lg"></i>
                <span className="text-center">Analytics</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
