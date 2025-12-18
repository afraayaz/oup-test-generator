'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import type { UserData } from './page';

interface UsersClientProps {
  students: UserData[];
  teachers: UserData[];
  contentManagers: UserData[];
  schoolId?: string;
  availableSchools: string[];
  isSchoolAdmin?: boolean;
}

export default function UsersClient({ students, teachers, contentManagers, schoolId, availableSchools, isSchoolAdmin = false }: UsersClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'content_managers'>('students');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const totalUsers = students.length + teachers.length + contentManagers.length;

  const grades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  
  const studentsByGrade = grades.reduce((acc, grade) => {
    acc[grade] = students.filter(s => 
      s.grade === grade || 
      s.grade === `Grade ${grade}` || 
      s.class === grade ||
      s.class === `Grade ${grade}`
    );
    return acc;
  }, {} as Record<string, UserData[]>);

  const filteredStudents = selectedGrade === 'all' 
    ? students 
    : studentsByGrade[selectedGrade] || [];

  const searchedStudents = filteredStudents.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const searchedTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.subjects || []).some(sub => sub.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const searchedContentManagers = contentManagers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabCounts = {
    students: students.length,
    teachers: teachers.length,
    content_managers: contentManagers.length,
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="School Admin" currentPage="users" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 lg:ml-[256px]">
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>

          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-indigo-600">User Management</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              {schoolId ? (
                <>Viewing users for school: <span className="font-medium text-indigo-500">{schoolId}</span></>
              ) : (
                <>Showing all users ({totalUsers} total)</>
              )}
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {!isSchoolAdmin && availableSchools.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 mb-6 border border-indigo-100">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <i className="ri-building-line text-indigo-600 text-lg"></i>
                  <span className="text-sm font-medium text-gray-700">Filter by School:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/school-admin/users"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      !schoolId
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 hover:bg-indigo-100 hover:text-indigo-700 border border-gray-200'
                    }`}
                  >
                    All Schools
                  </a>
                  {availableSchools.map((school) => (
                    <a
                      key={school}
                      href={`/school-admin/users?schoolId=${encodeURIComponent(school)}`}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        schoolId === school
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white text-gray-600 hover:bg-indigo-100 hover:text-indigo-700 border border-gray-200'
                      }`}
                    >
                      {school}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 border-b border-gray-100 gap-4">
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('students')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'students'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-indigo-600'
                  }`}
                >
                  <i className="ri-graduation-cap-line"></i>
                  Students
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'students' ? 'bg-indigo-500' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tabCounts.students}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('teachers')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'teachers'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  <i className="ri-user-star-line"></i>
                  Teachers
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'teachers' ? 'bg-blue-500' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tabCounts.teachers}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('content_managers')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'content_managers'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-violet-600'
                  }`}
                >
                  <i className="ri-quill-pen-line"></i>
                  Content Managers
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'content_managers' ? 'bg-violet-500' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tabCounts.content_managers}
                  </span>
                </button>
              </div>
              
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {activeTab === 'students' && (
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <label className="text-sm font-medium text-gray-700">Filter by Grade:</label>
                  <div className="relative">
                    <select
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                      className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer hover:border-indigo-300 transition-colors"
                    >
                      <option value="all">All Grades ({students.length})</option>
                      {grades.map(grade => {
                        const count = studentsByGrade[grade]?.length || 0;
                        return (
                          <option key={grade} value={grade}>
                            Grade {grade} ({count})
                          </option>
                        );
                      })}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                  </div>
                  {selectedGrade !== 'all' && (
                    <button
                      onClick={() => setSelectedGrade('all')}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                      <i className="ri-close-line"></i>
                      Clear filter
                    </button>
                  )}
                </div>

                {searchedStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-user-search-line text-3xl text-gray-400"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Students Found</h3>
                    <p className="text-sm text-gray-500">
                      {searchQuery 
                        ? 'No students match your search criteria.' 
                        : 'No students have been added to this school yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Section</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Roll No.</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Campus</th>
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchedStudents.map((student) => (
                          <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-indigo-600 font-semibold text-sm">
                                    {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{student.name}</p>
                                  <p className="text-xs text-gray-500">{student.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                {student.grade || student.class || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {student.section || '-'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {student.rollNumber || '-'}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                <i className="ri-building-line mr-1"></i>
                                {student.campusName || student.campusId || student.schoolName || student.schoolId || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                student.status === 'active' 
                                  ? 'bg-green-50 text-green-700' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {student.status === 'active' ? (
                                  <><i className="ri-checkbox-circle-fill mr-1"></i>Active</>
                                ) : (
                                  student.status || 'Active'
                                )}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'teachers' && (
              <div className="p-4">
                {searchedTeachers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-user-star-line text-3xl text-gray-400"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Teachers Found</h3>
                    <p className="text-sm text-gray-500">
                      {searchQuery 
                        ? 'No teachers match your search criteria.' 
                        : 'No teachers have been added to this school yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchedTeachers.map((teacher) => (
                      <div 
                        key={teacher.id} 
                        className="bg-blue-50 border border-blue-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 font-semibold">
                              {teacher.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">{teacher.name}</h3>
                            <p className="text-xs text-gray-500 truncate">{teacher.email}</p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            teacher.status === 'active' 
                              ? 'bg-green-50 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {teacher.status === 'active' ? 'Active' : teacher.status || 'Active'}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          {teacher.subjects && teacher.subjects.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Subjects</p>
                              <div className="flex flex-wrap gap-1">
                                {teacher.subjects.map((subject, idx) => (
                                  <span 
                                    key={idx}
                                    className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                                  >
                                    {subject}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {teacher.assignedClasses && teacher.assignedClasses.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Assigned Classes</p>
                              <div className="flex flex-wrap gap-1">
                                {teacher.assignedClasses.map((cls, idx) => (
                                  <span 
                                    key={idx}
                                    className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium"
                                  >
                                    {cls}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {teacher.assignedGrades && teacher.assignedGrades.length > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Assigned Grades</p>
                              <div className="flex flex-wrap gap-1">
                                {teacher.assignedGrades.map((grade, idx) => (
                                  <span 
                                    key={idx}
                                    className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium"
                                  >
                                    Grade {grade}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Campus</p>
                            <div className="flex items-center gap-1">
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium inline-flex items-center gap-1">
                                <i className="ri-building-line text-xs"></i>
                                {teacher.campusName || teacher.campusId || teacher.schoolName || teacher.schoolId || 'N/A'}
                              </span>
                            </div>
                          </div>
                          
                          {teacher.phone && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <i className="ri-phone-line"></i>
                              {teacher.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'content_managers' && (
              <div className="p-4">
                {searchedContentManagers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="ri-quill-pen-line text-3xl text-gray-400"></i>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Content Managers Found</h3>
                    <p className="text-sm text-gray-500">
                      {searchQuery 
                        ? 'No content managers match your search criteria.' 
                        : 'No content managers have been added to this school yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchedContentManagers.map((manager) => (
                      <div 
                        key={manager.id} 
                        className="bg-violet-50 border border-violet-200 rounded-xl p-4 hover:border-violet-400 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-violet-600 font-semibold">
                              {manager.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">{manager.name}</h3>
                            <p className="text-xs text-gray-500 truncate">{manager.email}</p>
                            {manager.phone && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                <i className="ri-phone-line"></i>
                                {manager.phone}
                              </div>
                            )}
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            manager.status === 'active' 
                              ? 'bg-green-50 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {manager.status === 'active' ? 'Active' : manager.status || 'Active'}
                          </span>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Campus</p>
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium inline-flex items-center gap-1">
                              <i className="ri-building-line text-xs"></i>
                              {manager.campusName || manager.campusId || manager.schoolName || manager.schoolId || 'N/A'}
                            </span>
                          </div>
                          {manager.createdBy && (
                            <p className="text-xs text-gray-400">
                              <i className="ri-user-add-line mr-1"></i>
                              Created by: {manager.createdBy}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
