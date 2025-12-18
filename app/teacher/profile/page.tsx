'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

export default function TeacherProfile() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [personalInfo, setPersonalInfo] = useState({
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@school.edu',
    phone: '+1 (555) 123-4567',
    department: 'Science Department',
    employeeId: 'TCH-2024-001',
    joinDate: '2020-09-15',
    qualification: 'M.Sc. Biology, B.Ed.',
    specialization: 'Biology, Chemistry'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const assignedBooks = [
    { id: 1, title: 'Advanced Biology', subject: 'Biology', grade: 'Grade 12', status: 'Active', chapters: 12, questions: 145 },
    { id: 2, title: 'Chemistry Fundamentals', subject: 'Chemistry', grade: 'Grade 11', status: 'Active', chapters: 10, questions: 98 },
    { id: 3, title: 'Organic Chemistry', subject: 'Chemistry', grade: 'Grade 12', status: 'Draft', chapters: 8, questions: 67 },
  ];

  const activityLog = [
    { id: 1, action: 'Created quiz: Biology Chapter 5 Quiz', date: '2024-01-15 10:30 AM', type: 'Quiz' },
    { id: 2, action: 'Added 5 new questions to Chemistry Chapter 3', date: '2024-01-14 02:15 PM', type: 'Questions' },
    { id: 3, action: 'Updated profile information', date: '2024-01-13 09:45 AM', type: 'Profile' },
    { id: 4, action: 'Generated Full Biology Assessment', date: '2024-01-12 04:20 PM', type: 'Quiz' },
    { id: 5, action: 'Added new chapter: Human Physiology', date: '2024-01-11 11:10 AM', type: 'Content' },
  ];

  const handlePersonalInfoChange = (field: string, value: string) => {
    setPersonalInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const savePersonalInfo = () => {
    setIsEditing(false);
    // Here you would typically save to backend
    console.log('Saving personal info:', personalInfo);
  };

  const changePassword = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }
    // Here you would typically update password via backend
    console.log('Changing password');
    setShowPasswordModal(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    alert('Password changed successfully!');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="Teacher" currentPage="profile" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
        <div className="flex-1 overflow-auto lg:ml-64">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                aria-label="Open menu"
              >
                <i className="ri-menu-line text-2xl"></i>
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Profile Management</h1>
                <p className="text-sm sm:text-base text-gray-600">Manage your personal information and account settings</p>
              </div>
            </div>
          </div>

          {/* Profile Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="min-w-[80px] w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                {personalInfo.firstName[0]}{personalInfo.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {personalInfo.firstName} {personalInfo.lastName}
                </h2>
                <p className="text-sm sm:text-base text-gray-600">{personalInfo.department}</p>
                <p className="text-xs sm:text-sm text-gray-500">Employee ID: {personalInfo.employeeId}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="min-w-[44px] min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg cursor-pointer whitespace-nowrap flex items-center justify-center"
                >
                  <i className="ri-edit-line mr-2"></i>
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="min-w-[44px] min-h-[44px] bg-gray-600 hover:bg-gray-700 text-white font-medium py-2.5 px-4 rounded-lg cursor-pointer whitespace-nowrap flex items-center justify-center"
                >
                  <i className="ri-lock-line mr-2"></i>
                  Change Password
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('personal')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                    activeTab === 'personal'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Personal Information
                </button>
                <button
                  onClick={() => setActiveTab('books')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                    activeTab === 'books'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Assigned Books
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                    activeTab === 'activity'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Activity Log
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Personal Information Tab */}
              {activeTab === 'personal' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        value={personalInfo.firstName}
                        onChange={(e) => handlePersonalInfoChange('firstName', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={personalInfo.lastName}
                        onChange={(e) => handlePersonalInfoChange('lastName', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={personalInfo.email}
                        onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={personalInfo.phone}
                        onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                      <input
                        type="text"
                        value={personalInfo.department}
                        disabled={true}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                      <input
                        type="text"
                        value={personalInfo.employeeId}
                        disabled={true}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Join Date</label>
                      <input
                        type="date"
                        value={personalInfo.joinDate}
                        disabled={true}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                      <input
                        type="text"
                        value={personalInfo.specialization}
                        onChange={(e) => handlePersonalInfoChange('specialization', e.target.value)}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Qualification</label>
                    <textarea
                      value={personalInfo.qualification}
                      onChange={(e) => handlePersonalInfoChange('qualification', e.target.value)}
                      disabled={!isEditing}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                  
                  {isEditing && (
                    <div className="flex space-x-3">
                      <button
                        onClick={savePersonalInfo}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-save-line mr-2"></i>
                        Save Changes
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-close-line mr-2"></i>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Assigned Books Tab */}
              {activeTab === 'books' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Your Assigned Books</h3>
                    <span className="text-sm text-gray-600">{assignedBooks.length} books assigned</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Book Title</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Subject</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Grade</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Chapters</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Questions</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignedBooks.map((book) => (
                          <tr key={book.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-4 px-4">
                              <span className="font-medium text-gray-900">{book.title}</span>
                            </td>
                            <td className="py-4 px-4 text-gray-600">{book.subject}</td>
                            <td className="py-4 px-4 text-gray-600">{book.grade}</td>
                            <td className="py-4 px-4 text-gray-600">{book.chapters}</td>
                            <td className="py-4 px-4 text-gray-600">{book.questions}</td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                book.status === 'Active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {book.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Activity Log Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium cursor-pointer whitespace-nowrap">
                      View All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {activityLog.map((activity) => (
                      <div key={activity.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-200 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              activity.type === 'Quiz' ? 'bg-blue-100' :
                              activity.type === 'Questions' ? 'bg-green-100' :
                              activity.type === 'Profile' ? 'bg-purple-100' : 'bg-orange-100'
                            }`}>
                              <i className={`${
                                activity.type === 'Quiz' ? 'ri-file-list-3-line text-blue-600' :
                                activity.type === 'Questions' ? 'ri-question-answer-line text-green-600' :
                                activity.type === 'Profile' ? 'ri-user-line text-purple-600' : 'ri-book-line text-orange-600'
                              } text-sm`}></i>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{activity.action}</p>
                              <p className="text-sm text-gray-600">{activity.date}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            activity.type === 'Quiz' ? 'bg-blue-100 text-blue-800' :
                            activity.type === 'Questions' ? 'bg-green-100 text-green-800' :
                            activity.type === 'Profile' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {activity.type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Change Password Modal */}
          {showPasswordModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">Change Password</h3>
                    <button
                      onClick={() => setShowPasswordModal(false)}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <i className="ri-close-line text-2xl"></i>
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={changePassword}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-check-line mr-2"></i>
                      Update Password
                    </button>
                    <button
                      onClick={() => setShowPasswordModal(false)}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-close-line mr-2"></i>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}