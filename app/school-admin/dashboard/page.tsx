'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SchoolAdminDashboard() {
  const { user } = useUserProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalTeachers: 0,
    totalStudents: 0,
    totalUsers: 0,
    activeQuizzes: 0,
    avgSchoolScore: 0,
    testsThisMonth: 0,
    teacherGrowth: 0,
    studentGrowth: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.schoolId) {
      fetchDashboardData();
    }
  }, [user?.schoolId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/school-admin/dashboard-stats?schoolId=${encodeURIComponent(user?.schoolId || '')}`, {
        headers: {
          'x-user-role': user?.role || 'school_admin',
        },
        cache: 'no-store',
      });
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const payload = await response.json();
      setStats(payload?.stats || {
        totalTeachers: 0,
        totalStudents: 0,
        totalUsers: 0,
        activeQuizzes: 0,
        avgSchoolScore: 0,
        testsThisMonth: 0,
        teacherGrowth: 0,
        studentGrowth: 0,
      });
      setSubjectDistribution(Array.isArray(payload?.subjectDistribution) ? payload.subjectDistribution : []);
      setGradePerformance(Array.isArray(payload?.gradePerformance) ? payload.gradePerformance : []);
      setPerformanceData(Array.isArray(payload?.performanceData) ? payload.performanceData : []);
      setTopTeachers(Array.isArray(payload?.topTeachers) ? payload.topTeachers : []);
      setRecentActivity(Array.isArray(payload?.recentActivity) ? payload.recentActivity : []);
    } catch (error) {
      // no-op
    } finally {
      setLoading(false);
    }
  };

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [gradePerformance, setGradePerformance] = useState<any[]>([]);
  const [subjectDistribution, setSubjectDistribution] = useState<{ subject: string; tests: number; color: string }[]>([]);
  const [topTeachers, setTopTeachers] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="School Admin" currentPage="dashboard" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 lg:ml-[256px]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>

          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-indigo-600 font-gibson-semibold">School Admin Dashboard</h1>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 text-white shadow-lg">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">Welcome, {user?.name || 'Admin'}! 🏫</h2>
            <p className="text-sm sm:text-base text-indigo-50">Oxford High School Performance Overview</p>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Total Users */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="ri-group-2-line text-2xl text-blue-600"></i>
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{loading ? <i className="ri-loader-4-line animate-spin"></i> : stats.totalUsers}</h3>
              <p className="text-sm text-gray-500">Total Users</p>
            </div>

            {/* Avg School Score */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="ri-trophy-line text-2xl text-green-600"></i>
                </div>
                <span className="px-2 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-full">
                  {loading ? '-' : (stats.avgSchoolScore >= 80 ? 'Excellent' : stats.avgSchoolScore >= 70 ? 'Good' : 'Fair')}
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{loading ? <i className="ri-loader-4-line animate-spin"></i> : `${stats.avgSchoolScore}%`}</h3>
              <p className="text-sm text-gray-500">Avg School Score</p>
            </div>

            {/* Tests This Month */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i className="ri-file-list-3-line text-2xl text-purple-600"></i>
                </div>
                <span className="px-2 py-1 bg-purple-50 text-purple-600 text-xs font-semibold rounded-full">
                  This Month
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{loading ? <i className="ri-loader-4-line animate-spin"></i> : stats.testsThisMonth}</h3>
              <p className="text-sm text-gray-500">Tests Conducted</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* School Performance Trend */}
            <div className="lg:col-span-2 bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">School Performance Trend</h3>
              <div className="w-full overflow-hidden min-h-[250px] flex items-center justify-center">
                {loading || performanceData.length === 0 ? (
                  <i className="ri-loader-4-line text-3xl text-gray-300 animate-spin"></i>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="avgScore" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" name="Avg Score %" />
                  </AreaChart>
                </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Subject Distribution */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">Question Distribution by Subject</h3>
              <div className="w-full overflow-hidden min-h-[250px] flex items-center justify-center">
                {loading || subjectDistribution.length === 0 ? (
                  <i className="ri-loader-4-line text-3xl text-gray-300 animate-spin"></i>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={subjectDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="tests"
                      >
                        {subjectDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  </>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {subjectDistribution.map((subject, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }}></div>
                      <span className="text-sm text-gray-600">{subject.subject}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{subject.tests}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grade Performance Chart */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">Grade-wise Performance</h3>
            <div className="w-full overflow-hidden min-h-[200px] flex items-center justify-center">
              {loading || gradePerformance.length === 0 ? (
                <i className="ri-loader-4-line text-3xl text-gray-300 animate-spin"></i>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                <BarChart data={gradePerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="grade" stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
                  <Bar dataKey="avgScore" fill="#6366F1" radius={[8, 8, 0, 0]} name="Avg Score %" />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bottom Row: Top Teachers & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Top Performing Teachers */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Top Performing Teachers</h3>
                <button className="min-w-[44px] min-h-[44px] px-3 py-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium hover:bg-indigo-50 rounded-lg transition-colors">
                  View All
                </button>
              </div>
              
              <div className="space-y-3">
                {loading || topTeachers.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <i className="ri-loader-4-line text-2xl text-gray-300 animate-spin"></i>
                  </div>
                ) : (
                  topTeachers.map((teacher, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold text-sm">
                              {teacher.name.split(' ').map((n: string) => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{teacher.name}</p>
                            <p className="text-xs text-gray-500">{teacher.subject}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-indigo-600">{teacher.avgScore}%</p>
                          <p
                            className="text-xs text-gray-500"
                            title={
                              Array.isArray(teacher.breakdown) && teacher.breakdown.length > 0
                                ? teacher.breakdown
                                    .map((b: any) => `${b.subject} • ${b.grade}: ${b.quizzes}`)
                                    .join('\n')
                                : 'No subject/grade breakdown available'
                            }
                          >
                            {teacher.quizzes} quizzes
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Recent Activity</h3>
                <button className="min-w-[44px] min-h-[44px] px-3 py-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium hover:bg-indigo-50 rounded-lg transition-colors">
                  View All
                </button>
              </div>
              
              <div className="space-y-4">
                {loading || recentActivity.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <i className="ri-loader-4-line text-2xl text-gray-300 animate-spin"></i>
                  </div>
                ) : (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        activity.type === 'quiz' ? 'bg-purple-100' : 
                        activity.type === 'teacher' ? 'bg-blue-100' : 
                        activity.type === 'student' ? 'bg-indigo-100' : 
                        'bg-green-100'
                      }`}>
                        <i className={`${
                          activity.type === 'quiz' ? 'ri-file-list-line text-purple-600' : 
                          activity.type === 'teacher' ? 'ri-user-add-line text-blue-600' : 
                          activity.type === 'student' ? 'ri-group-line text-indigo-600' : 
                          'ri-trophy-line text-green-600'
                        } text-lg`}></i>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 mb-1">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-600 mb-1">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-400">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 sm:mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 sm:p-6 border border-indigo-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 sm:mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button className="min-w-[44px] min-h-[44px] px-4 py-3 bg-white hover:bg-indigo-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-indigo-300">
                <i className="ri-user-add-line mr-2"></i>Add Teacher
              </button>
              <button className="min-w-[44px] min-h-[44px] px-4 py-3 bg-white hover:bg-indigo-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-indigo-300">
                <i className="ri-group-line mr-2"></i>Enroll Students
              </button>
              <button className="min-w-[44px] min-h-[44px] px-4 py-3 bg-white hover:bg-indigo-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-indigo-300">
                <i className="ri-bar-chart-line mr-2"></i>View Reports
              </button>
              <button className="min-w-[44px] min-h-[44px] px-4 py-3 bg-white hover:bg-indigo-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-indigo-300">
                <i className="ri-settings-line mr-2"></i>School Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
