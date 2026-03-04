"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import QuestionForm, { QuestionFormData } from "@/components/QuestionForm";

interface QuestionCreationModePageProps {
  userRole: "Teacher" | "Content Creator";
  baseRoute: string; // e.g., "/teacher/create-questions" or "/content-creator/create"
  apiEndpoint: string; // e.g., "/api/teacher/questions" or "/api/oup-creator/questions"
  showTopicField?: boolean;
  showSloField?: boolean;
  embeddedMode?: boolean; // Set to true when used as a child component
  user?: any; // Optional: passed user data from parent
  onSwitchToBank?: () => void; // Callback to switch to Question Bank mode
}

export default function QuestionCreationModePage({
  userRole,
  baseRoute,
  apiEndpoint,
  showTopicField = false,
  showSloField = false,
  embeddedMode = false,
  user: propUser,
  onSwitchToBank,
}: QuestionCreationModePageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState("individual");
  const [isProceeding, setIsProceeding] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    grade: "",
    book: "",
  });
  const [systemBooks, setSystemBooks] = useState<any[]>([]); // Store all system books for content creators
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(() => {
    // Restore upload state from sessionStorage
    if (typeof window !== 'undefined') {
      const inProgress = sessionStorage.getItem('bulkUploadInProgress') === 'true';
      const savedTotal = parseInt(sessionStorage.getItem('bulkUploadTotal') || '0', 10);
      // Treat stale "in progress" with zero total as not uploading
      return inProgress && savedTotal > 0;
    }
    return false;
  });
  const [uploadProgress, setUploadProgress] = useState(() => {
    // Restore progress from sessionStorage
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('bulkUploadProgress');
      return saved ? parseInt(saved) : 0;
    }
    return 0;
  });
  const [totalQuestions, setTotalQuestions] = useState(() => {
    // Restore total from sessionStorage
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('bulkUploadTotal');
      return saved ? parseInt(saved) : 0;
    }
    return 0;
  });
  const [uploadMessage, setUploadMessage] = useState(() => {
    // Restore message from sessionStorage
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('bulkUploadMessage') || '';
    }
    return '';
  });
  const [showFloatingNotification, setShowFloatingNotification] = useState(false);
  const [floatingMessage, setFloatingMessage] = useState('');
  const [uploadStage, setUploadStage] = useState<'idle' | 'reading' | 'validating' | 'uploading' | 'finalizing'>('idle');
  const [chapters, setChapters] = useState<any[]>([]); // Store chapters for selected book
  const [subjectId, setSubjectId] = useState(""); // Track subject ID for chapter API
  const { user: hookUser, refresh: refreshUserProfile } = useUserProfile({ disabled: !!propUser });
  const user = propUser || hookUser; // Use prop if provided, otherwise use hook
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const uploadStageLabel =
    uploadStage === 'reading'
      ? 'Reading file...'
      : uploadStage === 'validating'
      ? 'Validating rows...'
      : uploadStage === 'uploading'
      ? 'Uploading questions...'
      : uploadStage === 'finalizing'
      ? 'Finalizing...'
      : '';

  // Fetch all books from system (for content creators to see all books of their assigned subject)
  useEffect(() => {
    const fetchSystemBooks = async () => {
      if (!user) return;
      
      try {
        console.log('[QuestionCreationModePage] User role:', user.role);
        console.log('[QuestionCreationModePage] User assignedBooks:', user.assignedBooks);
        console.log('[QuestionCreationModePage] User subjectGradePairs:', user.subjectGradePairs);
        
        // Extract unique subjects from all available sources on the profile
        const uniqueSubjects = new Set<string>();
        
        // Add subjects from assignedBooks
        if (user.assignedBooks && Array.isArray(user.assignedBooks)) {
          user.assignedBooks.forEach((book: any) => {
            if (book.subject) {
              uniqueSubjects.add(book.subject);
            }
          });
        }
        
        // Add subjects from subjectGradePairs
        if (user.subjectGradePairs && Array.isArray(user.subjectGradePairs)) {
          user.subjectGradePairs.forEach((pair: any) => {
            if (pair.subject) {
              uniqueSubjects.add(pair.subject);
            }
          });
        }

        // Add subjects from assignedSubjects array (strings or objects)
        if (user.assignedSubjects && Array.isArray(user.assignedSubjects)) {
          user.assignedSubjects.forEach((entry: any) => {
            const subjectName = typeof entry === "string" ? entry : entry?.subject;
            if (subjectName) {
              uniqueSubjects.add(subjectName);
            }
          });
        }
        
        const userSubjects = Array.from(uniqueSubjects);
        console.log('[QuestionCreationModePage] Unique subjects from both sources:', userSubjects);
        
        if (userSubjects.length === 0) {
          console.log('[QuestionCreationModePage] No subjects found - returning empty');
          return;
        }
        
        // Fetch all books for each assigned subject
        const allBooks: any[] = [];
        for (const subjectName of userSubjects) {
          try {
            console.log(`[QuestionCreationModePage] Fetching books for subject: ${subjectName}`);
            const booksResponse = await fetch(`/api/admin/books-by-subject?subject=${encodeURIComponent(subjectName)}`);
            if (booksResponse.ok) {
              const booksData = await booksResponse.json();
              const books = booksData.books || [];
              console.log(`[QuestionCreationModePage] Received ${books.length} books for ${subjectName}:`, books);
              
              // Ensure each book has the subject field set
              const booksWithSubject = books.map((book: any) => ({
                ...book,
                subject: book.subject || subjectName  // Use book's subject if exists, otherwise use the fetched subjectName
              }));
              
              allBooks.push(...booksWithSubject);
            } else {
              console.error(`[QuestionCreationModePage] Failed to fetch books for ${subjectName}:`, booksResponse.status, booksResponse.statusText);
            }
          } catch (error) {
            console.error(`[QuestionCreationModePage] Error fetching books for ${subjectName}:`, error);
          }
        }
        
        console.log(`[QuestionCreationModePage] Total systemBooks fetched: ${allBooks.length}`, allBooks);
        setSystemBooks(allBooks);
      } catch (error) {
        console.error('[QuestionCreationModePage] Error in fetchSystemBooks:', error);
      }
    };

    if (user?.role === 'content_creator') {
      fetchSystemBooks();
    }
  }, [user]);

  // Sync upload state with sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bulkUploadInProgress', isUploading.toString());
    }
  }, [isUploading]);

  // Guard against stale UI state from previous interrupted uploads
  useEffect(() => {
    if (isUploading && totalQuestions === 0 && uploadStage === 'idle') {
      setIsUploading(false);
      setUploadStage('idle');
    }
  }, [isUploading, totalQuestions, uploadStage]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bulkUploadProgress', uploadProgress.toString());
    }
  }, [uploadProgress]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bulkUploadTotal', totalQuestions.toString());
    }
  }, [totalQuestions]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bulkUploadMessage', uploadMessage);
    }
  }, [uploadMessage]);

  // Fetch chapters when book is selected
  const fetchChaptersForBook = async (bookId: string, subject: string) => {
    try {
      // Fetch chapters through unified endpoint (PostgreSQL first, Firebase fallback)
      const chaptersUrl = `/api/admin/chapters?subject=${encodeURIComponent(subject)}&bookId=${encodeURIComponent(bookId)}`;
      const chaptersResponse = await fetch(chaptersUrl);
      
      if (chaptersResponse.ok) {
        const data = await chaptersResponse.json();
        const rawChapters = data.chapters || [];
        const normalized = rawChapters.map((c: any, idx: number) => {
          if (typeof c === "string") {
            return { chapterNo: idx + 1, chapterName: c };
          }
          return {
            chapterNo: c?.chapterNo ?? c?.chapter_number ?? idx + 1,
            chapterName: c?.chapterName ?? c?.chapter_name ?? String(c || ""),
          };
        }).filter((c: any) => c.chapterName);
        setChapters(normalized);
      } else {
        setChapters([]);
      }
    } catch (error) {
      setChapters([]);
    }
  };

  // Note: Content creators can now select from multiple assigned subjects
  // Subject selection is handled in the form dropdown, not auto-filled

  // Get all unique grades from user's subjectGradePairs or assignedBooks
  const getAvailableGrades = useMemo(() => {
    return () => {
      // CONTENT CREATORS: Hard code grades 1-8
      if (userRole === "Content Creator") {
        const hardcodedGrades = ['1', '2', '3', '4', '5', '6', '7', '8'];
        return hardcodedGrades;
      }
      
      // TEACHERS: Show only assigned grades
      if (user?.subjectGradePairs && user.subjectGradePairs.length > 0) {
        const grades = user.subjectGradePairs
          .map((pair: any) => pair.grade)
          .filter((value: any, index: number, self: any) => self.indexOf(value) === index);
        return grades.sort();
      }
      
      // Fallback: use assignedBooks if no subjectGradePairs
      if (user?.assignedBooks && user.assignedBooks.length > 0) {
        const grades = user.assignedBooks
          .map((book: any) => book.grade)
          .filter((value: any, index: number, self: any) => self.indexOf(value) === index);
        return grades.sort();
      }
      
      // Last resort: use assignedGrades if available
      if (user?.assignedGrades && user.assignedGrades.length > 0) {
        return [...user.assignedGrades].sort();
      }
      
      return [];
    };
  }, [userRole, user?.subjectGradePairs, user?.assignedBooks, user?.assignedGrades]);

  // Helper function to display grade with "Class" prefix
  const displayGrade = (grade: string): string => {
    const gradeNum = grade.replace(/^(Grade|Class)\s+/i, '').trim();
    return `Class ${gradeNum}`;
  };

  // Get subjects from user's subjectGradePairs or assignedBooks
  const getAvailableSubjects = useMemo(() => {
    return () => {
      let subjects: string[] = [];
      
      // Helper function to normalize grades for comparison
      const normalizeGrade = (grade: string): string => {
        // Extract just the number: "Grade 1" -> "1", "Class 1" -> "1", "1" -> "1"
        return grade.replace(/^(Grade|Class)\s+/i, '').trim();
      };
      
      // If subjectGradePairs exists (Teachers), use it
      if (userRole === "Teacher" && user?.subjectGradePairs && user.subjectGradePairs.length > 0) {
        // If grade is selected, show only subjects for that grade
        if (formData.grade) {
          const selectedGradeNormalized = normalizeGrade(formData.grade);
          subjects = user.subjectGradePairs
            .filter((pair: any) => normalizeGrade(pair.grade) === selectedGradeNormalized)
            .map((pair: any) => pair.subject)
            .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index);
        } else {
          // No grade selected, show all subjects from pairs
          subjects = user.subjectGradePairs
            .map((pair: any) => pair.subject)
            .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index);
        }
      }
      // For Content Creators or Teachers without subjectGradePairs
      else if (user?.assignedBooks && user.assignedBooks.length > 0) {
        // Teachers: filter subjects by selected grade
        if (userRole === "Teacher" && formData.grade) {
          const selectedGradeNormalized = normalizeGrade(formData.grade);
          subjects = user.assignedBooks
            .filter((book: any) => normalizeGrade(book.grade) === selectedGradeNormalized)
            .map((book: any) => book.subject)
            .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index);
        } else {
          // Content creators: always show all assigned subjects (do not hide on grade change)
          subjects = user.assignedBooks
            .map((book: any) => book.subject)
            .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index);
        }
      }
      // Fallback: use assignedSubjects array if populated (strings or objects)
      else if (user?.assignedSubjects && user.assignedSubjects.length > 0) {
        subjects = user.assignedSubjects
          .map((entry: any) => (typeof entry === "string" ? entry : entry?.subject))
          .filter((subject: any): subject is string => Boolean(subject))
          .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index);
      }
      // Fallback: use subjects array if available
      else if (user?.subjects && user.subjects.length > 0) {
        subjects = [...user.subjects];
      }
      
      return subjects.sort();
    };
  }, [formData.grade, user?.subjectGradePairs, user?.assignedBooks, user?.subjects, userRole]);

  // Get available books for selected grade and subject
  const getAvailableBooks = useMemo(() => {
    return () => {
      console.log('[getAvailableBooks] Called with:', { subject: formData.subject, grade: formData.grade, userRole, systemBooksCount: systemBooks.length });
      
      let books: any[] = [];
      
      // Helper function to normalize grades for comparison
      const normalizeGrade = (grade: string): string => {
        // Extract just the number: "Grade 1" -> "1", "Class 1" -> "1", "1" -> "1"
        return grade.replace(/^(Grade|Class)\s+/i, '').trim();
      };
      
      // Must have at least a subject selected
      if (!formData.subject) {
        console.log('[getAvailableBooks] No subject selected - returning empty');
        return [];
      }
      
      // CONTENT CREATORS: Always use systemBooks if available (shows all books from PostgreSQL)
      if (userRole === "Content Creator" && systemBooks.length > 0) {
        console.log('[getAvailableBooks] Content Creator with systemBooks - using systemBooks');
        
        // Get all subjects the CC is assigned to
        const assignedSubjects = new Set<string>();
        if (user?.assignedBooks) {
          user.assignedBooks.forEach((b: any) => b.subject && assignedSubjects.add(b.subject));
        }
        if (user?.subjectGradePairs) {
          user.subjectGradePairs.forEach((p: any) => p.subject && assignedSubjects.add(p.subject));
        }
        if (user?.assignedSubjects && Array.isArray(user.assignedSubjects)) {
          user.assignedSubjects.forEach((entry: any) => {
            const subjectName = typeof entry === "string" ? entry : entry?.subject;
            if (subjectName) {
              assignedSubjects.add(subjectName);
            }
          });
        }
        
        const assignedSubjectsArray = Array.from(assignedSubjects);
        console.log('[getAvailableBooks] Assigned subjects:', assignedSubjectsArray);
        
        // Filter systemBooks to only show books of their assigned subjects (case-insensitive)
        const booksToSearch = systemBooks.filter((book: any) => {
          const hasMatch = assignedSubjectsArray.some((subj: any) => {
            const subjLower = subj.toString().trim().toLowerCase();
            const bookSubjLower = book.subject?.toString().trim().toLowerCase();
            return subjLower === bookSubjLower;
          });
          return hasMatch;
        });
        console.log('[getAvailableBooks] Filtered systemBooks by assigned subjects:', booksToSearch);
        
        // Filter by selected subject
        const booksForSubject = booksToSearch.filter((book: any) => {
          const bookSubject = book.subject.toString().trim().toLowerCase();
          const selectedSubject = formData.subject.toString().trim().toLowerCase();
          return bookSubject === selectedSubject;
        });
        console.log('[getAvailableBooks] Books after subject filter:', booksForSubject);
        
        // Filter by grade if selected
        if (formData.grade) {
          const selectedGradeNormalized = normalizeGrade(formData.grade);
          console.log('[getAvailableBooks] Filtering by grade. Selected grade normalized:', selectedGradeNormalized);
          books = booksForSubject.filter((book: any) => {
            const bookGrade = normalizeGrade(book.grade.toString());
            const matches = bookGrade === selectedGradeNormalized;
            console.log(`  Book "${book.title}": grade="${book.grade}", normalized="${bookGrade}", matches=${matches}`);
            return matches;
          });
          console.log('[getAvailableBooks] Books after grade filter:', books);
        } else {
          // No grade selected, show all books for the subject
          books = booksForSubject;
          console.log('[getAvailableBooks] No grade filter, using all books for subject');
        }
      }
      // Try subjectGradePairs (for teachers or as fallback)
      else if (user?.subjectGradePairs && user.subjectGradePairs.length > 0) {
        console.log('[getAvailableBooks] Using subjectGradePairs:', user.subjectGradePairs);
        const matchingPairs = user.subjectGradePairs.filter(
          (pair: any) => pair.subject === formData.subject
        );
        
        console.log('[getAvailableBooks] Matching pairs for subject:', matchingPairs);
        
        if (formData.grade) {
          // Grade is selected: show books for this grade + subject only
          const selectedGradeNormalized = normalizeGrade(formData.grade);
          console.log('[getAvailableBooks] Selected grade normalized:', selectedGradeNormalized);
          const matchingPair = matchingPairs.find(
            (pair: any) => {
              const pairGradeNormalized = normalizeGrade(pair.grade);
              return pairGradeNormalized === selectedGradeNormalized;
            }
          );
          if (matchingPair && matchingPair.assignedBooks) {
            books = matchingPair.assignedBooks;
            console.log('[getAvailableBooks] Found books from matching pair:', books);
          }
        } else if (userRole === "Content Creator") {
          // CONTENT CREATORS ONLY: No grade selected, show all books for this subject across all grades
          books = matchingPairs.flatMap((pair: any) => pair.assignedBooks || []);
          console.log('[getAvailableBooks] Content Creator - all books for subject:', books);
        }
        // TEACHERS: require grade to be selected (books will be empty if grade not selected)
      } 
      // Fallback to assignedBooks
      else if (user?.assignedBooks && user.assignedBooks.length > 0) {
        console.log('[getAvailableBooks] Using assignedBooks fallback. assignedBooks count:', user.assignedBooks.length);
        
        const booksForSubject = user.assignedBooks.filter((book: any) => {
          const bookSubject = book.subject.toString().trim().toLowerCase();
          const selectedSubject = formData.subject.toString().trim().toLowerCase();
          return bookSubject === selectedSubject;
        });
        
        console.log('[getAvailableBooks] Books after subject filter:', booksForSubject);
        
        if (formData.grade) {
          // Grade is selected: filter by both grade and subject
          const selectedGradeNormalized = normalizeGrade(formData.grade);
          console.log('[getAvailableBooks] Filtering by grade. Selected grade normalized:', selectedGradeNormalized);
          books = booksForSubject.filter((book: any) => {
            const bookGrade = normalizeGrade(book.grade.toString());
            const matches = bookGrade === selectedGradeNormalized;
            console.log(`  Book "${book.title}": grade="${book.grade}", normalized="${bookGrade}", matches=${matches}`);
            return matches;
          });
          console.log('[getAvailableBooks] Books after grade filter:', books);
        } else if (userRole === "Content Creator") {
          // CONTENT CREATORS ONLY: No grade selected, show all books for this subject
          books = booksForSubject;
          console.log('[getAvailableBooks] Content Creator - no grade filter, using all books for subject');
        }
        // TEACHERS: require grade to be selected (books will be empty if grade not selected)
      }
      
      // Remove duplicates by title
      const uniqueBooks = books.filter((book, index, self) => 
        index === self.findIndex(b => b.title === book.title)
      );
      
      console.log('[getAvailableBooks] Final unique books:', uniqueBooks);
      return uniqueBooks.sort((a, b) => a.title.localeCompare(b.title));
    };
  }, [formData.subject, formData.grade, user?.subjectGradePairs, user?.assignedBooks, userRole, systemBooks]);

  const handleGradeChange = (grade: string) => {
    setFormData({ ...formData, grade, book: "" });
  };

  const handleSubjectChange = (subject: string) => {
    setFormData({ ...formData, subject, book: "" });
  };

  const handleBookChange = (book: string) => {
    setFormData({ ...formData, book });
    // Fetch chapters for the selected book
    if (book && formData.subject && formData.grade) {
      // Normalize grade for comparison
      const normalizedFormGrade = formData.grade.replace(/^(Grade|Class)\s+/i, '').trim();
      
      // Try to find the book in assignedBooks first - match by title, subject, AND grade
      let selectedBook = user?.assignedBooks?.find((b: any) => {
        const normalizedBookGrade = (b.grade || '').replace(/^(Grade|Class)\s+/i, '').trim();
        return b.title === book && 
               b.subject === formData.subject && 
               normalizedBookGrade === normalizedFormGrade;
      });
      
      // Fallback to systemBooks if not found in assignedBooks - match by title, subject, AND grade
      if (!selectedBook && systemBooks.length > 0) {
        selectedBook = systemBooks.find((b: any) => {
          const normalizedBookGrade = (b.grade || '').replace(/^(Grade|Class)\s+/i, '').trim();
          return b.title === book && 
                 b.subject === formData.subject && 
                 normalizedBookGrade === normalizedFormGrade;
        });
      }
      
      if (selectedBook) {
        fetchChaptersForBook(selectedBook.id, formData.subject);
      } else {
        setChapters([]);
      }
    } else {
      setChapters([]);
    }
  };

  const downloadTemplate = () => {
    if (!formData.grade || !formData.subject || !formData.book) {
      return;
    }

    const gradeVal = formData.grade.replace(/^Grade\s*/i, "");
    const data = [
      ["Grade", gradeVal],
      ["Subject", formData.subject],
      ["Book", formData.book],
      [""],
      ["ChapterNo", "Chapter", "Topic", "SLO", "QuestionType", "Difficulty", "Question", "OptionA", "OptionB", "OptionC", "OptionD", "CorrectAnswer", "Explanation", "Knowledge", "Understanding", "Application"],
      ["1", "Introduction to Respiratory System", "Respiratory System Basics", "", "multiple", "Medium", "What is the main organ of the respiratory system?", "Lungs", "Heart", "Brain", "Liver", "A", "", "Y", "N", "N"],
      ["2", "Gas Exchange Process", "Gaseous Exchange", "Understand gas exchange", "multiple", "Medium", "What is the process of gas exchange in the lungs called?", "Osmosis", "Diffusion", "Respiration", "Photosynthesis", "B", "Gas exchange occurs through diffusion", "Y", "Y", "N"],
      ["1", "Introduction to Respiratory System", "Diaphragm Function", "", "short", "Hard", "Explain how the diaphragm works in breathing", "", "", "", "", "Muscle contracts and flattens to increase lung volume", "Contraction increases thoracic cavity volume", "N", "Y", "Y"],
      ["1", "Introduction to Respiratory System", "Breathing Mechanism", "", "truefalse", "Easy", "Is the diaphragm a muscle involved in breathing?", "", "", "", "", "True", "The diaphragm is the primary breathing muscle", "Y", "N", "N"],
      ["2", "Gas Exchange Process", "Alveoli Structure", "Know alveoli function", "short", "Medium", "What are the tiny air sacs in the lungs called?", "", "", "", "", "Alveoli", "Alveoli are the site of gas exchange", "Y", "Y", "N"],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
    XLSX.writeFile(
      workbook,
      `OUP_Questions_Template_${formData.subject}_${gradeVal}.xlsx`
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setIsUploading(false);
      setUploadProgress(0);
      setTotalQuestions(0);
      setUploadMessage(""); // Clear previous messages
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile || !formData.grade || !formData.subject || !formData.book) {
      setUploadMessage("Please select a file and ensure Grade, Subject, and Book are selected.");
      return;
    }

    setIsUploading(true);
    setUploadStage('reading');
    const uploadStart = Date.now();
    setUploadMessage("");

    let shouldResetSelectionAfterUpload = false;
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          setUploadStage('validating');
          const binaryString = event.target?.result;
          const workbook = XLSX.read(binaryString, { type: "binary" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Extract and validate metadata from first 3 rows (flexible column matching)
          let gradeFromFile = "";
          let subjectFromFile = "";
          let bookFromFile = "";

          // Row 1: Grade - find label in any column, take value from next column
          const row1 = data[0] as any[];
          if (row1) {
            const gradeIndex = row1.findIndex((cell) => cell?.toString().toLowerCase().trim() === "grade");
            if (gradeIndex !== -1 && gradeIndex + 1 < row1.length && row1[gradeIndex + 1]) {
              gradeFromFile = row1[gradeIndex + 1]?.toString().trim() || "";
            }
          }

          // Row 2: Subject - find label in any column, take value from next column
          const row2 = data[1] as any[];
          if (row2) {
            const subjectIndex = row2.findIndex((cell) => cell?.toString().toLowerCase().trim() === "subject");
            if (subjectIndex !== -1 && subjectIndex + 1 < row2.length && row2[subjectIndex + 1]) {
              subjectFromFile = row2[subjectIndex + 1]?.toString().trim() || "";
            }
          }

          // Row 3: Book - find label in any column, take value from next column
          const row3 = data[2] as any[];
          if (row3) {
            const bookIndex = row3.findIndex((cell) => cell?.toString().toLowerCase().trim() === "book");
            if (bookIndex !== -1 && bookIndex + 1 < row3.length && row3[bookIndex + 1]) {
              bookFromFile = row3[bookIndex + 1]?.toString().trim() || "";
            }
          }

          // Validate metadata matches selected dropdown values
          if (!gradeFromFile || !subjectFromFile || !bookFromFile) {
            setUploadMessage(
              "Error: File is missing metadata. First 3 rows should contain Grade, Subject, and Book information."
            );
            setIsUploading(false);
            setUploadStage('idle');
            return;
          }

          // Normalize for comparison (handle "Grade 6" vs "Grade6" etc)
          const normalizeGrade = (g: string) => g.replace(/\s+/g, "").toLowerCase();
          const normalizeText = (t: string) => t.trim().toLowerCase();

          if (
            normalizeGrade(gradeFromFile) !== normalizeGrade(formData.grade) ||
            normalizeText(subjectFromFile) !== normalizeText(formData.subject) ||
            normalizeText(bookFromFile) !== normalizeText(formData.book)
          ) {
            setUploadMessage(
              `File metadata mismatch! File contains:\n- Grade: ${gradeFromFile}\n- Subject: ${subjectFromFile}\n- Book: ${bookFromFile}\n\nBut you selected:\n- Grade: ${formData.grade}\n- Subject: ${formData.subject}\n- Book: ${formData.book}\n\nPlease ensure you're uploading the correct file.`
            );
            setIsUploading(false);
            setUploadStage('idle');
            return;
          }

          // Row 4 is empty (separator)
          // Row 5 (index 4) should have the headers
          const headerRowIndex = 4;
          let columnIndices: { [key: string]: number } = {};

          const headerRow = data[headerRowIndex] as any[];
          if (!headerRow) {
            setUploadMessage(
              "Could not find column headers. Expected headers in row 5 (after metadata)."
            );
            setIsUploading(false);
            return;
          }

          // Map column names to indices (case-insensitive, flexible matching)
          headerRow.forEach((header: any, index: number) => {
            const headerName = header?.toString().toLowerCase().trim() || "";
            columnIndices[headerName] = index;
          });

          // Debug: Log column indices for first upload
          console.log('[Bulk Upload] Column indices found in Excel:', columnIndices);
          console.log('[Bulk Upload] Looking for option columns (checking variations):', {
            'optiona': columnIndices["optiona"],
            'option a': columnIndices["option a"],
            'optionb': columnIndices["optionb"],
            'option b': columnIndices["option b"],
            'optionc': columnIndices["optionc"],
            'option c': columnIndices["option c"],
            'optiond': columnIndices["optiond"],
            'option d': columnIndices["option d"]
          });

          // Verify essential columns exist (check for key existence, not truthiness)
          if (!("question" in columnIndices) || !("questiontype" in columnIndices) || !("chapter" in columnIndices)) {
            const foundColumns = Object.keys(columnIndices).filter(k => k.length > 0).join(", ");
            setUploadMessage(
              `Error: Missing required columns 'Question', 'QuestionType', and 'Chapter'.\n\nFound columns: ${foundColumns || "none"}\n\nPlease ensure your file has headers in row 5 with column names like:\n'Question', 'QuestionType', 'Chapter', 'ChapterNo', 'OptionA', 'OptionB', 'OptionC', 'OptionD', 'CorrectAnswer', etc.`
            );
            setIsUploading(false);
            setUploadStage('idle');
            return;
          }

          if (chapters.length === 0) {
            setUploadMessage(
              `No chapters are configured for "${formData.book}". Please add chapters in system first, then upload.`
            );
            setIsUploading(false);
            setUploadStage('idle');
            return;
          }

          // Parse questions starting from row 6 (index 5) onwards
          const dataStartRow = 5;
          const questions = [];
          const errors: string[] = [];

          for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row = data[i] as any[];

            // Skip completely empty rows
            if (!row || row.every((cell) => !cell)) {
              continue;
            }

            // Extract values with flexible column name matching (case-insensitive)
            const chapterNo = row[columnIndices["chapternumber"] ?? columnIndices["chapter no"]]?.toString().trim() || "";
            const chapter = row[columnIndices["chapter"]]?.toString().trim() || "";
            const topic = row[columnIndices["topic"]]?.toString().trim() || "";
            const slo = row[columnIndices["slo"]]?.toString().trim() || "";
            const questionType = row[columnIndices["questiontype"]]?.toString().trim().toLowerCase() || "";
            const difficulty = row[columnIndices["difficulty"]]?.toString().trim() || "Medium";
            const question = row[columnIndices["question"]]?.toString().trim() || "";
            
            // Debug: Log question types to see what we're getting
            if (questions.length < 3) {
              console.log(`[Bulk Upload] Row ${i + 1} questionType: "${questionType}", question: "${question.substring(0, 40)}"`);
            }
            
            // Try multiple variations for option columns (with and without spaces)
            const optionA = row[columnIndices["optiona"] ?? columnIndices["option a"]]?.toString().trim() || "";
            const optionB = row[columnIndices["optionb"] ?? columnIndices["option b"]]?.toString().trim() || "";
            const optionC = row[columnIndices["optionc"] ?? columnIndices["option c"]]?.toString().trim() || "";
            const optionD = row[columnIndices["optiond"] ?? columnIndices["option d"]]?.toString().trim() || "";
            
            const correctAnswer = row[columnIndices["correctanswer"] ?? columnIndices["correct answer"]]?.toString().trim() || "";
            const explanation = row[columnIndices["explanation"]]?.toString().trim() || "";
            
            // Debug: Log first few rows with their options
            if (questions.length < 3) {
              const indexA = columnIndices["optiona"] ?? columnIndices["option a"];
              const indexB = columnIndices["optionb"] ?? columnIndices["option b"];
              const indexC = columnIndices["optionc"] ?? columnIndices["option c"];
              const indexD = columnIndices["optiond"] ?? columnIndices["option d"];
              
              console.log(`[Bulk Upload] Row ${i + 1} extraction:`, {
                questionType,
                question: question.substring(0, 50),
                'Column indices (A,B,C,D)': [indexA, indexB, indexC, indexD],
                'Raw cells': [row[indexA], row[indexB], row[indexC], row[indexD]],
                'After trim': { optionA, optionB, optionC, optionD }
              });
            }
            
            // Extract cognitive level columns (Y/N format)
            const knowledgeRaw = row[columnIndices["knowledge"]]?.toString().trim().toUpperCase() || "";
            const understandingRaw = row[columnIndices["understanding"]]?.toString().trim().toUpperCase() || "";
            const applicationRaw = row[columnIndices["application"]]?.toString().trim().toUpperCase() || "";

            // Parse Y/N values to boolean
            const knowledge = knowledgeRaw === "Y" ? true : false;
            const understanding = understandingRaw === "Y" ? true : false;
            const application = applicationRaw === "Y" ? true : false;

            // Validation: Check mandatory fields
            const missingFields: string[] = [];
            if (!question) missingFields.push("Question");
            if (!questionType) missingFields.push("QuestionType");
            if (!chapter) missingFields.push("Chapter");
            if (!correctAnswer) missingFields.push("CorrectAnswer");

            // Validate based on question type (normalize mcq to multiple for validation)
            const normalizedType = questionType === "mcq" ? "multiple" : questionType;
            if (normalizedType === "multiple") {
              if (!optionA || !optionB || !optionC || !optionD) missingFields.push("all options (A-D)");
            } else if (normalizedType === "short") {
              // Short answer questions require correctAnswer to be filled
              if (!correctAnswer) missingFields.push("CorrectAnswer (expected answer)");
            } else if (normalizedType === "truefalse") {
              if (!correctAnswer) missingFields.push("CorrectAnswer (True/False)");
            }

            // If there are missing mandatory fields, log error and skip
            if (missingFields.length > 0) {
              errors.push(`Row ${i + 1}: Missing ${missingFields.join(", ")}`);
              continue;
            }

            // Validate chapter exists in the system
            const chapterExists = chapters.some((c) => {
              const name = String(c.chapterName || "").toLowerCase().trim();
              const no = Number(c.chapterNo);
              return (
                (chapterNo && Number(chapterNo) === no) ||
                (chapter && chapter.toLowerCase().trim() === name)
              );
            });
            if (!chapterExists) {
              errors.push(
                `Row ${i + 1}: Chapter "${chapter || chapterNo}" does not exist in ${formData.book}. Available chapters: ${chapters.map((c) => `${c.chapterNo}. ${c.chapterName}`).join(", ")}`
              );
              continue;
            }

            // Create question object with correct field names for API
            // Normalize question type: "mcq" -> "multiple"
            const normalizedQuestionType = questionType === "mcq" ? "multiple" : 
                                          questionType === "short" ? "short" : 
                                          questionType === "truefalse" ? "truefalse" : 
                                          questionType;
            
            const questionObj = {
              type: normalizedQuestionType,
              subject: formData.subject,
              grade: formData.grade,
              book: formData.book,
              chapter: chapter, // Use chapter name directly from file
              topic: topic || "",
              slo: slo || "", // SLO is optional
              difficulty: difficulty || "Medium",
              questionText: question,
              options: (questionType === "multiple" || questionType === "mcq") ? [optionA, optionB, optionC, optionD] : [],
              correctAnswer: correctAnswer.toUpperCase(), // Normalize to uppercase
              explanation: explanation || "",
              cognitiveLevel: {
                knowledge: knowledge,
                understanding: understanding,
                application: application,
              },
            };
            
            // Log MCQ questions for debugging
            if ((questionType === "multiple" || questionType === "mcq") && questions.length < 3) {
              console.log('[Bulk Upload] MCQ Question:', {
                originalType: questionType,
                normalizedType: normalizedQuestionType,
                question: question.substring(0, 50),
                optionA,
                optionB,
                optionC,
                optionD,
                options: questionObj.options,
                correctAnswer: questionObj.correctAnswer
              });
            }
            
            questions.push(questionObj);
          }

          if (questions.length === 0) {
            const errorMsg =
              errors.length > 0
                ? `No valid questions found. Issues:\n${errors.slice(0, 5).join("\n")}`
                : "No valid questions found. Ensure all mandatory fields are filled.";
            setUploadMessage(errorMsg);
            setIsUploading(false);
            setUploadStage('idle');
            return;
          }

          // Show warning if some rows had errors
          if (errors.length > 0) {
          }

          // Upload each question to API
          let successCount = 0;
          const uploadErrors: string[] = [];
          setTotalQuestions(questions.length);
          setUploadProgress(0);
          setUploadStage('uploading');


          for (let index = 0; index < questions.length; index++) {
            const question = questions[index];
            
            // Log first MCQ being uploaded
            if (index === 0 && question.type === 'multiple') {
              console.log('[Bulk Upload] First MCQ being sent to API:', {
                type: question.type,
                questionText: question.questionText.substring(0, 50),
                options: question.options,
                correctAnswer: question.correctAnswer,
                fullPayload: question
              });
            }
            
            try {
              const response = await fetch(apiEndpoint, {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "x-user-id": user?.uid || "",
                  "x-user-name": user?.name || "",
                  "x-user-role": user?.role || "",
                  "x-school-id": user?.schoolId || "",
                  "x-school-name": user?.schoolName || "",
                },
                body: JSON.stringify(question),
              });

              if (!response.ok) {
                let errorMsg = "Unknown error";
                try {
                  const errorData = await response.json();
                  errorMsg = errorData.error || errorData.message || JSON.stringify(errorData);
                } catch (e) {
                  errorMsg = `HTTP ${response.status}: ${response.statusText}`;
                }
                uploadErrors.push(`Q: "${question.questionText.substring(0, 50)}..." - ${errorMsg}`);
              } else {
                successCount++;
              }
            } catch (uploadError) {
              const msg = uploadError instanceof Error ? uploadError.message : "Unknown error";
              uploadErrors.push(`Q: "${question.questionText.substring(0, 50)}..." - ${msg}`);
            }

            // Update progress after each completed upload
            const progressPercent = Math.round(((index + 1) / questions.length) * 100);
            setUploadProgress(progressPercent);
          }

          if (successCount > 0) {
            let message = "";
            if (uploadErrors.length > 0) {
              message = `✅ Partial Success!\n\nSuccessfully uploaded: ${successCount}/${questions.length} questions\nFailed: ${uploadErrors.length}\n\nErrors:\n${uploadErrors.slice(0, 3).join("\n")}`;
            } else {
              // Check if content creator (questions go for approval) or direct upload
              const isContentCreator = userRole === 'Content Creator';
              if (isContentCreator) {
                message = `🎉 Success!\n\n✅ All ${questions.length} questions have been submitted for approval!\n\nThey will be reviewed by the content manager for ${formData.subject} subject. You can track their status in the 'Question Status' section.`;
              } else {
                message = `🎉 Success!\n\n✅ Successfully uploaded all ${questions.length} questions to ${formData.book} (Grade ${formData.grade}, ${formData.subject})!`;
              }
            }
            setUploadMessage(message);
            
            // Show floating notification for full success
            if (successCount === questions.length) {
              setFloatingMessage(message);
              setShowFloatingNotification(true);
              // Auto-hide after 5 seconds
              setTimeout(() => setShowFloatingNotification(false), 5000);
              shouldResetSelectionAfterUpload = true;
            }
          } else {
            setUploadMessage(
              `❌ Upload Failed!\n\nAll ${questions.length} questions failed to upload.\n\nErrors:\n${uploadErrors.slice(0, 3).join("\n")}`
            );
          }
        } catch (error) {
          setUploadMessage(`Error processing file: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
          setUploadStage('finalizing');
          // Keep progress UI visible briefly even for very fast uploads
          const elapsed = Date.now() - uploadStart;
          if (elapsed < 900) {
            await new Promise((resolve) => setTimeout(resolve, 900 - elapsed));
          }
          setIsUploading(false);
          setUploadStage('idle');
          setTimeout(() => {
            setUploadProgress(0);
            if (shouldResetSelectionAfterUpload) {
              setSelectedFile(null);
              setFormData({ subject: "", grade: "", book: "" });
              const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
              if (fileInput) fileInput.value = "";
            }
          }, 800);
          // Clear sessionStorage when upload completes
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('bulkUploadInProgress');
            sessionStorage.removeItem('bulkUploadProgress');
            sessionStorage.removeItem('bulkUploadTotal');
            sessionStorage.removeItem('bulkUploadMessage');
          }
        }
      };
      reader.readAsBinaryString(selectedFile);
    } catch (error) {
      setUploadMessage(`Error uploading file: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsUploading(false);
      setUploadStage('idle');
    }
  };

  const buildRouteParams = () => {
    // encode values to ensure spaces/special chars don't break query parsing
    const params = new URLSearchParams();
    if (formData.grade) params.set('grade', formData.grade);
    if (formData.subject) params.set('subject', formData.subject);
    if (formData.book) params.set('book', formData.book);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  // submission handler for the question form (used both embedded and full-page)
  const handleQuestionSubmit = async (questionData: QuestionFormData) => {
    setFormLoading(true);
    try {
      const currentUser = propUser || user;
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser?.uid || "",
          "x-user-name": currentUser?.name || "",
          "x-user-role": userRole === "Teacher" ? "teacher" : "content-creator",
          "x-school-id": currentUser?.schoolId || "",
          "x-school-name": currentUser?.schoolName || "",
        },
        body: JSON.stringify({
          ...questionData,
          userId: currentUser?.uid,
          createdBy: currentUser?.uid,
        }),
      });
      if (!response.ok) throw new Error("Failed to create question");
    } catch {
      // QuestionForm handles its own error toast
    } finally {
      setFormLoading(false);
    }
  };

  if (embeddedMode) {
    const currentUser = propUser || user;

    const subjectSet = new Set<string>();
    const gradeSet = new Set<string>();
    const addSubject = (entry: any) => {
      const subjectName = typeof entry === "string" ? entry : entry?.subject;
      if (subjectName) {
        subjectSet.add(subjectName);
      }
    };
    const addGrade = (grade: any) => {
      if (grade || grade === 0) {
        gradeSet.add(grade.toString());
      }
    };

    if (currentUser?.assignedBooks && Array.isArray(currentUser.assignedBooks)) {
      currentUser.assignedBooks.forEach((book: any) => {
        addSubject(book.subject);
        addGrade(book.grade);
      });
    }

    if (currentUser?.subjectGradePairs && Array.isArray(currentUser.subjectGradePairs)) {
      currentUser.subjectGradePairs.forEach((pair: any) => {
        addSubject(pair.subject);
        addGrade(pair.grade);
      });
    }

    if (currentUser?.assignedSubjects && Array.isArray(currentUser.assignedSubjects)) {
      currentUser.assignedSubjects.forEach(addSubject);
    }

    let assignedSubjects: string[] = Array.from(subjectSet);
    let assignedGrades: string[] = Array.from(gradeSet);
    let availableBooks: any[] = [];

    if (userRole === "Content Creator") {
      const normalizedSubjects = new Set(
        assignedSubjects.map((subject) => subject.toString().trim().toLowerCase()).filter(Boolean)
      );
      availableBooks = (systemBooks || []).filter((book: any) => {
        const bookSubject = book.subject?.toString().trim().toLowerCase();
        return bookSubject ? normalizedSubjects.has(bookSubject) : false;
      });
    } else {
      if (currentUser?.assignedBooks && Array.isArray(currentUser.assignedBooks)) {
        availableBooks = currentUser.assignedBooks;
      } else if (currentUser?.subjectGradePairs && Array.isArray(currentUser.subjectGradePairs)) {
        availableBooks = [];
        currentUser.subjectGradePairs.forEach((pair: any) => {
          if (pair.assignedBooks && Array.isArray(pair.assignedBooks)) {
            availableBooks.push(...pair.assignedBooks);
          }
        });
      }
    }
    const allSubjects = Array.from(new Set(availableBooks.map((b: any) => b.subject).filter(Boolean))).sort();
    const allGrades = Array.from(new Set(availableBooks.map((b: any) => b.grade).filter(Boolean))).sort();

    const hasAssignments = userRole === "Content Creator"
      ? availableBooks.length > 0
      : assignedSubjects.length > 0 && assignedGrades.length > 0;

    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {!hasAssignments ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 text-sm text-yellow-800">
            <p className="font-medium mb-1">No assignments found</p>
            <p className="text-xs sm:text-sm">Please contact your school administrator to assign you subjects and books.</p>
          </div>
        ) : (
          <>
            <QuestionForm
              onSubmit={handleQuestionSubmit}
              onSwitchToBank={onSwitchToBank}
              loading={formLoading}
              subjects={allSubjects}
              grades={allGrades}
              submittedBooks={availableBooks}
              userId={currentUser?.uid}
              showTopicField={true}
              showSloField={true}
            />
          </>
        )}
      </div>
    );
  }

  // Full page mode with Sidebar
  return (
    <div className="h-screen bg-gray-50 w-screen overflow-hidden">
      <Sidebar
        userRole={userRole}
        currentPage="create"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Unified tabbed navigation header - always visible */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                className={`px-6 py-2 font-bold text-base sm:text-lg focus:outline-none transition-colors ${mode === "individual" ? "bg-[#162B56] text-white" : "bg-white text-[#162B56]"}`}
                onClick={() => setMode("individual")}
              >
                Create Questions
              </button>
              <button
                className={`px-6 py-2 font-bold text-base sm:text-lg focus:outline-none transition-colors ${mode === "bulk" ? "bg-[#162B56] text-white" : "bg-white text-[#162B56]"}`}
                onClick={() => setMode("bulk")}
              >
                Bulk Upload
              </button>
              <button
                className={`px-6 py-2 font-bold text-base sm:text-lg focus:outline-none transition-colors ${mode === "bank" ? "bg-[#162B56] text-white" : "bg-white text-[#162B56]"}`}
                onClick={() => setMode("bank")}
              >
                Question Bank
              </button>
            </div>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Main Content */}
      <div className="fixed top-[64px] right-0 bottom-0 left-0 lg:left-64 flex flex-col overflow-hidden">
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                  Question Creation
                </h3>
                <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <button
                    className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-lg font-medium text-sm ${
                      mode === "individual"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    onClick={() => setMode("individual")}
                  >
                    Individual
                  </button>
                  <button
                    className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-lg font-medium text-sm ${
                      mode === "bulk"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                    onClick={() => setMode("bulk")}
                  >
                    Bulk Upload
                  </button>
                  <button
                    onClick={downloadTemplate}
                    className={`w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-lg font-medium text-sm ${
                      formData.grade && formData.subject && formData.book
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    disabled={!formData.grade || !formData.subject || !formData.book}
                  >
                    Download Template
                  </button>
                </div>

                {mode === "individual" ? (
                  (!showQuestionForm ? (
                    <div className="space-y-4">
                      {(getAvailableGrades().length === 0) ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                        <p className="font-medium">No assignments found</p>
                        <p>Please contact your school administrator to assign you subjects and books.</p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Grade *
                          </label>
                          <select
                            value={formData.grade}
                            onChange={(e) => handleGradeChange(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select Grade</option>
                            {getAvailableGrades().map((grade: string) => (
                              <option key={grade} value={grade}>
                                {displayGrade(grade)}
                              </option>
                            ))}
                          </select>
                        </div>

                        {(formData.grade &&
                          (userRole === "Teacher" || userRole === "Content Creator")) && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Subject *
                            </label>
                            <select
                              value={formData.subject}
                              onChange={(e) => handleSubjectChange(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select Subject</option>
                              {getAvailableSubjects().map((subject) => (
                                <option key={subject} value={subject}>
                                  {subject}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {formData.grade && formData.subject && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Book *
                            </label>
                            {getAvailableBooks().length > 0 ? (
                              <select
                                value={formData.book}
                                onChange={(e) => handleBookChange(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select Book</option>
                                {getAvailableBooks().map((book) => (
                                  <option key={book.id} value={book.title}>
                                    {book.title}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <>
                                <input
                                  type="text"
                                  value={formData.book}
                                  onChange={(e) => handleBookChange(e.target.value)}
                                  placeholder="Enter Book Name"
                                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-amber-700 mt-1">
                                  Books are not available from Firebase backup. Enter book name manually.
                                </p>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {formData.book && !showQuestionForm && (
                      <button
                        onClick={() => {
                          setIsProceeding(true);
                          // instead of navigation display form inline
                          setShowQuestionForm(true);
                          setIsProceeding(false);
                        }}
                        disabled={isProceeding}
                        className="w-full min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isProceeding ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Proceeding...
                          </>
                        ) : (
                          "Proceed to Create Question"
                        )}
                      </button>
                    )}
                  </div>
                ) : null )
                ) : (
                  <div className="space-y-4">
                    {(getAvailableGrades().length === 0) ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                        <p className="font-medium">No assignments found</p>
                        <p>Please contact your school administrator to assign you subjects and books.</p>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Grade *
                          </label>
                          <select
                            value={formData.grade}
                            onChange={(e) => handleGradeChange(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select Grade</option>
                            {getAvailableGrades().map((grade: string) => (
                              <option key={grade} value={grade}>
                                {displayGrade(grade)}
                              </option>
                            ))}
                          </select>
                        </div>

                        {(formData.grade &&
                          (userRole === "Teacher" || userRole === "Content Creator")) && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Subject *
                            </label>
                            <select
                              value={formData.subject}
                              onChange={(e) => handleSubjectChange(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select Subject</option>
                              {getAvailableSubjects().map((subject) => (
                                <option key={subject} value={subject}>
                                  {subject}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {formData.grade && formData.subject && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Book *
                            </label>
                            {getAvailableBooks().length > 0 ? (
                              <select
                                value={formData.book}
                                onChange={(e) => handleBookChange(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select Book</option>
                                {getAvailableBooks().map((book) => (
                                  <option key={book.id} value={book.title}>
                                    {book.title}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <>
                                <input
                                  type="text"
                                  value={formData.book}
                                  onChange={(e) => handleBookChange(e.target.value)}
                                  placeholder="Enter Book Name"
                                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-amber-700 mt-1">
                                  Books are not available from Firebase backup. Enter book name manually.
                                </p>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {formData.book && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">Upload Questions File</h3>
                          <p className="text-sm text-gray-700 mb-4">
                            Select a CSV or Excel file with your questions. Download the template to see the correct format.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={downloadTemplate}
                              className="flex-1 min-h-[44px] px-4 py-2 rounded-lg font-medium text-sm bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <i className="ri-download-line"></i>
                              Download Template
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Choose File *
                          </label>
                          <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileChange}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Supported formats: .xlsx, .xls, .csv
                          </p>
                        </div>

                        {selectedFile && (
                          <>
                            {isUploading ? (
                              <div className="w-full space-y-2">
                                <p className="text-center text-sm font-medium text-blue-700">{uploadStageLabel}</p>
                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                  <div
                                    className="bg-blue-600 h-full transition-all duration-300 ease-out"
                                    style={{ width: `${totalQuestions > 0 ? uploadProgress : 15}%` }}
                                  ></div>
                                </div>
                                <p className="text-center text-sm font-medium text-gray-700">
                                  {totalQuestions > 0
                                    ? `${uploadProgress}% Uploaded (${uploadProgress === 0 ? 0 : Math.round((uploadProgress / 100) * totalQuestions)} of ${totalQuestions} questions)`
                                    : "Preparing upload..."}
                                </p>
                              </div>
                            ) : (
                              <button
                                onClick={handleBulkUpload}
                                disabled={isUploading}
                                className="w-full min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                              >
                                {isUploading ? "Uploading..." : "Upload Questions"}
                              </button>
                            )}
                          </>
                        )}

                        {uploadMessage && (
                          <div
                            className={`p-4 rounded-lg text-sm whitespace-pre-line font-semibold ${
                              uploadMessage.includes("Success!")
                                ? "bg-green-100 border-2 border-green-500 text-green-900 shadow-lg"
                                : uploadMessage.includes("Partial Success")
                                ? "bg-yellow-100 border-2 border-yellow-500 text-yellow-900 shadow-lg"
                                : "bg-red-100 border-2 border-red-500 text-red-900 shadow-lg"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>{uploadMessage}</div>
                              <button
                                onClick={() => setUploadMessage("")}
                                className="ml-4 text-lg font-bold hover:opacity-70"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {showQuestionForm && (
                <div className="mt-8">
                  <QuestionForm
                    onSubmit={handleQuestionSubmit}
                    onSwitchToBank={onSwitchToBank}
                    loading={formLoading}
                    submittedBooks={getAvailableBooks()}
                    subjects={getAvailableSubjects()}
                    grades={getAvailableGrades()}
                    defaultGrade={formData.grade}
                    defaultSubject={formData.subject}
                    defaultBook={formData.book}
                    showTopicField={showTopicField}
                    showSloField={showSloField}
                    userId={user?.uid}
                  />
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 sm:mt-6">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <i className="ri-information-line text-blue-600"></i>
                  Helpful Tips
                </h4>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>
                    • <strong>Individual:</strong> Create questions one at a time with full
                    control
                  </li>
                  <li>
                    • <strong>Bulk Upload:</strong> Import multiple questions from CSV/Excel
                  </li>
                  <li>• Download template for correct file format</li>

                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
  )
      {/* Floating Success Notification */}
      {showFloatingNotification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl max-w-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Upload Complete! 🎉</h3>
                <p className="text-sm text-green-100">
                  {floatingMessage.split('\n')[0]}
                </p>
              </div>
              <button
                onClick={() => setShowFloatingNotification(false)}
                className="flex-shrink-0 text-white hover:text-green-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

}
