'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  schoolId: string;
  schoolName: string;
  campusId: string;
  campusName: string;
  status: string;
  createdAt: string;
  lastActive: string;
  grade?: string;
  section?: string;
  rollNumber?: string;
  subjects?: string[];
  assignedClasses?: string[];
  assignedGrades?: string[];
  assignedBooks?: { id: string; title: string; subject: string; grade: string; chapters: number }[];
}

interface School {
  id: string;
  name: string;
  status: string;
}

interface Campus {
  id: string;
  name: string;
  schoolId: string;
  status: string;
}

interface Props {
  initialUsers: User[];
  schools: School[];
  campuses: Campus[];
}

const roleLabels: Record<string, string> = {
  'school_admin': 'School Admin',
  'teacher': 'Teacher',
  'student': 'Student',
  'content_manager': 'Content Manager'
};

const roleColors: Record<string, string> = {
  'school_admin': 'bg-indigo-100 text-indigo-800',
  'teacher': 'bg-orange-100 text-orange-800',
  'student': 'bg-purple-100 text-purple-800',
  'content_manager': 'bg-violet-100 text-violet-800'
};

export default function UsersClient({ initialUsers, schools, campuses }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterSchool, setFilterSchool] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isLoading, setIsLoading] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [userType, setUserType] = useState<'school' | 'oup' | null>(null);

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    schoolId: '',
    campusId: '',
    grade: '',
    section: '',
    rollNumber: '',
    subjects: [] as string[],
    assignedClasses: [] as string[],
    assignedGrades: [] as string[],
    assignedBooks: [] as { id: string; title: string; subject: string; grade: string; chapters: number }[]
  });

  const [availableBooks, setAvailableBooks] = useState<{ [subject: string]: any[] }>({});
  const [loadingBooks, setLoadingBooks] = useState<{ [subject: string]: boolean }>({});

  const availableSubjects = ['English', 'Mathematics', 'Science', 'Urdu', 'Computer', 'Social Studies', 'Islamiat', 'Pakistan Studies'];
  const availableGrades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const availableSections = ['A', 'B', 'C', 'D'];

  const getCampusesForSchool = (schoolId: string) => {
    return campuses.filter(c => c.schoolId === schoolId);
  };
  
  const activeSchools = schools;

  const getSchoolName = (schoolId: string) => {
    return schools.find(s => s.id === schoolId)?.name || '';
  };

  const getCampusName = (campusId: string) => {
    return campuses.find(c => c.id === campusId)?.name || '';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === '' || user.role === filterRole;
    const matchesSchool = filterSchool === '' || user.schoolId === filterSchool;
    const matchesStatus = filterStatus === '' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesSchool && matchesStatus;
  });

  const fetchBooksBySubject = async (subject: string) => {
    setLoadingBooks(prev => ({ ...prev, [subject]: true }));
    try {
      const response = await fetch(`/api/admin/books-by-subject?subject=${encodeURIComponent(subject)}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableBooks(prev => ({ ...prev, [subject]: data.books }));
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoadingBooks(prev => ({ ...prev, [subject]: false }));
    }
  };

  const resetForm = () => {
    setUserForm({
      name: '',
      email: '',
      password: '',
      role: '',
      schoolId: '',
      campusId: '',
      grade: '',
      section: '',
      rollNumber: '',
      subjects: [],
      assignedClasses: [],
      assignedGrades: [],
      assignedBooks: []
    });
    setAvailableBooks({});
    setLoadingBooks({});
    setFormStep(1);
    setUserType(null);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: school users require school
    const requiresSchool = userType === 'school';
    if (!userForm.name || !userForm.email || !userForm.password || !userForm.role) {
      alert('Please fill in all required fields');
      return;
    }

    if (requiresSchool && !userForm.schoolId) {
      alert('Please select a school');
      return;
    }

    if (userForm.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    if (users.some(u => u.email === userForm.email)) {
      alert('A user with this email already exists');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userForm,
          schoolName: userForm.schoolId ? getSchoolName(userForm.schoolId) : '',
          campusName: userForm.campusId ? getCampusName(userForm.campusId) : '',
          userType: userType
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const data = await response.json();
      setUsers(prev => [data.user, ...prev]);
      resetForm();
      setShowAddUser(false);
      alert('User account created successfully with email and password!');
    } catch (error: any) {
      alert(error.message || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!confirm(`Are you sure you want to delete user "${user?.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      setUsers(prev => prev.filter(u => u.id !== userId));
      alert('User deleted successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to delete user');
    }
  };

  const toggleUserStatus = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, status: newStatus } : u
      ));
      alert(`User "${user.name}" ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully!`);
    } catch (error: any) {
      alert(error.message || 'Failed to update user status');
    }
  };

  const openEditUser = (user: User) => {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      schoolId: user.schoolId,
      campusId: user.campusId,
      grade: user.grade || '',
      section: user.section || '',
      rollNumber: user.rollNumber || '',
      subjects: user.subjects || [],
      assignedClasses: user.assignedClasses || [],
      assignedGrades: user.assignedGrades || [],
      assignedBooks: user.assignedBooks || []
    });
    setFormStep(3);
    setShowEditUser(true);
  };

  const updateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUserId,
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          subjects: userForm.subjects,
          assignedGrades: userForm.assignedGrades,
          assignedBooks: userForm.assignedBooks,
          grade: userForm.grade,
          section: userForm.section,
          rollNumber: userForm.rollNumber
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      const data = await response.json();
      setUsers(prev => prev.map(u => u.id === editingUserId ? { ...u, ...data.user } : u));
      resetForm();
      setShowEditUser(false);
      setEditingUserId(null);
      alert('User updated successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to update user');
    } finally {
      setIsLoading(false);
    }
  };

  const schoolCampuses = userForm.schoolId ? getCampusesForSchool(userForm.schoolId) : [];
  const showCampusStep = userType === 'school' && schoolCampuses.length > 0;
  
  // Calculate total steps based on user type
  const getTotalSteps = () => {
    if (!userType) return 1;
    if (userType === 'oup') return 3; // Type -> Role -> Details
    if (userType === 'school' && showCampusStep) return 5; // Type -> Role -> School -> Campus -> Details
    if (userType === 'school') return 4; // Type -> Role -> School -> Details
    return 3;
  };

  const renderUserModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Add New User</h3>
              <p className="text-sm text-gray-500 mt-1">Step {formStep} of {getTotalSteps()}</p>
            </div>
            <button
              onClick={() => {
                setShowAddUser(false);
                resetForm();
              }}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <i className="ri-close-line text-2xl"></i>
            </button>
          </div>
          
          <div className="flex mt-4 gap-2">
            {Array.from({ length: getTotalSteps() }).map((_, index) => (
              <div 
                key={index}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  formStep >= (index + 1) ? 'bg-emerald-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
        
        <form onSubmit={handleAddUser} className="p-6">
          {formStep === 1 && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 mb-4">Select User Type</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setUserType('school');
                    setFormStep(2);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-left hover:shadow-md ${
                    userType === 'school' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                    <i className="ri-building-2-line text-blue-600 text-xl"></i>
                  </div>
                  <p className="font-medium text-gray-900">School User</p>
                  <p className="text-xs text-gray-500 mt-1">Teacher, Admin, Student</p>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setUserType('oup');
                    setFormStep(2);
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-left hover:shadow-md ${
                    userType === 'oup' 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                    <i className="ri-global-line text-purple-600 text-xl"></i>
                  </div>
                  <p className="font-medium text-gray-900">OUP User</p>
                  <p className="text-xs text-gray-500 mt-1">Creator, Manager</p>
                </button>
              </div>
            </div>
          )}

          {formStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setFormStep(1);
                    setUserType(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-arrow-left-line text-xl"></i>
                </button>
                <h4 className="font-medium text-gray-900">Select User Role</h4>
              </div>
              
              {userType === 'school' ? (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'school_admin', label: 'School Admin', icon: 'ri-shield-user-line', color: 'indigo' },
                    { value: 'teacher', label: 'Teacher', icon: 'ri-user-star-line', color: 'orange' },
                    { value: 'student', label: 'Student', icon: 'ri-graduation-cap-line', color: 'purple' }
                  ].map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => {
                        setUserForm(prev => ({ ...prev, role: role.value }));
                        setFormStep(3);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all text-left hover:shadow-md ${
                        userForm.role === role.value 
                          ? `border-${role.color}-500 bg-${role.color}-50` 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 bg-${role.color}-100 rounded-lg flex items-center justify-center mb-3`}>
                        <i className={`${role.icon} text-${role.color}-600 text-xl`}></i>
                      </div>
                      <p className="font-medium text-gray-900">{role.label}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'content_creator', label: 'Content Creator', icon: 'ri-quill-pen-line', color: 'violet' },
                    { value: 'content_manager', label: 'Content Manager', icon: 'ri-file-list-line', color: 'amber' },
                    { value: 'oup_admin', label: 'OUP Admin', icon: 'ri-admin-line', color: 'red' }
                  ].map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => {
                        setUserForm(prev => ({ ...prev, role: role.value }));
                        setFormStep(3);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all text-left hover:shadow-md ${
                        userForm.role === role.value 
                          ? `border-${role.color}-500 bg-${role.color}-50` 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 bg-${role.color}-100 rounded-lg flex items-center justify-center mb-3`}>
                        <i className={`${role.icon} text-${role.color}-600 text-xl`}></i>
                      </div>
                      <p className="font-medium text-gray-900">{role.label}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {formStep === 3 && userType === 'school' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setFormStep(2)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-arrow-left-line text-xl"></i>
                </button>
                <h4 className="font-medium text-gray-900">Select School</h4>
              </div>
              
              {activeSchools.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-building-2-line text-2xl text-gray-400"></i>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">No Schools Available</h4>
                  <p className="text-sm text-gray-500 mb-4">Please add a school in Organization Setup first.</p>
                  <a 
                    href="/admin/organization"
                    className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                  >
                    Go to Organization Setup
                  </a>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {activeSchools.map((school) => (
                    <button
                      key={school.id}
                      type="button"
                      onClick={() => {
                        setUserForm(prev => ({ ...prev, schoolId: school.id, campusId: '' }));
                        const hasCampuses = getCampusesForSchool(school.id).length > 0;
                        setFormStep(hasCampuses ? 4 : 5);
                      }}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left hover:shadow-md flex items-center gap-4 ${
                        userForm.schoolId === school.id 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="ri-building-2-line text-emerald-600 text-xl"></i>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{school.name}</p>
                        <p className="text-sm text-gray-500">
                          {getCampusesForSchool(school.id).length} campuses
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {formStep === 4 && userType === 'school' && showCampusStep && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setFormStep(3)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-arrow-left-line text-xl"></i>
                </button>
                <h4 className="font-medium text-gray-900">Select Campus (Optional)</h4>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                {getSchoolName(userForm.schoolId)} has multiple campuses. Select one or skip this step.
              </p>
              
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {schoolCampuses.map((campus) => (
                  <button
                    key={campus.id}
                    type="button"
                    onClick={() => {
                      setUserForm(prev => ({ ...prev, campusId: campus.id }));
                      setFormStep(4);
                    }}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left hover:shadow-md flex items-center gap-4 ${
                      userForm.campusId === campus.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="ri-building-line text-blue-600 text-xl"></i>
                    </div>
                    <p className="font-medium text-gray-900">{campus.name}</p>
                  </button>
                ))}
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setUserForm(prev => ({ ...prev, campusId: '' }));
                  setFormStep(5);
                }}
                className="w-full p-3 text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Skip - Don't assign to a specific campus
              </button>
            </div>
          )}

          {((formStep === 3 && userType === 'oup') || (formStep === 5 && userType === 'school')) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    if (userType === 'oup') {
                      setFormStep(2);
                    } else {
                      setFormStep(showCampusStep ? 4 : 3);
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-arrow-left-line text-xl"></i>
                </button>
                <h4 className="font-medium text-gray-900">User Details</h4>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleColors[userForm.role] || 'bg-gray-100 text-gray-800'}`}>
                    {roleLabels[userForm.role] || userForm.role}
                  </span>
                  {userType === 'school' && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600">{getSchoolName(userForm.schoolId)}</span>
                      {userForm.campusId && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600">{getCampusName(userForm.campusId)}</span>
                        </>
                      )}
                    </>
                  )}
                  {userType === 'oup' && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600">OUP User</span>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter password (min 6 characters)"
                    required
                  />
                </div>

                {userForm.role === 'student' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                        <select
                          value={userForm.grade}
                          onChange={(e) => setUserForm(prev => ({ ...prev, grade: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">Select Grade</option>
                          {availableGrades.map(g => (
                            <option key={g} value={g}>Grade {g}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                        <select
                          value={userForm.section}
                          onChange={(e) => setUserForm(prev => ({ ...prev, section: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">Select Section</option>
                          {availableSections.map(s => (
                            <option key={s} value={s}>Section {s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Roll Number</label>
                      <input
                        type="text"
                        value={userForm.rollNumber}
                        onChange={(e) => setUserForm(prev => ({ ...prev, rollNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Enter roll number"
                      />
                    </div>
                  </>
                )}

                {(userForm.role === 'teacher' || userForm.role === 'content_manager' || userForm.role === 'content_creator') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subjects</label>
                    <div className="flex flex-wrap gap-2">
                      {availableSubjects.map(subject => (
                        <button
                          key={subject}
                          type="button"
                          onClick={async () => {
                            const isCurrentlySelected = userForm.subjects.includes(subject);
                            
                            if (isCurrentlySelected) {
                              // When deselecting: remove subject and its books
                              setUserForm(prev => ({
                                ...prev,
                                subjects: prev.subjects.filter(s => s !== subject),
                                assignedBooks: prev.assignedBooks.filter(book => book.subject !== subject)
                              }));
                            } else {
                              // When selecting: add subject and fetch+assign its books
                              await fetchBooksBySubject(subject);
                              
                              // Get the books for this subject from availableBooks
                              const booksForSubject = availableBooks[subject] || [];
                              
                              setUserForm(prev => ({
                                ...prev,
                                subjects: [...prev.subjects, subject],
                                // Auto-assign all books for this subject
                                assignedBooks: [
                                  ...prev.assignedBooks,
                                  ...booksForSubject.map(book => ({
                                    id: book.id,
                                    title: book.title,
                                    subject: subject,
                                    grade: book.grade,
                                    chapters: book.chapters
                                  }))
                                ]
                              }));
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            userForm.subjects.includes(subject)
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {subject}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {userForm.role === 'teacher' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Grades</label>
                    <div className="flex flex-wrap gap-2">
                      {availableGrades.map(grade => (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => {
                            setUserForm(prev => ({
                              ...prev,
                              assignedGrades: prev.assignedGrades.includes(grade)
                                ? prev.assignedGrades.filter(g => g !== grade)
                                : [...prev.assignedGrades, grade]
                            }));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            userForm.assignedGrades.includes(grade)
                              ? 'bg-orange-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Grade {grade}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {userForm.role === 'teacher' && userForm.subjects.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign Books</label>
                    <div className="space-y-4">
                      {userForm.subjects.map(subject => (
                        <div key={subject} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">{subject}</h4>
                            {loadingBooks[subject] && (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                            )}
                          </div>
                          {availableBooks[subject] && availableBooks[subject].length > 0 ? (
                            <div className="grid gap-2">
                              {availableBooks[subject]
                                .filter(book => userForm.assignedGrades.includes(book.grade.replace('Grade ', '')))
                                .map(book => (
                                  <div key={book.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                      <div className="font-medium text-sm text-gray-900">{book.title}</div>
                                      <div className="text-xs text-gray-500">
                                        {book.grade} • {book.chapters} Chapters
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const bookExists = userForm.assignedBooks.some(b => b.id === book.id);
                                        setUserForm(prev => ({
                                          ...prev,
                                          assignedBooks: bookExists
                                            ? prev.assignedBooks.filter(b => b.id !== book.id)
                                            : [...prev.assignedBooks, {
                                                id: book.id,
                                                title: book.title,
                                                subject: subject,
                                                grade: book.grade,
                                                chapters: book.chapters
                                              }]
                                        }));
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        userForm.assignedBooks.some(b => b.id === book.id)
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                      }`}
                                    >
                                      {userForm.assignedBooks.some(b => b.id === book.id) ? 'Assigned' : 'Assign'}
                                    </button>
                                  </div>
                                ))}
                              {availableBooks[subject].filter(book => 
                                userForm.assignedGrades.includes(book.grade.replace('Grade ', ''))
                              ).length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-2">
                                  No books available for selected grades in {subject}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-2">
                              {loadingBooks[subject] ? 'Loading books...' : `No books available for ${subject}`}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  disabled={isLoading || !userForm.name || !userForm.email}
                  className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-2 px-4 rounded-lg cursor-pointer"
                >
                  {isLoading ? 'Creating...' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUser(false);
                    resetForm();
                  }}
                  className="flex-1 min-h-[44px] bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );

  const renderEditUserModal = () => {
    const currentUser = users.find(u => u.id === editingUserId);
    if (!currentUser) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">Edit User: {currentUser.name}</h3>
          </div>
          
          <form onSubmit={updateUser} className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
              <input
                type="text"
                value={userForm.name}
                onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter full name"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter email address"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed after account creation</p>
            </div>

            {/* Subjects - For Teacher/Content Manager/Content Creator */}
            {(userForm.role === 'teacher' || userForm.role === 'content_manager' || userForm.role === 'content_creator') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subjects</label>
                <div className="flex flex-wrap gap-2">
                  {availableSubjects.map(subject => (
                    <button
                      key={subject}
                      type="button"
                      onClick={async () => {
                        const isCurrentlySelected = userForm.subjects.includes(subject);
                        
                        if (isCurrentlySelected) {
                          // When deselecting: remove subject and its books
                          setUserForm(prev => ({
                            ...prev,
                            subjects: prev.subjects.filter(s => s !== subject),
                            assignedBooks: prev.assignedBooks.filter(book => book.subject !== subject)
                          }));
                        } else {
                          // When selecting: add subject and fetch+assign its books
                          await fetchBooksBySubject(subject);
                          
                          // Get the books for this subject from availableBooks
                          const booksForSubject = availableBooks[subject] || [];
                          
                          setUserForm(prev => ({
                            ...prev,
                            subjects: [...prev.subjects, subject],
                            // Auto-assign all books for this subject
                            assignedBooks: [
                              ...prev.assignedBooks,
                              ...booksForSubject.map(book => ({
                                id: book.id,
                                title: book.title,
                                subject: subject,
                                grade: book.grade,
                                chapters: book.chapters
                              }))
                            ]
                          }));
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        userForm.subjects.includes(subject)
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned Grades - For Teacher */}
            {userForm.role === 'teacher' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Grades</label>
                <div className="flex flex-wrap gap-2">
                  {availableGrades.map(grade => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => {
                        setUserForm(prev => ({
                          ...prev,
                          assignedGrades: prev.assignedGrades.includes(grade)
                            ? prev.assignedGrades.filter(g => g !== grade)
                            : [...prev.assignedGrades, grade]
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        userForm.assignedGrades.includes(grade)
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Grade {grade}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={isLoading || !userForm.name || !userForm.email}
                className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-2 px-4 rounded-lg cursor-pointer"
              >
                {isLoading ? 'Updating...' : 'Update User'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEditUser(false);
                  setEditingUserId(null);
                  resetForm();
                }}
                className="flex-1 min-h-[44px] bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userRole="Admin" currentPage="users" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 overflow-y-auto lg:ml-[256px]">
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>

          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">User Management</h1>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-gray-600">Manage user accounts across all schools</p>
              </div>
              <button
                onClick={() => setShowAddUser(true)}
                className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <i className="ri-add-line mr-2"></i>
                Add User
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Search by name or email..."
                  />
                  <i className="ri-search-line absolute left-3 top-2.5 text-gray-400"></i>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Role</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Roles</option>
                  <option value="school_admin">School Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                  <option value="content_manager">Content Manager</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by School</label>
                <select
                  value={filterSchool}
                  onChange={(e) => setFilterSchool(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Schools</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterRole('');
                    setFilterSchool('');
                    setFilterStatus('');
                  }}
                  className="w-full min-h-[44px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Users ({filteredUsers.length})
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Active: {filteredUsers.filter(u => u.status === 'Active').length}</span>
                  <span>Inactive: {filteredUsers.filter(u => u.status === 'Inactive').length}</span>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-6 font-medium text-gray-900">User</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900">Role</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900">School</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900">Campus</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="min-w-[44px] min-h-[44px] w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {(user.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name || 'User'}</p>
                            <p className="text-sm text-gray-600">{user.email || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-800'}`}>
                          {roleLabels[user.role] || user.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-600">{user.schoolName || '-'}</td>
                      <td className="py-4 px-6 text-gray-600">{user.campusName || '-'}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => openEditUser(user)}
                            className="text-blue-600 hover:text-blue-700 cursor-pointer"
                            title="Edit User"
                          >
                            <i className="ri-edit-line"></i>
                          </button>
                          <button 
                            onClick={() => toggleUserStatus(user.id)}
                            className={`cursor-pointer ${
                              user.status === 'Active' 
                                ? 'text-orange-600 hover:text-orange-700' 
                                : 'text-green-600 hover:text-green-700'
                            }`}
                            title={user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                          >
                            <i className={`ri-${user.status === 'Active' ? 'pause' : 'play'}-circle-line`}></i>
                          </button>
                          <button 
                            onClick={() => deleteUser(user.id)}
                            className="text-red-600 hover:text-red-700 cursor-pointer"
                            title="Delete User"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-user-line text-2xl text-gray-400"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-600">
                    {searchTerm || filterRole || filterSchool || filterStatus 
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Get started by adding your first user.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddUser && renderUserModal()}
      {showEditUser && renderEditUserModal()}
    </div>
  );
}
