"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

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
      return sessionStorage.getItem('bulkUploadInProgress') === 'true';
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
  const [chapters, setChapters] = useState<any[]>([]); // Store chapters for selected book
  const [subjectId, setSubjectId] = useState(""); // Track subject ID for chapter API
  const { user: hookUser } = useUserProfile();
  const user = propUser || hookUser; // Use prop if provided, otherwise use hook
  const router = useRouter();

  // Fetch all books from system (for content creators to see all books of their assigned subject)
  useEffect(() => {
    console.log('🔄 QuestionCreationModePage mounted - starting system books fetch');
    const fetchSystemBooks = async () => {
      if (!user) return;
      
      console.log('🔄 Fetching system books for CC assigned subjects...');
      try {
        // Extract unique subjects from assignedBooks
        const uniqueSubjects = new Set<string>();
        if (user.assignedBooks) {
          user.assignedBooks.forEach((book: any) => {
            if (book.subject) {
              uniqueSubjects.add(book.subject);
            }
          });
        }
        
        const userSubjects = Array.from(uniqueSubjects);
        console.log('👤 CC assigned subjects (from books):', userSubjects);
        
        if (userSubjects.length === 0) {
          console.log('⚠️ No subjects found in assignedBooks');
          return;
        }
        
        // Fetch all books for each assigned subject
        const allBooks: any[] = [];
        for (const subjectName of userSubjects) {
          try {
            const booksResponse = await fetch(`/api/admin/books-by-subject?subject=${encodeURIComponent(subjectName)}`);
            if (booksResponse.ok) {
              const booksData = await booksResponse.json();
              const books = booksData.books || [];
              console.log(`📚 Found ${books.length} books for ${subjectName}:`, books.map((b: any) => ({ id: b.id, title: b.title, grade: b.grade, subject: b.subject })));
              
              // Ensure each book has the subject field set
              const booksWithSubject = books.map((book: any) => ({
                ...book,
                subject: book.subject || subjectName  // Use book's subject if exists, otherwise use the fetched subjectName
              }));
              
              allBooks.push(...booksWithSubject);
            } else {
              console.error(`❌ Failed to fetch books for ${subjectName}:`, booksResponse.status);
            }
          } catch (error) {
            console.error(`Error fetching books for subject ${subjectName}:`, error);
          }
        }
        
        console.log('✅ System books loaded:', allBooks.length, 'books');
        console.log('📚 System books with subjects:', allBooks.map(b => ({ title: b.title, grade: b.grade, subject: b.subject })));
        setSystemBooks(allBooks);
      } catch (error) {
        console.error('❌ Error fetching system books:', error);
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
    console.log('📖 Fetching chapters for book:', { bookId, subject });
    try {
      // First, find the subject ID for this book
      const subjectsResponse = await fetch(
        'https://firestore.googleapis.com/v1/projects/quiz-app-ff0ab/databases/(default)/documents/subjects'
      );
      
      if (!subjectsResponse.ok) {
        console.error('❌ Failed to fetch subjects for chapter lookup');
        return;
      }
      
      const subjectsData = await subjectsResponse.json();
      const subjects = subjectsData.documents || [];
      
      let foundSubjectId = '';
      for (const subjectDoc of subjects) {
        const subjectName = subjectDoc.fields?.name?.stringValue || '';
        if (subjectName.toLowerCase() === subject.toLowerCase()) {
          foundSubjectId = subjectDoc.name.split('/').pop();
          console.log('✅ Found subject ID:', foundSubjectId, 'for subject:', subject);
          break;
        }
      }
      
      if (!foundSubjectId) {
        console.error('❌ No subject ID found for:', subject);
        return;
      }
      
      setSubjectId(foundSubjectId);
      
      // Now fetch chapters for this book
      const chaptersUrl = `/api/admin/books/chapters?bookId=${bookId}&subjectId=${foundSubjectId}`;
      console.log('📖 Fetching chapters from:', chaptersUrl);
      const chaptersResponse = await fetch(chaptersUrl);
      
      if (chaptersResponse.ok) {
        const data = await chaptersResponse.json();
        console.log('✅ Chapters fetched:', data.chapters?.length || 0, 'chapters');
        setChapters(data.chapters || []);
      } else {
        console.error('❌ Failed to fetch chapters:', chaptersResponse.status);
        setChapters([]);
      }
    } catch (error) {
      console.error('❌ Error fetching chapters:', error);
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
        console.log('✅ Content Creator - Hard coded grades:', hardcodedGrades);
        return hardcodedGrades;
      }
      
      // TEACHERS: Show only assigned grades
      if (user?.subjectGradePairs && user.subjectGradePairs.length > 0) {
        const grades = user.subjectGradePairs
          .map((pair: any) => pair.grade)
          .filter((value: any, index: number, self: any) => self.indexOf(value) === index);
        console.log('✅ Teacher - Grades from subjectGradePairs:', grades);
        return grades.sort();
      }
      
      // Fallback: use assignedBooks if no subjectGradePairs
      if (user?.assignedBooks && user.assignedBooks.length > 0) {
        const grades = user.assignedBooks
          .map((book: any) => book.grade)
          .filter((value: any, index: number, self: any) => self.indexOf(value) === index);
        console.log('✅ Teacher - Grades from assignedBooks:', grades);
        return grades.sort();
      }
      
      // Last resort: use assignedGrades if available
      if (user?.assignedGrades && user.assignedGrades.length > 0) {
        console.log('✅ Teacher - Grades from assignedGrades:', user.assignedGrades);
        return [...user.assignedGrades].sort();
      }
      
      console.log('⚠️ No grades found in user data:', {
        userRole,
        hasSubjectGradePairs: !!user?.subjectGradePairs?.length,
        hasAssignedBooks: !!user?.assignedBooks?.length,
        hasAssignedGrades: !!user?.assignedGrades?.length,
      });
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
      if (user?.subjectGradePairs && user.subjectGradePairs.length > 0) {
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
        // If grade is selected, filter by that grade
        if (formData.grade) {
          const selectedGradeNormalized = normalizeGrade(formData.grade);
          subjects = user.assignedBooks
            .filter((book: any) => normalizeGrade(book.grade) === selectedGradeNormalized)
            .map((book: any) => book.subject)
            .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index);
        } else {
          // No grade selected, show all subjects
          subjects = user.assignedBooks
            .map((book: any) => book.subject)
            .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index);
        }
      }
      // Fallback: use subjects array if available
      else if (user?.subjects && user.subjects.length > 0) {
        subjects = [...user.subjects];
      }
      
      console.log("Debug getAvailableSubjects:", {
        formGrade: formData.grade,
        normalizedGrade: formData.grade ? (formData.grade.replace(/^(Grade|Class)\s+/i, '').trim()) : "none",
        hasSubjectGradePairs: !!user?.subjectGradePairs?.length,
        hasAssignedBooks: !!user?.assignedBooks?.length,
        hasSubjects: !!user?.subjects?.length,
        returnedSubjects: subjects
      });
      
      return subjects.sort();
    };
  }, [formData.grade, user?.subjectGradePairs, user?.assignedBooks, user?.subjects]);

  // Get available books for selected grade and subject
  const getAvailableBooks = useMemo(() => {
    return () => {
      let books: any[] = [];
      
      // Helper function to normalize grades for comparison
      const normalizeGrade = (grade: string): string => {
        // Extract just the number: "Grade 1" -> "1", "Class 1" -> "1", "1" -> "1"
        return grade.replace(/^(Grade|Class)\s+/i, '').trim();
      };
      
      // Must have at least a subject selected
      if (!formData.subject) {
        console.log('📚 No subject selected');
        return [];
      }
      
      console.log('📚 Checking books with:', {
        userRole,
        hasSubjectGradePairs: !!user?.subjectGradePairs,
        subjectGradePairsLength: user?.subjectGradePairs?.length,
        hasAssignedBooks: !!user?.assignedBooks,
        assignedBooksLength: user?.assignedBooks?.length,
        formSubject: formData.subject,
        formGrade: formData.grade
      });
      
      // Try subjectGradePairs first
      if (user?.subjectGradePairs && user.subjectGradePairs.length > 0) {
        console.log('📚 Using subjectGradePairs');
        const matchingPairs = user.subjectGradePairs.filter(
          (pair: any) => pair.subject === formData.subject
        );
        
        console.log('📚 Matching pairs for subject:', matchingPairs.length);
        
        if (formData.grade) {
          // Grade is selected: show books for this grade + subject only
          const selectedGradeNormalized = normalizeGrade(formData.grade);
          console.log('📚 Looking for grade:', selectedGradeNormalized);
          const matchingPair = matchingPairs.find(
            (pair: any) => {
              const pairGradeNormalized = normalizeGrade(pair.grade);
              console.log(`  Pair grade: "${pair.grade}" (${pairGradeNormalized}) === ${selectedGradeNormalized}? ${pairGradeNormalized === selectedGradeNormalized}`);
              return pairGradeNormalized === selectedGradeNormalized;
            }
          );
          if (matchingPair && matchingPair.assignedBooks) {
            books = matchingPair.assignedBooks;
            console.log('📚 Found books from matching pair:', books.length);
          }
        } else if (userRole === "Content Creator") {
          // CONTENT CREATORS ONLY: No grade selected, show all books for this subject across all grades
          books = matchingPairs.flatMap((pair: any) => pair.assignedBooks || []);
          console.log('📚 Content Creator - showing all books for subject:', books.length);
        }
        // TEACHERS: require grade to be selected (books will be empty if grade not selected)
      } 
      // Fallback to assignedBooks
      else if (user?.assignedBooks && user.assignedBooks.length > 0) {
        console.log('📚 Using assignedBooks fallback');
        console.log('📚 systemBooks loaded?', systemBooks.length, 'books');
        
        // FOR CONTENT CREATORS: Use systemBooks to show ALL books of their assigned subjects
        let booksToSearch = user.assignedBooks;
        if (userRole === "Content Creator" && systemBooks.length > 0) {
          console.log('📚 Content Creator - using systemBooks');
          // Get all subjects the CC is assigned to
          const assignedSubjects = [...new Set(user.assignedBooks.map((b: any) => b.subject))];
          console.log('📚 Assigned subjects:', assignedSubjects);
          console.log('📚 All systemBooks:', systemBooks.map(b => ({ title: b.title, subject: b.subject, grade: b.grade })));
          
          // Filter systemBooks to only show books of their assigned subjects (case-insensitive)
          booksToSearch = systemBooks.filter((book: any) => {
            const hasMatch = assignedSubjects.some((subj: any) => {
              const subjLower = subj.toString().trim().toLowerCase();
              const bookSubjLower = book.subject?.toString().trim().toLowerCase();
              console.log(`  Comparing: "${subjLower}" === "${bookSubjLower}" ? ${subjLower === bookSubjLower}`);
              return subjLower === bookSubjLower;
            });
            return hasMatch;
          });
          console.log('📚 System books for assigned subjects:', booksToSearch.length);
        } else {
          console.log('📚 NOT using systemBooks - userRole:', userRole, 'systemBooks.length:', systemBooks.length);
        }
        
        const booksForSubject = booksToSearch.filter((book: any) => {
          const bookSubject = book.subject.toString().trim().toLowerCase();
          const selectedSubject = formData.subject.toString().trim().toLowerCase();
          return bookSubject === selectedSubject;
        });
        
        console.log('📚 Books matching subject:', booksForSubject.length);
        console.log('📚 All books for subject:', booksForSubject.map((b: any) => ({ title: b.title, grade: b.grade })));
        
        if (formData.grade) {
          // Grade is selected: filter by both grade and subject
          const selectedGradeNormalized = normalizeGrade(formData.grade);
          console.log('📚 Filtering by normalized grade:', selectedGradeNormalized);
          books = booksForSubject.filter((book: any) => {
            const bookGrade = normalizeGrade(book.grade.toString());
            const matches = bookGrade === selectedGradeNormalized;
            console.log(`  Book: "${book.title}" | Grade: "${book.grade}" (normalized: "${bookGrade}") === "${selectedGradeNormalized}"? ${matches}`);
            return matches;
          });
        } else if (userRole === "Content Creator") {
          // CONTENT CREATORS ONLY: No grade selected, show all books for this subject
          books = booksForSubject;
        }
        // TEACHERS: require grade to be selected (books will be empty if grade not selected)
      }
      
      // Remove duplicates by title
      const uniqueBooks = books.filter((book, index, self) => 
        index === self.findIndex(b => b.title === book.title)
      );
      
      console.log('📚 getAvailableBooks result:', {
        userRole,
        formGrade: formData.grade || 'not selected',
        formSubject: formData.subject,
        booksFound: uniqueBooks.length,
        books: uniqueBooks.map(b => ({ title: b.title, grade: b.grade, subject: b.subject }))
      });
      
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
        console.log('📚 Found book for bulk upload:', { 
          title: selectedBook.title, 
          id: selectedBook.id, 
          grade: selectedBook.grade, 
          subject: selectedBook.subject 
        });
        fetchChaptersForBook(selectedBook.id, formData.subject);
      } else {
        console.log('⚠️ No book found matching:', { title: book, subject: formData.subject, grade: formData.grade });
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

    const data = [
      ["Grade", formData.grade],
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
      `OUP_Questions_Template_${formData.subject}_${formData.grade}.xlsx`
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setUploadMessage(""); // Clear previous messages
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile || !formData.grade || !formData.subject || !formData.book) {
      setUploadMessage("Please select a file and ensure Grade, Subject, and Book are selected.");
      return;
    }

    setIsUploading(true);
    setUploadMessage("");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
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

          // Verify essential columns exist (check for key existence, not truthiness)
          if (!("question" in columnIndices) || !("questiontype" in columnIndices) || !("chapter" in columnIndices)) {
            const foundColumns = Object.keys(columnIndices).filter(k => k.length > 0).join(", ");
            setUploadMessage(
              `Error: Missing required columns 'Question', 'QuestionType', and 'Chapter'.\n\nFound columns: ${foundColumns || "none"}\n\nPlease ensure your file has headers in row 5 with column names like:\n'Question', 'QuestionType', 'Chapter', 'ChapterNo', 'OptionA', 'OptionB', 'OptionC', 'OptionD', 'CorrectAnswer', etc.`
            );
            console.log("Column indices found:", columnIndices);
            console.log("Header row:", headerRow);
            setIsUploading(false);
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
            const optionA = row[columnIndices["optiona"]]?.toString().trim() || "";
            const optionB = row[columnIndices["optionb"]]?.toString().trim() || "";
            const optionC = row[columnIndices["optionc"]]?.toString().trim() || "";
            const optionD = row[columnIndices["optiond"]]?.toString().trim() || "";
            const correctAnswer = row[columnIndices["correctanswer"]]?.toString().trim() || "";
            const explanation = row[columnIndices["explanation"]]?.toString().trim() || "";
            
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

            // Validate based on question type
            if (questionType === "multiple") {
              if (!optionA || !optionB || !optionC || !optionD) missingFields.push("all options (A-D)");
            } else if (questionType === "short") {
              // Short answer questions require correctAnswer to be filled
              if (!correctAnswer) missingFields.push("CorrectAnswer (expected answer)");
            } else if (questionType === "truefalse") {
              if (!correctAnswer) missingFields.push("CorrectAnswer (True/False)");
            }

            // If there are missing mandatory fields, log error and skip
            if (missingFields.length > 0) {
              errors.push(`Row ${i + 1}: Missing ${missingFields.join(", ")}`);
              continue;
            }

            // Validate chapter exists in the system
            if (chapters.length > 0) {
              const chapterExists = chapters.some(
                (c) =>
                  (chapterNo && parseInt(chapterNo) === c.chapterNo) ||
                  (chapter && chapter.toLowerCase() === c.chapterName.toLowerCase())
              );
              if (!chapterExists) {
                errors.push(
                  `Row ${i + 1}: Chapter "${chapter || chapterNo}" does not exist in ${formData.book}. Available chapters: ${chapters.map((c) => `${c.chapterNo}. ${c.chapterName}`).join(", ")}`
                );
                continue;
              }
            }

            // Create question object with correct field names for API
            const questionObj = {
              type: questionType === "multiple" ? "multiple" : questionType === "short" ? "short" : questionType === "truefalse" ? "truefalse" : questionType,
              subject: formData.subject,
              grade: formData.grade,
              book: formData.book,
              chapter: chapter, // Use chapter name directly from file
              topic: topic || "",
              slo: slo || "", // SLO is optional
              difficulty: difficulty || "Medium",
              questionText: question,
              options: questionType === "multiple" ? [optionA, optionB, optionC, optionD] : [],
              correctAnswer: correctAnswer.toUpperCase(), // Normalize to uppercase
              explanation: explanation || "",
              cognitiveLevel: {
                knowledge: knowledge,
                understanding: understanding,
                application: application,
              },
            };
            
            // Log first few questions for debugging
            if (questions.length < 3) {
              console.log(`📋 Bulk upload - Question ${i + 1}:`, {
                type: questionObj.type,
                subject: questionObj.subject,
                grade: questionObj.grade,
                book: questionObj.book,
                chapter: questionObj.chapter,
                slo: questionObj.slo,
                difficulty: questionObj.difficulty,
                questionText: questionObj.questionText.substring(0, 50),
                options: questionObj.options.length,
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
            return;
          }

          // Show warning if some rows had errors
          if (errors.length > 0) {
            console.warn(`Skipped ${errors.length} rows with errors:`, errors);
          }

          // Upload each question to API
          let successCount = 0;
          const uploadErrors: string[] = [];
          setTotalQuestions(questions.length);
          setUploadProgress(0);

          console.log("📤 Starting bulk upload of", questions.length, "questions");
          console.log("User object available:", user);
          console.log("User keys:", Object.keys(user || {}));
          console.log("First question sample:", questions[0]);

          for (let index = 0; index < questions.length; index++) {
            const question = questions[index];
            
            // Update progress
            const progressPercent = Math.round(((index + 1) / questions.length) * 100);
            setUploadProgress(progressPercent);
            
            // Small delay to allow UI to update and show progress
            await new Promise(resolve => setTimeout(resolve, 50));
            
            try {
              console.log("📝 Sending question:", question);
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
                console.warn(`❌ Upload failed for: "${question.questionText.substring(0, 50)}..." - ${errorMsg}`);
                uploadErrors.push(`Q: "${question.questionText.substring(0, 50)}..." - ${errorMsg}`);
              } else {
                console.log(`✅ Uploaded: "${question.questionText.substring(0, 50)}..."`);
                successCount++;
              }
            } catch (uploadError) {
              const msg = uploadError instanceof Error ? uploadError.message : "Unknown error";
              console.error(`❌ Error uploading: "${question.questionText.substring(0, 50)}..." - ${msg}`);
              uploadErrors.push(`Q: "${question.questionText.substring(0, 50)}..." - ${msg}`);
            }
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
              
              // Only reset if all were successful
              setSelectedFile(null);
              setFormData({ ...formData, subject: "", grade: "", book: "" });
              // Reset file input
              const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
              if (fileInput) fileInput.value = "";
            }
          } else {
            setUploadMessage(
              `❌ Upload Failed!\n\nAll ${questions.length} questions failed to upload.\n\nErrors:\n${uploadErrors.slice(0, 3).join("\n")}`
            );
          }
        } catch (error) {
          setUploadMessage(`Error processing file: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
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
    }
  };

  const buildRouteParams = () => {
    return `?grade=${formData.grade}&subject=${formData.subject}&book=${formData.book}`;
  };

  // When embedded in another page, render just the form content without Sidebar/layout
  if (embeddedMode) {
    return (
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
              <div className="space-y-4 sm:space-y-5">
                {(getAvailableGrades().length === 0) ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 text-sm text-yellow-800">
                    <p className="font-medium mb-1">No assignments found</p>
                    <p className="text-xs sm:text-sm">Please contact your school administrator to assign you subjects and books.</p>
                  </div>
                ) : (
                  <>
                    {/* For Content Creators: Subject Selection (from their assigned subjects) */}
                    {userRole === "Content Creator" && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          Subject *
                        </label>
                        <select
                          value={formData.subject}
                          onChange={(e) => handleSubjectChange(e.target.value)}
                          className="w-full px-3 py-2 sm:py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

                    {/* Grade Selection */}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Grade *
                      </label>
                      <select
                        value={formData.grade}
                        onChange={(e) => handleGradeChange(e.target.value)}
                        className="w-full px-3 py-2 sm:py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Grade</option>
                        {getAvailableGrades().map((grade: string) => (
                          <option key={grade} value={grade}>
                            {displayGrade(grade)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* For Teachers: Subject Selection (conditional on grade) */}
                    {userRole === "Teacher" && formData.grade && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          Subject *
                        </label>
                        <select
                          value={formData.subject}
                          onChange={(e) => handleSubjectChange(e.target.value)}
                          className="w-full px-3 py-2 sm:py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

                    {/* Book Selection - shown for both CC and Teachers when they have grade + subject */}
                    {formData.grade && formData.subject && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          Book *
                        </label>
                        <select
                          value={formData.book}
                          onChange={(e) => handleBookChange(e.target.value)}
                          className="w-full px-3 py-2 sm:py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Book</option>
                          {getAvailableBooks().map((book) => (
                            <option key={book.id} value={book.title}>
                              {book.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                {formData.book && (
                  <button
                    onClick={() => {
                      setIsProceeding(true);
                      router.push(`${baseRoute}/individual${buildRouteParams()}`);
                    }}
                    disabled={isProceeding}
                    className="w-full min-h-[44px] px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            ) : (
              <div className="space-y-4 sm:space-y-5 mt-6">
                {!formData.book && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 text-center">
                    <p className="text-sm text-gray-700">
                      Select a Grade, Subject, and Book above to upload questions.
                    </p>
                  </div>
                )}

                {formData.book && (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                      <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Upload Questions File</h3>
                      <p className="text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4">
                        Select a CSV or Excel file with your questions. Download the template to see the correct format.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button
                          onClick={downloadTemplate}
                          className="flex-1 min-h-[44px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <i className="ri-download-line"></i>
                          <span>Download Template</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Choose File *
                      </label>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        className="w-full px-3 py-2 sm:py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Supported formats: .xlsx, .xls, .csv
                      </p>
                    </div>

                    {selectedFile && (
                      <>
                        {isUploading ? (
                          <div className="w-full space-y-2">
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div
                                className="bg-blue-600 h-full transition-all duration-300 ease-out"
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                            <p className="text-center text-sm font-medium text-gray-700">
                              {uploadProgress}% Uploaded ({uploadProgress === 0 ? 0 : Math.round((uploadProgress / 100) * totalQuestions)} of {totalQuestions} questions)
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
                  </>
                )}
              </div>
            )}
          </div>

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

      <div className="fixed top-0 right-0 bottom-0 left-0 lg:left-64 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Create Question</h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto w-full">
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
                  <div className="space-y-4">
                    {(getAvailableGrades().length === 0) ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                        <p className="font-medium">No assignments found</p>
                        <p>Please contact your school administrator to assign you subjects and books.</p>
                      </div>
                    ) : (
                      <>
                        {userRole === "Content Creator" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Subject
                            </label>
                            <input
                              type="text"
                              value={formData.subject}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-700 cursor-not-allowed"
                            />
                          </div>
                        )}

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
                                {grade}
                              </option>
                            ))}
                          </select>
                        </div>

                        {userRole === "Teacher" && formData.grade && (
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
                          </div>
                        )}
                      </>
                    )}

                    {formData.book && (
                      <button
                        onClick={() => {
                          setIsProceeding(true);
                          router.push(`${baseRoute}/individual${buildRouteParams()}`);
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
                ) : (
                  <div className="space-y-4">
                    {(getAvailableGrades().length === 0) ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                        <p className="font-medium">No assignments found</p>
                        <p>Please contact your school administrator to assign you subjects and books.</p>
                      </div>
                    ) : (
                      <>
                        {userRole === "Content Creator" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Subject
                            </label>
                            <input
                              type="text"
                              value={formData.subject}
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-700 cursor-not-allowed"
                            />
                          </div>
                        )}

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

                        {userRole === "Teacher" && formData.grade && (
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
                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                  <div
                                    className="bg-blue-600 h-full transition-all duration-300 ease-out"
                                    style={{ width: `${uploadProgress}%` }}
                                  ></div>
                                </div>
                                <p className="text-center text-sm font-medium text-gray-700">
                                  {uploadProgress}% Uploaded ({uploadProgress === 0 ? 0 : Math.round((uploadProgress / 100) * totalQuestions)} of {totalQuestions} questions)
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
    </div>
  );
}
