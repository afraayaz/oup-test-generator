'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

interface ContentItem {
  id: number;
  title: string;
  type: 'book' | 'question' | 'quiz';
  author: string;
  subject: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted: string;
  lastModified: string;
  flagged: boolean;
  views: number;
  reports: number;
}

interface ActivityLog {
  id: number;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  ip: string;
  status: 'success' | 'warning' | 'error';
}

export default function ContentMonitoring() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  
  // Subject Management State
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [subjectName, setSubjectName] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookGrade, setBookGrade] = useState('');
  const [bookDescription, setBookDescription] = useState('');
  const [bookChapters, setBookChapters] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState('');

  // Edit state
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [showEditBookModal, setShowEditBookModal] = useState(false);

  // Fetch subjects on component mount
  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setSubjectsLoading(true);
    setSubjectsError('');
    try {
      const response = await fetch('/api/admin/subjects');
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects);
      } else {
        throw new Error('Failed to fetch subjects');
      }
    } catch (error) {
      setSubjectsError('Failed to load subjects');
      console.error('Error fetching subjects:', error);
    } finally {
      setSubjectsLoading(false);
    }
  };

  const [contentItems, setContentItems] = useState<ContentItem[]>([
    { id: 1, title: 'Advanced Biology Chapter 12', type: 'book', author: 'Sarah Johnson', subject: 'Biology', status: 'pending', submitted: '2024-01-15', lastModified: '2024-01-15', flagged: false, views: 45, reports: 0 },
    { id: 2, title: 'Photosynthesis Quiz Questions', type: 'question', author: 'Sarah Johnson', subject: 'Biology', status: 'approved', submitted: '2024-01-14', lastModified: '2024-01-14', flagged: true, views: 123, reports: 2 },
    { id: 3, title: 'Mathematics Final Exam', type: 'quiz', author: 'Mike Chen', subject: 'Mathematics', status: 'approved', submitted: '2024-01-13', lastModified: '2024-01-14', flagged: false, views: 89, reports: 0 },
    { id: 4, title: 'Chemistry Lab Manual', type: 'book', author: 'Emma Wilson', subject: 'Chemistry', status: 'rejected', submitted: '2024-01-12', lastModified: '2024-01-13', flagged: false, views: 12, reports: 1 },
    { id: 5, title: 'World War II Questions', type: 'question', author: 'Lisa Garcia', subject: 'History', status: 'pending', submitted: '2024-01-11', lastModified: '2024-01-12', flagged: false, views: 67, reports: 0 },
  ]);

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([
    { id: 1, user: 'Sarah Johnson', action: 'Created new book', target: 'Advanced Biology Chapter 12', timestamp: '2024-01-15 10:30 AM', ip: '192.168.1.101', status: 'success' },
    { id: 2, user: 'Mike Chen', action: 'Updated quiz questions', target: 'Mathematics Final Exam', timestamp: '2024-01-15 09:15 AM', ip: '192.168.1.102', status: 'success' },
    { id: 3, user: 'Emma Wilson', action: 'Failed login attempt', target: 'Admin Panel', timestamp: '2024-01-15 08:45 AM', ip: '192.168.1.103', status: 'error' },
    { id: 4, user: 'Lisa Garcia', action: 'Deleted question set', target: 'Ancient History Quiz', timestamp: '2024-01-14 04:20 PM', ip: '192.168.1.104', status: 'warning' },
    { id: 5, user: 'David Brown', action: 'Generated new quiz', target: 'Physics Chapter 5 Quiz', timestamp: '2024-01-14 02:30 PM', ip: '192.168.1.105', status: 'success' },
  ]);

  const filteredContent = contentItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === '' || item.status === filterStatus;
    const matchesType = filterType === '' || item.type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Get all unique grades from all books
  const getAllGrades = () => {
    const gradesSet = new Set<string>();
    subjects.forEach(subject => {
      subject.books.forEach((book: any) => {
        if (book.grade) {
          gradesSet.add(book.grade);
        }
      });
    });
    const gradeArray = Array.from(gradesSet).sort();
    return gradeArray;
  };

  // Get books filtered by selected grade
  const getBooksByGrade = () => {
    if (!selectedGrade) {
      return subjects.map(subject => ({
        subject: subject.name,
        books: subject.books
      }));
    }
    
    return subjects.map(subject => ({
      subject: subject.name,
      books: subject.books.filter((book: any) => book.grade === selectedGrade)
    })).filter(item => item.books.length > 0);
  };

  const handleBulkApprove = () => {
    if (selectedItems.length === 0) {
      alert('Please select items to approve');
      return;
    }
    
    setContentItems(prev => prev.map(item => 
      selectedItems.includes(item.id) 
        ? { ...item, status: 'approved' as const }
        : item
    ));
    
    setSelectedItems([]);
    alert(`${selectedItems.length} items approved successfully`);
  };

  const handleBulkReject = () => {
    if (selectedItems.length === 0) {
      alert('Please select items to reject');
      return;
    }
    
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      setContentItems(prev => prev.map(item => 
        selectedItems.includes(item.id) 
          ? { ...item, status: 'rejected' as const }
          : item
      ));
      
      setSelectedItems([]);
      alert(`${selectedItems.length} items rejected successfully`);
    }
  };

  const toggleSelection = (itemId: number) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAll = () => {
    if (selectedItems.length === filteredContent.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredContent.map(item => item.id));
    }
  };

  const updateItemStatus = (itemId: number, status: 'approved' | 'rejected') => {
    setContentItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, status } : item
    ));
    alert(`Item ${status} successfully`);
  };

  const flagContent = (itemId: number) => {
    setContentItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, flagged: !item.flagged } : item
    ));
  };

  const viewDetails = (content: ContentItem) => {
    setSelectedContent(content);
    setShowDetails(true);
  };
  
  // Subject Management Functions
  const addSubject = async () => {
    if (subjectName.trim()) {
      try {
        const response = await fetch('/api/admin/subjects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: subjectName }),
        });

        if (response.ok) {
          const data = await response.json();
          setSubjects([...subjects, data.subject]);
          setSubjectName('');
          setShowSubjectModal(false);
          alert('Subject created successfully!');
        } else {
          throw new Error('Failed to create subject');
        }
      } catch (error) {
        alert('Failed to create subject. Please try again.');
        console.error('Error creating subject:', error);
      }
    }
  };
  
  const addBook = async () => {
    if (bookTitle.trim() && bookGrade && selectedSubject) {
      try {
        const selectedSubjectObj = subjects.find(s => s.name === selectedSubject);
        if (!selectedSubjectObj) {
          alert('Selected subject not found');
          return;
        }

        const response = await fetch('/api/admin/books', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subjectId: selectedSubjectObj.id,
            title: bookTitle,
            grade: bookGrade,
            description: bookDescription,
            chapters: parseInt(bookChapters) || 0
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSubjects(prev => prev.map(subject => 
            subject.name === selectedSubject
              ? { ...subject, books: [...subject.books, data.book] }
              : subject
          ));
          
          setBookTitle('');
          setBookGrade('');
          setBookDescription('');
          setBookChapters('');
          setSelectedSubject('');
          setShowBookModal(false);
          alert('Book added successfully!');
        } else {
          throw new Error('Failed to add book');
        }
      } catch (error) {
        alert('Failed to add book. Please try again.');
        console.error('Error adding book:', error);
      }
    }
  };
  
  const deleteSubject = async (subjectId: string) => {
    if (confirm('Are you sure you want to delete this subject and all its books?')) {
      try {
        const response = await fetch(`/api/admin/subjects?id=${subjectId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setSubjects(prev => prev.filter(subject => subject.id !== subjectId));
          alert('Subject deleted successfully!');
        } else {
          throw new Error('Failed to delete subject');
        }
      } catch (error) {
        alert('Failed to delete subject. Please try again.');
        console.error('Error deleting subject:', error);
      }
    }
  };
  
  const deleteBook = async (subjectName: string, bookId: string) => {
    if (confirm('Are you sure you want to delete this book?')) {
      try {
        const subject = subjects.find(s => s.name === subjectName);
        if (!subject) {
          alert('Subject not found');
          return;
        }

        const response = await fetch(`/api/admin/books?subjectId=${subject.id}&bookId=${bookId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setSubjects(prev => prev.map(s => 
            s.name === subjectName
              ? { ...s, books: s.books.filter((book: any) => book.id !== bookId) }
              : s
          ));
          alert('Book deleted successfully!');
        } else {
          throw new Error('Failed to delete book');
        }
      } catch (error) {
        alert('Failed to delete book. Please try again.');
        console.error('Error deleting book:', error);
      }
    }
  };

  const startEditSubject = (subject: any) => {
    setEditingSubject(subject);
    setSubjectName(subject.name);
    setShowEditSubjectModal(true);
  };

  const startEditBook = (subjectName: string, book: any) => {
    setEditingBook({ ...book, subjectName });
    setBookTitle(book.title);
    setBookGrade(book.grade);
    setBookDescription(book.description || '');
    setBookChapters(book.chapters?.toString() || '');
    setSelectedSubject(subjectName);
    setShowEditBookModal(true);
  };

  const updateSubject = async () => {
    if (subjectName.trim() && editingSubject) {
      try {
        const response = await fetch('/api/admin/subjects', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingSubject.id,
            name: subjectName,
          }),
        });

        if (response.ok) {
          setSubjects(prev => prev.map(subject => 
            subject.id === editingSubject.id
              ? { ...subject, name: subjectName }
              : subject
          ));
          setSubjectName('');
          setEditingSubject(null);
          setShowEditSubjectModal(false);
          alert('Subject updated successfully!');
        } else {
          throw new Error('Failed to update subject');
        }
      } catch (error) {
        alert('Failed to update subject. Please try again.');
        console.error('Error updating subject:', error);
      }
    }
  };

  const updateBook = async () => {
    if (bookTitle.trim() && bookGrade && editingBook) {
      try {
        const subject = subjects.find(s => s.name === editingBook.subjectName);
        if (!subject) {
          alert('Subject not found');
          return;
        }

        const response = await fetch('/api/admin/books', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subjectId: subject.id,
            bookId: editingBook.id,
            title: bookTitle,
            grade: bookGrade,
            description: bookDescription,
            chapters: parseInt(bookChapters) || 0
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSubjects(prev => prev.map(s => 
            s.name === editingBook.subjectName
              ? { 
                  ...s, 
                  books: s.books.map((book: any) => 
                    book.id === editingBook.id ? data.book : book
                  )
                }
              : s
          ));
          
          setBookTitle('');
          setBookGrade('');
          setBookDescription('');
          setBookChapters('');
          setSelectedSubject('');
          setEditingBook(null);
          setShowEditBookModal(false);
          alert('Book updated successfully!');
        } else {
          throw new Error('Failed to update book');
        }
      } catch (error) {
        alert('Failed to update book. Please try again.');
        console.error('Error updating book:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const ContentDetailsModal = () => (
    selectedContent && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto ">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Content Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <p className="text-gray-900">{selectedContent.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full capitalize">
                  {selectedContent.type}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <p className="text-gray-900">{selectedContent.author}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <p className="text-gray-900">{selectedContent.subject}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(selectedContent.status)}`}>
                  {selectedContent.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Views</label>
                <p className="text-gray-900">{selectedContent.views}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Submitted</label>
                <p className="text-gray-900">{selectedContent.submitted}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reports</label>
                <p className="text-gray-900">{selectedContent.reports}</p>
              </div>
            </div>

            {selectedContent.reports > 0 && (
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h4 className="font-medium text-red-800 mb-2">Reports</h4>
                <p className="text-sm text-red-700">This content has been reported {selectedContent.reports} time(s). Please review carefully.</p>
              </div>
            )}

            <div className="flex space-x-3">
              {selectedContent.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      updateItemStatus(selectedContent.id, 'approved');
                      setShowDetails(false);
                    }}
                    className="min-w-[44px] min-h-[44px] bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      updateItemStatus(selectedContent.id, 'rejected');
                      setShowDetails(false);
                    }}
                    className="min-w-[44px] min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Reject
                  </button>
                </>
              )}
              <button
                onClick={() => flagContent(selectedContent.id)}
                className={`min-w-[44px] min-h-[44px] font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap ${
                  selectedContent.flagged
                    ? 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                }`}
              >
                {selectedContent.flagged ? 'Unflag' : 'Flag'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar userRole="Admin" currentPage="monitoring" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
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

          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Content Monitoring</h1>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <p className="text-gray-600">Monitor and moderate content, track user activities</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('content')}
              className={`min-w-[44px] min-h-[44px] px-4 py-2 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap ${
                activeTab === 'content'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Content Review
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`min-w-[44px] min-h-[44px] px-4 py-2 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap ${
                activeTab === 'activity'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Activity Logs
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`min-w-[44px] min-h-[44px] px-4 py-2 rounded-full text-sm font-medium cursor-pointer whitespace-nowrap ${
                activeTab === 'subjects'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Subject Management
            </button>
          </div>

          {/* Content Review Tab */}
          {activeTab === 'content' && (
            <div>
              {/* Filters */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Search Content</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Search..."
                      />
                      <i className="ri-search-line absolute left-3 top-2.5 text-gray-400"></i>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Types</option>
                      <option value="book">Books</option>
                      <option value="question">Questions</option>
                      <option value="quiz">Quizzes</option>
                    </select>
                  </div>
                  
                  <div className="flex items-end space-x-2">
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setFilterStatus('');
                        setFilterType('');
                      }}
                      className="min-w-[44px] min-h-[44px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      Clear Filters
                    </button>
                 
                    <button
                      onClick={handleBulkApprove}
                      className="flex-1 min-w-[44px] min-h-[44px] bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      Bulk Approve
                    </button>
                    <button
                      onClick={handleBulkReject}
                      className="flex-1 min-w-[44px] min-h-[44px] bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      Bulk Reject
                    </button>
                  
                  </div>
                </div>
              </div>

              {/* Content Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Content Items ({filteredContent.length})
                    </h3>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={selectedItems.length === filteredContent.length && filteredContent.length > 0}
                          onChange={selectAll}
                          className="mr-2"
                        />
                        Select All
                      </label>
                      {selectedItems.length > 0 && (
                        <span className="text-sm text-blue-600 font-medium">
                          {selectedItems.length} selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-6 font-medium text-gray-900">
                          <input
                            type="checkbox"
                            checked={selectedItems.length === filteredContent.length && filteredContent.length > 0}
                            onChange={selectAll}
                          />
                        </th>
                        <th className="text-left py-3 px-6 font-medium text-gray-900">Content</th>
                        <th className="text-left py-3 px-6 font-medium text-gray-900">Type</th>
                        <th className="text-left py-3 px-6 font-medium text-gray-900">Author</th>
                        <th className="text-left py-3 px-6 font-medium text-gray-900">Status</th>
                        <th className="text-left py-3 px-6 font-medium text-gray-900">Views</th>
                        <th className="text-left py-3 px-6 font-medium text-gray-900">Reports</th>
                        <th className="text-left py-3 px-6 font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContent.map((item) => (
                        <tr key={item.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selectedItems.includes(item.id) ? 'bg-blue-50' : ''}`}>
                          <td className="py-4 px-6">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.id)}
                              onChange={() => toggleSelection(item.id)}
                            />
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3">
                              {item.flagged && (
                                <i className="ri-flag-fill text-red-500"></i>
                              )}
                              <div>
                                <p className="font-medium text-gray-900">{item.title}</p>
                                <p className="text-sm text-gray-600">{item.subject}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full capitalize">
                              {item.type}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-gray-600">{item.author}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-gray-600">{item.views}</td>
                          <td className="py-4 px-6">
                            {item.reports > 0 ? (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                {item.reports}
                              </span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => viewDetails(item)}
                                className="text-blue-600 hover:text-blue-700 cursor-pointer"
                                title="View Details"
                              >
                                <i className="ri-eye-line"></i>
                              </button>
                              {item.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => updateItemStatus(item.id, 'approved')}
                                    className="text-green-600 hover:text-green-700 cursor-pointer"
                                    title="Approve"
                                  >
                                    <i className="ri-check-line"></i>
                                  </button>
                                  <button
                                    onClick={() => updateItemStatus(item.id, 'rejected')}
                                    className="text-red-600 hover:text-red-700 cursor-pointer"
                                    title="Reject"
                                  >
                                    <i className="ri-close-line"></i>
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => flagContent(item.id)}
                                className={`cursor-pointer ${item.flagged ? 'text-gray-600 hover:text-gray-700' : 'text-yellow-600 hover:text-yellow-700'}`}
                                title={item.flagged ? 'Unflag' : 'Flag'}
                              >
                                <i className={`ri-flag-${item.flagged ? 'fill' : 'line'}`}></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Activity Logs Tab */}
          {activeTab === 'activity' && (
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-6 font-medium text-gray-900">User</th>
                        <th className="text-left py-3 px-6 font-medium text-gray-900">Action</th>
                        <th className="text-left py-3 px-6 font-medium text-gray-900">Target</th>
                        <th className="text-left py-3 px-6 font-medium text-gray-900">Timestamp</th>
                        <th className="text-left py-3 px-6 font-medium text-gray-900">IP Address</th>
                        <th className="text-left py-3 px-6 font-medium text-gray-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityLogs.map((log) => (
                        <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {log.user.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="font-medium text-gray-900">{log.user}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-gray-600">{log.action}</td>
                          <td className="py-4 px-6 text-gray-600">{log.target}</td>
                          <td className="py-4 px-6 text-gray-600 text-sm">{log.timestamp}</td>
                          <td className="py-4 px-6 text-gray-600 text-sm font-mono">{log.ip}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-1 text-xs rounded-full ${getActivityStatusColor(log.status)}`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Subject Management Tab */}
          {activeTab === 'subjects' && (
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Subject & Book Management</h3>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowSubjectModal(true)}
                      className="min-w-[44px] min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap flex items-center gap-2"
                    >
                      <i className="ri-add-line"></i>
                      Add Subject
                    </button>
                    <button
                      onClick={() => setShowBookModal(true)}
                      className="min-w-[44px] min-h-[44px] bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer whitespace-nowrap flex items-center gap-2"
                    >
                      <i className="ri-book-line"></i>
                      Add Book
                    </button>
                  </div>
                </div>
                
                {/* Grade Filter */}
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Filter by Grade:</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedGrade('')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          selectedGrade === ''
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        All Grades
                      </button>
                      {getAllGrades().map((grade) => (
                        <button
                          key={grade}
                          onClick={() => setSelectedGrade(grade)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            selectedGrade === grade
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {grade}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {subjectsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-gray-600">Loading subjects...</p>
                    </div>
                  ) : subjectsError ? (
                    <div className="text-center py-8">
                      <p className="text-red-600 mb-2">{subjectsError}</p>
                      <button
                        onClick={fetchSubjects}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : subjects.length === 0 ? (
                    <div className="text-center py-8">
                      <i className="ri-book-line text-4xl text-gray-400 mb-2"></i>
                      <p className="text-gray-600">No subjects created yet.</p>
                      <p className="text-gray-500 text-sm">Click "Add Subject" to create your first subject.</p>
                    </div>
                  ) : (
                    getBooksByGrade().map((subjectData) => {
                      const subject = subjects.find(s => s.name === subjectData.subject);
                      return (
                    <div key={subject.id} className="mb-6 border border-gray-200 rounded-lg">
                      <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-gray-900">{subject.name}</h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditSubject(subject)}
                            className="text-blue-600 hover:text-blue-700 cursor-pointer p-1"
                            title="Edit subject"
                          >
                            <i className="ri-edit-line"></i>
                          </button>
                          <button
                            onClick={() => deleteSubject(subject.id)}
                            className="text-red-600 hover:text-red-700 cursor-pointer p-1"
                            title="Delete subject"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        {subjectData.books.length > 0 ? (
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {subjectData.books.map((book: any) => (
                              <div key={book.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-medium text-gray-900">{book.title}</h5>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => startEditBook(subject.name, book)}
                                      className="text-blue-600 hover:text-blue-700 cursor-pointer p-1"
                                      title="Edit book"
                                    >
                                      <i className="ri-edit-line text-sm"></i>
                                    </button>
                                    <button
                                      onClick={() => deleteBook(subject.name, book.id)}
                                      className="text-red-600 hover:text-red-700 cursor-pointer p-1"
                                      title="Delete book"
                                    >
                                      <i className="ri-delete-bin-line text-sm"></i>
                                    </button>
                                  </div>
                                </div>
                                <p className="text-sm text-blue-600 font-medium mb-1">{book.grade}</p>
                                {book.chapters && book.chapters > 0 && (
                                  <p className="text-sm text-orange-600 font-medium mb-1">
                                    <i className="ri-book-open-line mr-1"></i>
                                    {book.chapters} Chapters
                                  </p>
                                )}
                                <p className="text-sm text-gray-600">{book.description}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-8">No books added to this subject yet.</p>
                        )}
                      </div>
                    </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDetails && <ContentDetailsModal />}
      
      {/* Add Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Add New Subject</h3>
                <button
                  onClick={() => setShowSubjectModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name</label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter subject name"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSubjectModal(false)}
                  className="flex-1 min-w-[44px] min-h-[44px] bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={addSubject}
                  className="flex-1 min-w-[44px] min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer"
                >
                  Add Subject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Book Modal */}
      {showBookModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Add New Book</h3>
                <button
                  onClick={() => setShowBookModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.name}>{subject.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Book Title</label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter book title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                <select
                  value={bookGrade}
                  onChange={(e) => setBookGrade(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select grade</option>
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                  <option value="Grade 4">Grade 4</option>
                  <option value="Grade 5">Grade 5</option>
                  <option value="Grade 6">Grade 6</option>
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Chapters</label>
                <input
                  type="number"
                  value={bookChapters}
                  onChange={(e) => setBookChapters(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter number of chapters"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={bookDescription}
                  onChange={(e) => setBookDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                  placeholder="Enter book description"
                />
              </div>
              
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowBookModal(false)}
                  className="flex-1 min-w-[44px] min-h-[44px] bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={addBook}
                  className="flex-1 min-w-[44px] min-h-[44px] bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer"
                >
                  Add Book
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {showEditSubjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Edit Subject</h3>
                <button
                  onClick={() => {
                    setShowEditSubjectModal(false);
                    setEditingSubject(null);
                    setSubjectName('');
                  }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name</label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter subject name"
                />
              </div>
              
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => {
                    setShowEditSubjectModal(false);
                    setEditingSubject(null);
                    setSubjectName('');
                  }}
                  className="flex-1 min-w-[44px] min-h-[44px] bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={updateSubject}
                  className="flex-1 min-w-[44px] min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer"
                >
                  Update Subject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Book Modal */}
      {showEditBookModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Edit Book</h3>
                <button
                  onClick={() => {
                    setShowEditBookModal(false);
                    setEditingBook(null);
                    setBookTitle('');
                    setBookGrade('');
                    setBookDescription('');
                    setBookChapters('');
                    setSelectedSubject('');
                  }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={selectedSubject}
                  disabled
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Book Title</label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter book title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                <select
                  value={bookGrade}
                  onChange={(e) => setBookGrade(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select grade</option>
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                  <option value="Grade 4">Grade 4</option>
                  <option value="Grade 5">Grade 5</option>
                  <option value="Grade 6">Grade 6</option>
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Chapters</label>
                <input
                  type="number"
                  value={bookChapters}
                  onChange={(e) => setBookChapters(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter number of chapters"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={bookDescription}
                  onChange={(e) => setBookDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                  placeholder="Enter book description"
                />
              </div>
              
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => {
                    setShowEditBookModal(false);
                    setEditingBook(null);
                    setBookTitle('');
                    setBookGrade('');
                    setBookDescription('');
                    setBookChapters('');
                    setSelectedSubject('');
                  }}
                  className="flex-1 min-w-[44px] min-h-[44px] bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={updateBook}
                  className="flex-1 min-w-[44px] min-h-[44px] bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg cursor-pointer"
                >
                  Update Book
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}