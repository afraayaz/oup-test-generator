'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ContentCreatorDashboard() {
  const { user } = useUserProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats] = useState({
    questionsCreated: 156,
    questionsApproved: 98,
    pendingReview: 34,
    rejectedQuestions: 24,
    thisWeek: 18,
    approvalRate: 78
  });

  const [creationTrendData] = useState([
    { week: 'Week 1', created: 22, approved: 18, rejected: 4 },
    { week: 'Week 2', created: 28, approved: 21, rejected: 7 },
    { week: 'Week 3', created: 35, approved: 28, rejected: 7 },
    { week: 'Week 4', created: 31, approved: 25, rejected: 6 }
  ]);

  const [subjectDistribution] = useState([
    { subject: 'Mathematics', count: 45, color: '#3B82F6' },
    { subject: 'Science', count: 38, color: '#10B981' },
    { subject: 'English', count: 32, color: '#F59E0B' },
    { subject: 'History', count: 25, color: '#8B5CF6' },
    { subject: 'Others', count: 16, color: '#EF4444' }
  ]);

  const [difficultyBreakdown] = useState([
    { level: 'Easy', count: 62, target: 50 },
    { level: 'Medium', count: 58, target: 60 },
    { level: 'Hard', count: 36, target: 40 }
  ]);

  const [recentQuestions] = useState([
    { id: 1, text: 'Explain the Pythagorean theorem with examples', subject: 'Mathematics', grade: 'Grade 9', difficulty: 'Medium', status: 'approved', time: '2 hours ago' },
    { id: 2, text: 'What is photosynthesis? Describe the process', subject: 'Science', grade: 'Grade 7', difficulty: 'Easy', status: 'pending', time: '5 hours ago' },
    { id: 3, text: 'Analyze the themes in "To Kill a Mockingbird"', subject: 'English', grade: 'Grade 11', difficulty: 'Hard', status: 'pending', time: '1 day ago' },
    { id: 4, text: 'What were the causes of World War I?', subject: 'History', grade: 'Grade 10', difficulty: 'Medium', status: 'rejected', time: '2 days ago' }
  ]);

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
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Recent Questions</h3>
              <button className="min-w-[44px] min-h-[44px] px-3 py-2 text-violet-600 hover:text-violet-700 text-sm font-medium hover:bg-violet-50 rounded-lg transition-colors">
                View All
              </button>
            </div>
            
            <div className="space-y-3">
              {recentQuestions.map((question) => (
                <div key={question.id} className="border border-gray-200 rounded-lg p-4 hover:border-violet-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-2">{question.text}</p>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
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
                      <p className="text-xs text-gray-400">{question.time}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ml-3 ${
                      question.status === 'approved' ? 'bg-green-100 text-green-700' :
                      question.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {question.status.charAt(0).toUpperCase() + question.status.slice(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 sm:mt-8 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 sm:p-6 border border-violet-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 sm:mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button className="min-w-[44px] min-h-[44px] px-4 py-3 bg-white hover:bg-violet-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-violet-300">
                <i className="ri-file-add-line mr-2"></i>Create Question
              </button>
              <button className="min-w-[44px] min-h-[44px] px-4 py-3 bg-white hover:bg-violet-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-violet-300">
                <i className="ri-draft-line mr-2"></i>View Drafts
              </button>
              <button className="min-w-[44px] min-h-[44px] px-4 py-3 bg-white hover:bg-violet-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-violet-300">
                <i className="ri-database-line mr-2"></i>Question Bank
              </button>
              <button className="min-w-[44px] min-h-[44px] px-4 py-3 bg-white hover:bg-violet-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-violet-300">
                <i className="ri-bar-chart-line mr-2"></i>My Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
