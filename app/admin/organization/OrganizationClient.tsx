'use client';

import { useState } from 'react';
import { auth } from '@/firebase/firebase';
import Sidebar from '@/components/Sidebar';

interface School {
  id: string;
  name: string;
  address: string;
  city: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  createdAt: string;
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalSchoolAdmins: number;
  totalContentManagers: number;
}

interface Campus {
  id: string;
  name: string;
  schoolId: string;
  schoolName: string;
  address: string;
  city: string;
  status: string;
  createdAt: string;
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalSchoolAdmins: number;
  totalContentManagers: number;
}

interface Props {
  initialSchools: School[];
  initialCampuses: Campus[];
  userCounts: {
    bySchool: Record<string, { total: number; students: number; teachers: number; schoolAdmins: number; contentManagers: number }>;
    byCampus: Record<string, { total: number; students: number; teachers: number; schoolAdmins: number; contentManagers: number }>;
  };
}

export default function OrganizationClient({ initialSchools, initialCampuses, userCounts }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [schools, setSchools] = useState<School[]>(initialSchools);
  const [campuses, setCampuses] = useState<Campus[]>(initialCampuses);
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [showAddCampus, setShowAddCampus] = useState(false);
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const [schoolForm, setSchoolForm] = useState({
    name: '',
    address: '',
    city: '',
    contactEmail: '',
    contactPhone: ''
  });

  const [campusForm, setCampusForm] = useState({
    name: '',
    schoolId: '',
    address: '',
    city: ''
  });

  const toggleSchoolExpand = (schoolId: string) => {
    setExpandedSchools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(schoolId)) {
        newSet.delete(schoolId);
      } else {
        newSet.add(schoolId);
      }
      return newSet;
    });
  };

  const getCampusesForSchool = (schoolId: string) => {
    return campuses.filter(campus => campus.schoolId === schoolId);
  };

  const getSchoolUserCount = (schoolId: string) => {
    return userCounts.bySchool[schoolId] || { total: 0, students: 0, teachers: 0, schoolAdmins: 0, contentManagers: 0 };
  };

  const getCampusUserCount = (campusId: string) => {
    return userCounts.byCampus[campusId] || { total: 0, students: 0, teachers: 0, schoolAdmins: 0, contentManagers: 0 };
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!schoolForm.name) {
      alert('Please enter a school name');
      return;
    }

    if (schools.some(s => s.name.toLowerCase() === schoolForm.name.toLowerCase())) {
      alert('A school with this name already exists');
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }

      const idToken = await user.getIdToken();

      const response = await fetch('/api/admin/schools', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(schoolForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create school');
      }

      const data = await response.json();
      setSchools(prev => [data.school, ...prev]);
      setSchoolForm({ name: '', address: '', city: '', contactEmail: '', contactPhone: '' });
      setShowAddSchool(false);
      alert('School created successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to create school');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!campusForm.name || !campusForm.schoolId) {
      alert('Please enter a campus name and select a school');
      return;
    }

    const school = schools.find(s => s.id === campusForm.schoolId);
    const existingCampuses = getCampusesForSchool(campusForm.schoolId);
    if (existingCampuses.some(c => c.name.toLowerCase() === campusForm.name.toLowerCase())) {
      alert('A campus with this name already exists for this school');
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }

      const idToken = await user.getIdToken();

      const response = await fetch('/api/admin/campuses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          ...campusForm,
          schoolName: school?.name || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create campus');
      }

      const data = await response.json();
      setCampuses(prev => [data.campus, ...prev]);
      setCampusForm({ name: '', schoolId: '', address: '', city: '' });
      setShowAddCampus(false);
      setExpandedSchools(prev => new Set(prev).add(campusForm.schoolId));
      alert('Campus created successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to create campus');
    } finally {
      setIsLoading(false);
    }
  };

  const totalStats = {
    schools: schools.length,
    campuses: campuses.length,
    users: Object.values(userCounts.bySchool).reduce((sum, s) => sum + s.total, 0),
    students: Object.values(userCounts.bySchool).reduce((sum, s) => sum + s.students, 0),
    teachers: Object.values(userCounts.bySchool).reduce((sum, s) => sum + s.teachers, 0)
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userRole="Admin" currentPage="organization" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 overflow-y-auto lg:ml-[256px]">
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>

          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Organization Setup</h1>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <i className="ri-building-2-line text-emerald-600 text-xl"></i>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalStats.schools}</p>
                  <p className="text-xs text-gray-500">Schools</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="ri-building-line text-blue-600 text-xl"></i>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalStats.campuses}</p>
                  <p className="text-xs text-gray-500">Campuses</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i className="ri-group-line text-purple-600 text-xl"></i>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalStats.users}</p>
                  <p className="text-xs text-gray-500">Total Users</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <i className="ri-graduation-cap-line text-indigo-600 text-xl"></i>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalStats.students}</p>
                  <p className="text-xs text-gray-500">Students</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <i className="ri-user-star-line text-orange-600 text-xl"></i>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalStats.teachers}</p>
                  <p className="text-xs text-gray-500">Teachers</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Schools & Campuses</h2>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddCampus(true)}
                className="min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <i className="ri-add-line mr-2"></i>
                Add Campus
              </button>
              <button
                onClick={() => setShowAddSchool(true)}
                className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <i className="ri-add-line mr-2"></i>
                Add School
              </button>
            </div>
          </div>

          {schools.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-building-2-line text-3xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Schools Yet</h3>
              <p className="text-gray-500 mb-6">Get started by adding your first school to the organization.</p>
              <button
                onClick={() => setShowAddSchool(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg cursor-pointer"
              >
                <i className="ri-add-line mr-2"></i>
                Add Your First School
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {schools.map((school) => {
                const schoolCampuses = getCampusesForSchool(school.id);
                const isExpanded = expandedSchools.has(school.id);
                const counts = getSchoolUserCount(school.id);
                
                return (
                  <div key={school.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div 
                      className="p-4 sm:p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleSchoolExpand(school.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <i className="ri-building-2-line text-emerald-600 text-2xl"></i>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{school.name}</h3>
                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                              {school.city && (
                                <span className="flex items-center gap-1">
                                  <i className="ri-map-pin-line"></i>
                                  {school.city}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <i className="ri-building-line"></i>
                                {schoolCampuses.length} {schoolCampuses.length === 1 ? 'Campus' : 'Campuses'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="hidden sm:flex items-center gap-4 text-sm">
                            <div className="text-center px-3 py-1 bg-indigo-50 rounded-lg">
                              <span className="font-semibold text-indigo-600">{counts.students}</span>
                              <span className="text-gray-500 ml-1">Students</span>
                            </div>
                            <div className="text-center px-3 py-1 bg-orange-50 rounded-lg">
                              <span className="font-semibold text-orange-600">{counts.teachers}</span>
                              <span className="text-gray-500 ml-1">Teachers</span>
                            </div>
                            <div className="text-center px-3 py-1 bg-purple-50 rounded-lg">
                              <span className="font-semibold text-purple-600">{counts.total}</span>
                              <span className="text-gray-500 ml-1">Total</span>
                            </div>
                          </div>
                          
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            school.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {school.status}
                          </span>
                          
                          <i className={`ri-arrow-${isExpanded ? 'up' : 'down'}-s-line text-gray-400 text-xl transition-transform`}></i>
                        </div>
                      </div>
                      
                      <div className="sm:hidden flex items-center gap-3 mt-3 text-sm">
                        <div className="px-2 py-1 bg-indigo-50 rounded">
                          <span className="font-semibold text-indigo-600">{counts.students}</span>
                          <span className="text-gray-500 ml-1">Students</span>
                        </div>
                        <div className="px-2 py-1 bg-orange-50 rounded">
                          <span className="font-semibold text-orange-600">{counts.teachers}</span>
                          <span className="text-gray-500 ml-1">Teachers</span>
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && schoolCampuses.length > 0 && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Campuses</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {schoolCampuses.map((campus) => {
                            const campusCounts = getCampusUserCount(campus.id);
                            return (
                              <div key={campus.id} className="bg-white rounded-lg border border-gray-200 p-4">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <i className="ri-building-line text-blue-600"></i>
                                  </div>
                                  <div>
                                    <h5 className="font-medium text-gray-900">{campus.name}</h5>
                                    {campus.city && (
                                      <p className="text-xs text-gray-500">{campus.city}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded">
                                    {campusCounts.students} Students
                                  </span>
                                  <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded">
                                    {campusCounts.teachers} Teachers
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {isExpanded && schoolCampuses.length === 0 && (
                      <div className="border-t border-gray-100 bg-gray-50 p-6 text-center">
                        <p className="text-gray-500 text-sm mb-3">No campuses added for this school yet.</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCampusForm(prev => ({ ...prev, schoolId: school.id }));
                            setShowAddCampus(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          <i className="ri-add-line mr-1"></i>
                          Add Campus
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showAddSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Add New School</h3>
                <button
                  onClick={() => {
                    setShowAddSchool(false);
                    setSchoolForm({ name: '', address: '', city: '', contactEmail: '', contactPhone: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleAddSchool} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">School Name *</label>
                <input
                  type="text"
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter school name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  value={schoolForm.address}
                  onChange={(e) => setSchoolForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={schoolForm.city}
                  onChange={(e) => setSchoolForm(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter city"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                <input
                  type="email"
                  value={schoolForm.contactEmail}
                  onChange={(e) => setSchoolForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter contact email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                <input
                  type="tel"
                  value={schoolForm.contactPhone}
                  onChange={(e) => setSchoolForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter contact phone"
                />
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-2 px-4 rounded-lg cursor-pointer"
                >
                  {isLoading ? 'Creating...' : 'Create School'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSchool(false);
                    setSchoolForm({ name: '', address: '', city: '', contactEmail: '', contactPhone: '' });
                  }}
                  className="flex-1 min-h-[44px] bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddCampus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Add New Campus</h3>
                <button
                  onClick={() => {
                    setShowAddCampus(false);
                    setCampusForm({ name: '', schoolId: '', address: '', city: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>
            
            <form onSubmit={handleAddCampus} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select School *</label>
                <select
                  value={campusForm.schoolId}
                  onChange={(e) => setCampusForm(prev => ({ ...prev, schoolId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">Select a school</option>
                  {schools.filter(s => s.status === 'Active').map(school => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Campus Name *</label>
                <input
                  type="text"
                  value={campusForm.name}
                  onChange={(e) => setCampusForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter campus name (e.g., Main Campus, North Campus)"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  value={campusForm.address}
                  onChange={(e) => setCampusForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter campus address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={campusForm.city}
                  onChange={(e) => setCampusForm(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter city"
                />
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-2 px-4 rounded-lg cursor-pointer"
                >
                  {isLoading ? 'Creating...' : 'Create Campus'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCampus(false);
                    setCampusForm({ name: '', schoolId: '', address: '', city: '' });
                  }}
                  className="flex-1 min-h-[44px] bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
