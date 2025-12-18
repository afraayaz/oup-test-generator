'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ModeratorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats] = useState({
    pendingReview: 34,
    approvedToday: 18,
    rejectedToday: 6,
    avgReviewTime: 3.5,
    qualityScore: 92,
    totalReviewed: 248
  });

  const [reviewTrendData] = useState([
    { day: 'Mon', reviewed: 42, approved: 35, rejected: 7 },
    { day: 'Tue', reviewed: 38, approved: 32, rejected: 6 },
    { day: 'Wed', reviewed: 45, approved: 38, rejected: 7 },
    { day: 'Thu', reviewed: 51, approved: 42, rejected: 9 },
    { day: 'Fri', reviewed: 48, approved: 40, rejected: 8 }
  ]);

  const [qualityDistribution] = useState([
    { name: 'Excellent', value: 112, color: '#10B981' },
    { name: 'Good', value: 89, color: '#3B82F6' },
    { name: 'Needs Work', value: 34, color: '#F59E0B' },
    { name: 'Poor', value: 13, color: '#EF4444' }
  ]);

  const [subjectReview] = useState([
    { subject: 'Mathematics', pending: 12, approved: 45, rejected: 8 },
    { subject: 'Science', pending: 8, approved: 38, rejected: 5 },
    { subject: 'English', pending: 7, approved: 42, rejected: 6 },
    { subject: 'History', pending: 4, approved: 28, rejected: 3 },
    { subject: 'Geography', pending: 3, approved: 22, rejected: 2 }
  ]);

  const [recentReviews] = useState([
    { id: 1, question: 'What is the Pythagorean theorem?', subject: 'Mathematics', grade: 'Grade 9', creator: 'John Smith', status: 'approved', time: '5 mins ago' },
    { id: 2, question: 'Explain the process of photosynthesis', subject: 'Science', grade: 'Grade 7', creator: 'Emily Brown', status: 'approved', time: '12 mins ago' },
    { id: 3, question: 'Who wrote "Pride and Prejudice"?', subject: 'English', grade: 'Grade 10', creator: 'Sarah Wilson', status: 'rejected', time: '18 mins ago' },
    { id: 4, question: 'What caused the French Revolution?', subject: 'History', grade: 'Grade 11', creator: 'David Lee', status: 'approved', time: '25 mins ago' }
  ]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="Moderator" currentPage="dashboard" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 lg:ml-[256px]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>

          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">Content Moderator Dashboard</h1>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs sm:text-sm font-semibold text-gray-900">Lisa Martinez</div>
              <div className="text-xs text-gray-500">Content Manager</div>
            </div>
            <div className="min-w-[44px] min-h-[44px] w-11 h-11 bg-teal-100 rounded-full flex items-center justify-center">
              <span className="text-teal-600 font-semibold text-sm">LM</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 text-white shadow-lg">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">Welcome, Lisa! 🔍</h2>
            <p className="text-sm sm:text-base text-teal-50">Your content quality control center</p>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Pending Review */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <i className="ri-time-line text-2xl text-orange-600"></i>
                </div>
                <span className="px-2 py-1 bg-orange-50 text-orange-600 text-xs font-semibold rounded-full">
                  Urgent
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.pendingReview}</h3>
              <p className="text-sm text-gray-500">Pending Review</p>
            </div>

            {/* Approved Today */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="ri-checkbox-circle-line text-2xl text-green-600"></i>
                </div>
                <span className="px-2 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-full">
                  Today
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.approvedToday}</h3>
              <p className="text-sm text-gray-500">Approved Today</p>
            </div>

            {/* Rejected Today */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <i className="ri-close-circle-line text-2xl text-red-600"></i>
                </div>
                <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-full">
                  Today
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.rejectedToday}</h3>
              <p className="text-sm text-gray-500">Rejected Today</p>
            </div>

            {/* Quality Score */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                  <i className="ri-star-line text-2xl text-teal-600"></i>
                </div>
                <span className="px-2 py-1 bg-teal-50 text-teal-600 text-xs font-semibold rounded-full">
                  Excellent
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.qualityScore}%</h3>
              <p className="text-sm text-gray-500">Quality Score</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Review Trend */}
            <div className="lg:col-span-2 bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">Review Activity Trend</h3>
              <div className="w-full overflow-hidden">
                <ResponsiveContainer width="100%" height={250}>
                <LineChart data={reviewTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="day" stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="approved" stroke="#10B981" strokeWidth={2} name="Approved" />
                  <Line type="monotone" dataKey="rejected" stroke="#EF4444" strokeWidth={2} name="Rejected" />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>

            {/* Quality Distribution */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">Quality Distribution</h3>
              <div className="w-full overflow-hidden">
                <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={qualityDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {qualityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {qualityDistribution.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Subject Review Status */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">Review Status by Subject</h3>
            <div className="w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subjectReview}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="subject" stroke="#6B7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
                <Bar dataKey="pending" fill="#F59E0B" radius={[8, 8, 0, 0]} name="Pending" />
                <Bar dataKey="approved" fill="#10B981" radius={[8, 8, 0, 0]} name="Approved" />
                <Bar dataKey="rejected" fill="#EF4444" radius={[8, 8, 0, 0]} name="Rejected" />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Reviews */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Recent Reviews</h3>
              <button className="min-w-[44px] min-h-[44px] px-3 py-2 text-teal-600 hover:text-teal-700 text-sm font-medium hover:bg-teal-50 rounded-lg transition-colors">
                View All
              </button>
            </div>
            
            <div className="space-y-3">
              {recentReviews.map((review) => (
                <div key={review.id} className="border border-gray-200 rounded-lg p-4 hover:border-teal-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-2">{review.question}</p>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">{review.subject}</span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">{review.grade}</span>
                        <span className="text-xs text-gray-500">by {review.creator}</span>
                      </div>
                      <p className="text-xs text-gray-400">{review.time}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      review.status === 'approved' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 sm:mt-8 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 sm:p-6 border border-teal-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 sm:mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button className="min-w-[44px] min-h-[44px] px-4 py-3 bg-white hover:bg-teal-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-teal-300">
                <i className="ri-file-check-line mr-2"></i>Review Queue
              </button>
              <button className="min-w-[44px] min-h-[44px] px-4 py-3 bg-white hover:bg-teal-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-teal-300">
                <i className="ri-bar-chart-line mr-2"></i>Quality Report
              </button>
              <button className="min-w-[44px] min-h-[44px] px-4 py-3 bg-white hover:bg-teal-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-teal-300">
                <i className="ri-alert-line mr-2"></i>Flag Issues
              </button>
              <button className="min-w-[44px] min-h-[44px] px-4 py-3 bg-white hover:bg-teal-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-teal-300">
                <i className="ri-settings-line mr-2"></i>Review Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
