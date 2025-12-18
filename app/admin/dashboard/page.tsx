'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebase';
import Sidebar from '@/components/Sidebar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useUserProfile();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      // For now, if user is authenticated, allow access to admin dashboard
      // Proper role-based access control can be added later with better security rules
      setIsAuthorized(true);
    });

    return () => unsubscribe();
  }, [router]);
  const [stats] = useState({
    totalUsers: 1247,
    totalUsersGrowth: 12,
    questionsPending: 23,
    schoolsActive: 15,
    activeQuizzes: 89,
    activeQuizzesGrowth: 8,
    avgApprovalTime: 2.4,
    contentQuality: 94
  });

  const [chartData] = useState([
    { month: 'Jan', users: 450, quizzes: 280 },
    { month: 'Feb', users: 580, quizzes: 380 },
    { month: 'Mar', users: 720, quizzes: 480 },
    { month: 'Apr', users: 890, quizzes: 620 },
    { month: 'May', users: 1020, quizzes: 750 },
    { month: 'Jun', users: 1180, quizzes: 880 },
    { month: 'July', users: 1247, quizzes: 1020 }
  ]);

  const [contentPipelineData] = useState([
    { name: 'Submitted', value: 156, color: '#3B82F6' },
    { name: 'Approved', value: 98, color: '#10B981' },
    { name: 'Rejected', value: 24, color: '#EF4444' },
    { name: 'Pending', value: 34, color: '#F59E0B' }
  ]);

  const [userRolesData] = useState([
    { name: 'Students', value: 1089, color: '#8B5CF6' },
    { name: 'Teachers', value: 143, color: '#F59E0B' },
    { name: 'Admins', value: 15, color: '#10B981' }
  ]);

  const [pendingApprovals] = useState([
    { id: 1, type: 'question', subject: 'Mathematics', grade: 'Grade 10', items: 15, teacher: 'Sarah Johnson', time: '2 hours ago', status: 'review' },
    { id: 2, type: 'quiz', subject: 'Physics', grade: 'Grade 11', items: 1, teacher: 'Michael Chen', time: '4 hours ago', status: 'review' },
    { id: 3, type: 'question', subject: 'Chemistry', grade: 'Grade 9', items: 8, teacher: 'Emma Davis', time: '6 hours ago', status: 'review' }
  ]);

  const [recentActivities] = useState([
    { 
      id: 1, 
      type: 'teacher', 
      title: 'New teacher registered',
      description: 'Sarah Johnson joined Oxford High School', 
      time: '5 mins ago',
      actionable: false
    },
    { 
      id: 2, 
      type: 'questions', 
      title: 'Questions approved',
      description: '15 mathematics questions approved for Grade 10', 
      time: '9 mins ago',
      actionable: false
    },
    { 
      id: 3, 
      type: 'quiz', 
      title: 'Quiz created',
      description: 'Monthly Science Assessment for Grade 9', 
      time: '25 mins ago',
      actionable: false
    },
    { 
      id: 4, 
      type: 'school', 
      title: 'New school onboarded',
      description: 'Wellington Academy joined the platform', 
      time: '1 hour ago',
      actionable: false
    }
  ]);

  const handleApprove = (id: number) => {
    console.log('Approved:', id);
  };

  const handleReject = (id: number) => {
    console.log('Rejected:', id);
  };

  // Show loading while checking authentication
  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002147] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not authorized
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You do not have permission to access the admin dashboard.</p>
          <button
            onClick={() => router.push('/admin-setup')}
            className="bg-[#002147] hover:bg-[#1e3a8a] text-white py-2 px-4 rounded-lg transition"
          >
            Go to Admin Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="Admin" currentPage="dashboard" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 lg:ml-[256px]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>

          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">Admin Dashboard</h1>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 text-white shadow-lg">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">Welcome back, {user?.name || 'User'}! 👋</h2>
            <p className="text-sm sm:text-base text-emerald-50">Here's what's happening with your platform today</p>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Total Users */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <i className="ri-group-line text-2xl text-emerald-600"></i>
                </div>
                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full">
                  +{stats.totalUsersGrowth}%
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.totalUsers.toLocaleString()}</h3>
              <p className="text-sm text-gray-500">Total Users</p>
            </div>

            {/* Active Quizzes */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="ri-questionnaire-line text-2xl text-blue-600"></i>
                </div>
                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">
                  +{stats.activeQuizzesGrowth}%
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.activeQuizzes}</h3>
              <p className="text-sm text-gray-500">Active Quizzes</p>
            </div>

            {/* Questions Pending */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <i className="ri-time-line text-2xl text-orange-600"></i>
                </div>
                <span className="px-2 py-1 bg-orange-50 text-orange-600 text-xs font-semibold rounded-full">
                  Review
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.questionsPending}</h3>
              <p className="text-sm text-gray-500">Questions Pending</p>
            </div>

            {/* Schools Active */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i className="ri-building-line text-2xl text-purple-600"></i>
                </div>
                <span className="px-2 py-1 bg-purple-50 text-purple-600 text-xs font-semibold rounded-full">
                  Active
                </span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stats.schoolsActive}</h3>
              <p className="text-sm text-gray-500">Schools Active</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Platform Growth Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Platform Growth</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Quizzes</span>
                  </div>
                </div>
              </div>
              
              <div className="w-full overflow-hidden">
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorQuizzes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                    />
                    <Area type="monotone" dataKey="users" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                    <Area type="monotone" dataKey="quizzes" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorQuizzes)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* User Roles Distribution */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">User Distribution</h3>
              <div className="w-full overflow-hidden">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={userRolesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {userRolesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {userRolesData.map((role, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }}></div>
                      <span className="text-sm text-gray-600">{role.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{role.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content Pipeline Chart */}
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 sm:mb-6">Content Pipeline</h3>
            <div className="w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={contentPipelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {contentPipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Row: Approvals Queue & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Pending Approvals Queue */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Pending Approvals</h3>
                <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-semibold rounded-full">
                  {pendingApprovals.length} items
                </span>
              </div>
              
              <div className="space-y-3">
                {pendingApprovals.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900">{item.subject}</span>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                            {item.grade}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          {item.items} {item.type === 'question' ? 'questions' : 'quiz'} by {item.teacher}
                        </p>
                        <p className="text-xs text-gray-400">{item.time}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleApprove(item.id)}
                        className="flex-1 min-w-[44px] min-h-[44px] px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleReject(item.id)}
                        className="flex-1 min-w-[44px] min-h-[44px] px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                  View All
                </button>
              </div>
              
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      activity.type === 'teacher' ? 'bg-blue-100' : 
                      activity.type === 'questions' ? 'bg-emerald-100' : 
                      activity.type === 'quiz' ? 'bg-purple-100' : 
                      'bg-orange-100'
                    }`}>
                      <i className={`${
                        activity.type === 'teacher' ? 'ri-user-add-line text-blue-600' : 
                        activity.type === 'questions' ? 'ri-file-check-line text-emerald-600' : 
                        activity.type === 'quiz' ? 'ri-file-list-line text-purple-600' : 
                        'ri-building-line text-orange-600'
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
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions - Optional Footer */}
          <div className="mt-6 sm:mt-8 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4 sm:p-6 border border-emerald-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <button className="min-w-[44px] min-h-[44px] px-4 py-3 bg-white hover:bg-emerald-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-emerald-300">
                <i className="ri-user-add-line mr-2"></i>Invite School
              </button>
              <button className="min-w-[44px] min-h-[44px] px-4 py-3 bg-white hover:bg-emerald-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-emerald-300">
                <i className="ri-file-check-line mr-2"></i>Review Questions
              </button>
              <button className="min-w-[44px] min-h-[44px] px-4 py-3 bg-white hover:bg-emerald-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-emerald-300">
                <i className="ri-notification-line mr-2"></i>Send Announcement
              </button>
              <button className="min-w-[44px] min-h-[44px] px-4 py-3 bg-white hover:bg-emerald-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200 hover:border-emerald-300">
                <i className="ri-settings-line mr-2"></i>Settings
              </button>
              <button 
                onClick={() => router.push('/admin/teacher-login-helper')}
                className="min-w-[44px] min-h-[44px] px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm font-medium rounded-lg transition-colors border border-purple-200 hover:border-purple-300"
              >
                <i className="ri-login-box-line mr-2"></i>Teacher Login
              </button>
              <button 
                onClick={() => router.push('/admin/debug')}
                className="min-w-[44px] min-h-[44px] px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg transition-colors border border-red-200 hover:border-red-300"
              >
                <i className="ri-bug-line mr-2"></i>Debug DB
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
