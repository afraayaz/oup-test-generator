'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

interface AdminProfile {
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  bio: string;
  joinDate: string;
  avatar: string;
}

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  userRegistration: boolean;
  emailNotifications: boolean;
  autoApproval: boolean;
  maxFileSize: number;
  sessionTimeout: number;
  backupFrequency: string;
}

interface SecuritySettings {
  twoFactorAuth: boolean;
  passwordExpiry: number;
  maxLoginAttempts: number;
  sessionDuration: number;
  ipWhitelist: string[];
}

export default function AdminProfile() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  const [adminProfile, setAdminProfile] = useState<AdminProfile>({
    name: 'John Smith',
    email: 'admin@school.edu',
    phone: '+1 (555) 123-4567',
    department: 'Administration',
    position: 'System Administrator',
    bio: 'Experienced system administrator with over 10 years of experience in educational technology and learning management systems.',
    joinDate: '2020-09-01',
    avatar: ''
  });

  const [editForm, setEditForm] = useState(adminProfile);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    siteName: 'Quiz Management System',
    siteDescription: 'Advanced quiz and assessment management platform for educational institutions',
    maintenanceMode: false,
    userRegistration: true,
    emailNotifications: true,
    autoApproval: false,
    maxFileSize: 50,
    sessionTimeout: 30,
    backupFrequency: 'daily'
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorAuth: true,
    passwordExpiry: 90,
    maxLoginAttempts: 5,
    sessionDuration: 8,
    ipWhitelist: ['192.168.1.0/24', '10.0.0.0/8']
  });

  const [newIpAddress, setNewIpAddress] = useState('');

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editForm.name || !editForm.email) {
      alert('Please fill in all required fields');
      return;
    }

    setAdminProfile(editForm);
    setIsEditing(false);
    alert('Profile updated successfully!');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswordModal(false);
    alert('Password changed successfully!');
  };

  const handleSystemSettingsUpdate = () => {
    alert('System settings updated successfully!');
  };

  const handleSecuritySettingsUpdate = () => {
    alert('Security settings updated successfully!');
  };

  const addIpAddress = () => {
    if (!newIpAddress) {
      alert('Please enter a valid IP address or range');
      return;
    }

    if (securitySettings.ipWhitelist.includes(newIpAddress)) {
      alert('This IP address is already in the whitelist');
      return;
    }

    setSecuritySettings(prev => ({
      ...prev,
      ipWhitelist: [...prev.ipWhitelist, newIpAddress]
    }));
    
    setNewIpAddress('');
    alert('IP address added to whitelist');
  };

  const removeIpAddress = (ip: string) => {
    setSecuritySettings(prev => ({
      ...prev,
      ipWhitelist: prev.ipWhitelist.filter(item => item !== ip)
    }));
    alert('IP address removed from whitelist');
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to default values? This action cannot be undone.')) {
      setSystemSettings({
        siteName: 'Quiz Management System',
        siteDescription: 'Advanced quiz and assessment management platform for educational institutions',
        maintenanceMode: false,
        userRegistration: true,
        emailNotifications: true,
        autoApproval: false,
        maxFileSize: 50,
        sessionTimeout: 30,
        backupFrequency: 'daily'
      });
      
      setSecuritySettings({
        twoFactorAuth: false,
        passwordExpiry: 90,
        maxLoginAttempts: 5,
        sessionDuration: 8,
        ipWhitelist: []
      });
      
      alert('Settings reset to default values');
    }
  };

  const PasswordModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
        
        <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              minLength={8}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              minLength={8}
              required
            />
          </div>
          
          <div className="flex space-x-3 mt-6">
            <button
              type="submit"
              className="flex-1 min-w-[44px] min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
            >
              Change Password
            </button>
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              className="flex-1 min-w-[44px] min-h-[44px] bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userRole="Admin" currentPage="profile" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 overflow-y-auto lg:ml-[256px]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>

          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Admin Profile & Settings</h1>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`min-w-[44px] min-h-[44px] px-4 py-2 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`min-w-[44px] min-h-[44px] px-4 py-2 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap ${
                activeTab === 'system'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              System Settings
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`min-w-[44px] min-h-[44px] px-4 py-2 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap ${
                activeTab === 'security'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Security
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                    {adminProfile.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{adminProfile.name}</h3>
                  <p className="text-gray-600 mb-2">{adminProfile.position}</p>
                  <p className="text-sm text-gray-500 mb-4">{adminProfile.department}</p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-center text-sm text-gray-600">
                      <i className="ri-mail-line w-4 h-4 mr-2"></i>
                      {adminProfile.email}
                    </div>
                    <div className="flex items-center justify-center text-sm text-gray-600">
                      <i className="ri-phone-line w-4 h-4 mr-2"></i>
                      {adminProfile.phone}
                    </div>
                    <div className="flex items-center justify-center text-sm text-gray-600">
                      <i className="ri-calendar-line w-4 h-4 mr-2"></i>
                      Joined {adminProfile.joinDate}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full min-w-[44px] min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="w-full min-w-[44px] min-h-[44px] bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      Change Password
                    </button>
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
                    {isEditing && (
                      <button
                        onClick={() => {
                          setEditForm(adminProfile);
                          setIsEditing(false);
                        }}
                        className="text-gray-500 hover:text-gray-700 cursor-pointer"
                      >
                        <i className="ri-close-line text-xl"></i>
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                          <input
                            type="tel"
                            value={editForm.phone}
                            onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                          <input
                            type="text"
                            value={editForm.position}
                            onChange={(e) => setEditForm(prev => ({ ...prev, position: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                        <textarea
                          value={editForm.bio}
                          onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={4}
                          maxLength={500}
                        />
                      </div>
                      
                      <div className="flex space-x-3">
                        <button
                          type="submit"
                          className="min-w-[44px] min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditForm(adminProfile);
                            setIsEditing(false);
                          }}
                          className="min-w-[44px] min-h-[44px] bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                          <p className="text-gray-900">{adminProfile.name}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                          <p className="text-gray-900">{adminProfile.email}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                          <p className="text-gray-900">{adminProfile.phone}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                          <p className="text-gray-900">{adminProfile.position}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                        <p className="text-gray-900">{adminProfile.bio}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* System Settings Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">General Settings</h3>
                  <button
                    onClick={handleSystemSettingsUpdate}
                    className="min-w-[44px] min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Save Settings
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                    <input
                      type="text"
                      value={systemSettings.siteName}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, siteName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max File Size (MB)</label>
                    <input
                      type="number"
                      value={systemSettings.maxFileSize}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, maxFileSize: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                    <input
                      type="number"
                      value={systemSettings.sessionTimeout}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="5"
                      max="120"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
                    <select
                      value={systemSettings.backupFrequency}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, backupFrequency: e.target.value }))}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site Description</label>
                  <textarea
                    value={systemSettings.siteDescription}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, siteDescription: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={systemSettings.maintenanceMode}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                      className="mr-3"
                    />
                    <span className="text-sm text-gray-700">Maintenance Mode</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={systemSettings.userRegistration}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, userRegistration: e.target.checked }))}
                      className="mr-3"
                    />
                    <span className="text-sm text-gray-700">Allow User Registration</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={systemSettings.emailNotifications}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                      className="mr-3"
                    />
                    <span className="text-sm text-gray-700">Email Notifications</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={systemSettings.autoApproval}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, autoApproval: e.target.checked }))}
                      className="mr-3"
                    />
                    <span className="text-sm text-gray-700">Auto-approve Content</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleSecuritySettingsUpdate}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      Save Settings
                    </button>
                    <button
                      onClick={resetToDefaults}
                      className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      Reset to Defaults
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password Expiry (days)</label>
                    <input
                      type="number"
                      value={securitySettings.passwordExpiry}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, passwordExpiry: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="30"
                      max="365"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
                    <input
                      type="number"
                      value={securitySettings.maxLoginAttempts}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="3"
                      max="10"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Session Duration (hours)</label>
                    <input
                      type="number"
                      value={securitySettings.sessionDuration}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionDuration: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="24"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={securitySettings.twoFactorAuth}
                        onChange={(e) => setSecuritySettings(prev => ({ ...prev, twoFactorAuth: e.target.checked }))}
                        className="mr-3"
                      />
                      <span className="text-sm text-gray-700">Enable Two-Factor Authentication</span>
                    </label>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">IP Address Whitelist</label>
                  <div className="flex space-x-3 mb-3">
                    <input
                      type="text"
                      value={newIpAddress}
                      onChange={(e) => setNewIpAddress(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter IP address or range (e.g., 192.168.1.1 or 192.168.1.0/24)"
                    />
                    <button
                      onClick={addIpAddress}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      Add IP
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {securitySettings.ipWhitelist.map((ip, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <span className="text-sm font-mono text-gray-700">{ip}</span>
                        <button
                          onClick={() => removeIpAddress(ip)}
                          className="text-red-600 hover:text-red-700 cursor-pointer"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      </div>
                    ))}
                    {securitySettings.ipWhitelist.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No IP addresses in whitelist</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPasswordModal && <PasswordModal />}
    </div>
  );
}