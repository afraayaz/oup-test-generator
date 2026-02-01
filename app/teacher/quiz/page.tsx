"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/firebase/firebase';
import { collection, getDocs, addDoc, serverTimestamp, Timestamp, query, where } from 'firebase/firestore';
import Sidebar from '@/components/Sidebar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { v4 as uuidv4 } from 'uuid';
import { MathJax, MathJaxContext } from 'better-react-mathjax';

// Dynamic imports will be handled directly in the function

const shuffle = (array: any[], seed?: string): any[] => {
  const seededRandom = seed 
    ? (index: number): number => {
        const x = Math.sin(index + parseInt(seed.replace(/\D/g, ''))) * 10000;
        return x - Math.floor(x);
      }
    : Math.random;
  return [...array].sort(() => seededRandom(array.length) - 0.5);
};

const toUrduNumber = (num: number | string): string => {
  const urduNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().split('').map((digit: string) => urduNumerals[parseInt(digit)] || digit).join('');
};

const latexToReadable = (latex: string): string => {
  let readable = latex;
  
  // Remove \left and \right delimiters
  readable = readable.replace(/\\left/g, '');
  readable = readable.replace(/\\right/g, '');
  
  // Trigonometric and common functions
  readable = readable.replace(/\\sin/g, 'sin');
  readable = readable.replace(/\\cos/g, 'cos');
  readable = readable.replace(/\\tan/g, 'tan');
  readable = readable.replace(/\\log/g, 'log');
  readable = readable.replace(/\\ln/g, 'ln');
  readable = readable.replace(/\\exp/g, 'exp');
  
  // Convert fractions (with and without braces)
  readable = readable.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1/$2)');
  
  // Convert sqrt with braces
  readable = readable.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');
  
  // Convert sqrt without braces (followed by word characters or expressions)
  readable = readable.replace(/\\sqrt([a-zA-Z0-9²³⁰¹⁴⁵⁶⁷⁸⁹]+)/g, '√$1');
  
  // Handle superscripts with braces ^{...}
  readable = readable.replace(/\^\{([^{}]+)\}/g, (match: string, content: string): string => {
    // Convert single digits to Unicode superscripts
    if (/^[0-9]$/.test(content)) {
      const superscripts: { [key: string]: string } = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
      return superscripts[content] || '^' + content;
    }
    return '^(' + content + ')';
  });
  
  // Handle bare superscripts
  readable = readable.replace(/\^([0-9])/g, (match: string, num: string): string => {
    const superscripts: { [key: string]: string } = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    return superscripts[num] || '^' + num;
  });
  
  // Handle subscripts with braces _{...}
  readable = readable.replace(/_\{([^{}]+)\}/g, (match: string, content: string): string => {
    // Convert single digits to Unicode subscripts
    if (/^[0-9]$/.test(content)) {
      const subscripts: { [key: string]: string } = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
      return subscripts[content] || '_' + content;
    }
    return '_(' + content + ')';
  });
  
  // Handle bare subscripts
  readable = readable.replace(/_([0-9a-zA-Z])/g, (match: string, char: string): string => {
    if (/[0-9]/.test(char)) {
      const subscripts: { [key: string]: string } = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
      return subscripts[char] || '_' + char;
    }
    return '_' + char;
  });
  
  // Greek letters
  readable = readable.replace(/\\pi/g, 'π');
  readable = readable.replace(/\\alpha/g, 'α');
  readable = readable.replace(/\\beta/g, 'β');
  readable = readable.replace(/\\gamma/g, 'γ');
  readable = readable.replace(/\\delta/g, 'δ');
  readable = readable.replace(/\\epsilon/g, 'ε');
  readable = readable.replace(/\\theta/g, 'θ');
  readable = readable.replace(/\\lambda/g, 'λ');
  readable = readable.replace(/\\mu/g, 'μ');
  readable = readable.replace(/\\sigma/g, 'σ');
  readable = readable.replace(/\\omega/g, 'ω');
  
  // Math operators and symbols
  readable = readable.replace(/\\sum/g, 'Σ');
  readable = readable.replace(/\\int/g, '∫');
  readable = readable.replace(/\\infty/g, '∞');
  readable = readable.replace(/\\partial/g, '∂');
  readable = readable.replace(/\\nabla/g, '∇');
  readable = readable.replace(/\\cdots/g, '⋯');
  readable = readable.replace(/\\ldots/g, '…');
  
  // Comparison and relation symbols
  readable = readable.replace(/\\leq/g, '≤');
  readable = readable.replace(/\\geq/g, '≥');
  readable = readable.replace(/\\neq/g, '≠');
  readable = readable.replace(/\\approx/g, '≈');
  readable = readable.replace(/\\equiv/g, '≡');
  readable = readable.replace(/\\in/g, '∈');
  readable = readable.replace(/\\subset/g, '⊂');
  readable = readable.replace(/\\cup/g, '∪');
  readable = readable.replace(/\\cap/g, '∩');
  
  // Binary operators
  readable = readable.replace(/\\pm/g, '±');
  readable = readable.replace(/\\times/g, '×');
  readable = readable.replace(/\\div/g, '÷');
  readable = readable.replace(/\\cdot/g, '·');
  
  // Arrows
  readable = readable.replace(/\\rightarrow/g, '→');
  readable = readable.replace(/\\leftarrow/g, '←');
  readable = readable.replace(/\\leftrightarrow/g, '↔');
  readable = readable.replace(/\\Rightarrow/g, '⇒');
  
  // Logic symbols
  readable = readable.replace(/\\forall/g, '∀');
  readable = readable.replace(/\\exists/g, '∃');
  
  // Clean up remaining LaTeX syntax
  readable = readable.replace(/\\text\{([^{}]+)\}/g, '$1');
  readable = readable.replace(/\\mathrm\{([^{}]+)\}/g, '$1');
  readable = readable.replace(/\\mathbf\{([^{}]+)\}/g, '$1');
  readable = readable.replace(/\\\\/g, '');
  readable = readable.replace(/\{/g, '');
  readable = readable.replace(/\}/g, '');
  
  return readable;
};

const extractLatexFromFormulas = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  
  // Replace {formula:...} with inline math delimiters $...$
  let result = text;
  let index = 0;
  
  while (index < result.length) {
    const formulaStart = result.indexOf('{formula:', index);
    if (formulaStart === -1) break;
    
    // Find the matching closing brace by counting balance
    let braceCount = 1;
    let pos = formulaStart + 9; // Start after '{formula:'
    
    while (pos < result.length && braceCount > 0) {
      if (result[pos] === '{') braceCount++;
      else if (result[pos] === '}') braceCount--;
      pos++;
    }
    
    if (braceCount === 0) {
      const latex = result.substring(formulaStart + 9, pos - 1);
      // Wrap formula in inline math delimiters
      result = result.substring(0, formulaStart) + '$' + latex + '$' + result.substring(pos);
      index = formulaStart + latex.length + 2; // +2 for the $ delimiters
    } else {
      index = formulaStart + 9;
    }
  }
  
  return result;
};

const convertFormulasToReadable = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  
  let result = text;
  
  // First, handle legacy {formula:...} format
  let index = 0;
  while (index < result.length) {
    const formulaStart = result.indexOf('{formula:', index);
    if (formulaStart === -1) break;
    
    // Find the matching closing brace by counting balance
    let braceCount = 1;
    let pos = formulaStart + 9; // Start after '{formula:'
    
    while (pos < result.length && braceCount > 0) {
      if (result[pos] === '{') braceCount++;
      else if (result[pos] === '}') braceCount--;
      pos++;
    }
    
    if (braceCount === 0) {
      const latex = result.substring(formulaStart + 9, pos - 1);
      const readable = latexToReadable(latex);
      result = result.substring(0, formulaStart) + readable + result.substring(pos);
      index = formulaStart + readable.length;
    } else {
      index = formulaStart + 9;
    }
  }
  
  // Handle display math $$...$$ format (before inline to avoid conflicts)
  result = result.replace(/\$\$([^$]+)\$\$/g, (match: string, latex: string): string => {
    return latexToReadable(latex);
  });
  
  // Handle inline math $...$ format
  result = result.replace(/\$([^$]+)\$/g, (match: string, latex: string): string => {
    return latexToReadable(latex);
  });
  
  return result;
};

const QuizGeneration = () => {
  const { user } = useUserProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // QB Selection Step
  const [showQBSelection, setShowQBSelection] = useState(true);
  const [selectedQB, setSelectedQB] = useState<'oup' | 'school' | 'both' | null>(null);
  
  const [quizFormat, setQuizFormat] = useState(''); // 'Online' or 'Offline' - Empty means not yet selected
  const [showFormatModal, setShowFormatModal] = useState(false); // Show format selection after QB selection
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [selectedSLOs, setSelectedSLOs] = useState<string[]>([]);
  const [questionConfig, setQuestionConfig] = useState({
    // Basic question types (available for both Online and Offline)
    multiple: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 1 },
    truefalse: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 1 },
    short: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 2 },
    long: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 5 },
    fillblanks: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 1 },
    // Interactive question types (Online only)
    dragdrop: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 2 },
    diagramlabeling: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 3 },
    matching: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 2 },
    categorization: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 3 },
    ordering: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 2 }
  });
  
  // Question types metadata with isInteractive flag for filtering
  const questionTypes = [
    { key: 'multiple', label: 'Multiple Choice (MCQs)', icon: 'ri-checkbox-multiple-line', isInteractive: false },
    { key: 'truefalse', label: 'True/False', icon: 'ri-check-line', isInteractive: false },
    { key: 'short', label: 'Short Answer', icon: 'ri-text', isInteractive: false },
    { key: 'long', label: 'Long Answer', icon: 'ri-file-text-line', isInteractive: false },
    { key: 'fillblanks', label: 'Fill in the Blanks', icon: 'ri-input-cursor-move', isInteractive: false },
    // Commented out for now - interactive question types
    // { key: 'dragdrop', label: 'Drag & Drop', icon: 'ri-drag-move-line', isInteractive: true },
    // { key: 'diagramlabeling', label: 'Diagram Labeling', icon: 'ri-image-edit-line', isInteractive: true },
    // { key: 'matching', label: 'Textual Matching', icon: 'ri-links-line', isInteractive: true },
    // { key: 'categorization', label: 'Column Sorting', icon: 'ri-layout-column-line', isInteractive: true },
    // { key: 'ordering', label: 'Sequence Ordering', icon: 'ri-list-ordered', isInteractive: true }
  ];
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [timeLimit, setTimeLimit] = useState(30);
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizType, setQuizType] = useState('Weekly');
  const [isMarked, setIsMarked] = useState(true);
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editedQuestions, setEditedQuestions] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [hasQuestionType, setHasQuestionType] = useState(false);
  const [randomSeed, setRandomSeed] = useState<string>(uuidv4());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [availableChapters, setAvailableChapters] = useState<string[]>([]);
  const [availableSLOs, setAvailableSLOs] = useState<string[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [foundSubjectId, setFoundSubjectId] = useState(''); // Store the numeric subject ID found from API
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceQuestionIndex, setReplaceQuestionIndex] = useState<number | null>(null);
  const [replacementQuestions, setReplacementQuestions] = useState<any[]>([]);
  const [replaceLoading, setReplaceLoading] = useState<{ [key: number]: boolean }>({});
  const [answerLines, setAnswerLines] = useState<{ [key: number]: number }>({});
  const [defaultAnswerLines, setDefaultAnswerLines] = useState(4);
  const [assignedStudents, setAssignedStudents] = useState<string[]>([]);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [showStudentSelection, setShowStudentSelection] = useState(false);

  // Paper formatting settings
  const [paperFormat, setPaperFormat] = useState({
    questionFontSize: 17,
    questionFontFamily: 'Cambria',
    optionFontSize: 16,
    optionFontFamily: 'Cambria',
    questionLineSpacing: 1.7,
    answerLineSpacing: 24,
    questionMarginBottom: 28,
  });
  const [showFormatting, setShowFormatting] = useState(false);
  const [showCognitiveLevel, setShowCognitiveLevel] = useState(true);

  // Dynamic data from user profile
  const grades = user?.assignedGrades || [];
  const subjects = user?.subjects || [];
  const assignedBooks = user?.assignedBooks || [];
  const subjectGradePairs = user?.subjectGradePairs || [];
  
  // Helper function to normalize grades
  const normalizeGrade = (grade: string): string => {
    return String(grade).replace(/^(Grade|Class)\s+/i, '').trim();
  };
  
  // Extract unique subjects and grades - prefer subjectGradePairs for Teachers
  let uniqueSubjects: string[] = [];
  let uniqueGrades: string[] = [];
  
  if (subjectGradePairs.length > 0) {
    // Teachers with subjectGradePairs
    uniqueGrades = [...new Set(subjectGradePairs.map(p => normalizeGrade(p.grade)))];
    uniqueSubjects = [...new Set(subjectGradePairs.map(p => p.subject))];
  } else {
    // Fallback to assignedBooks
    uniqueSubjects = [...new Set(assignedBooks.map(b => b.subject))];
    uniqueGrades = [...new Set(assignedBooks.map(b => normalizeGrade(b.grade)))];
  }
  
  console.log(`📋 Initial unique subjects (from school books): ${uniqueSubjects.join(', ') || '(none)'}`);
  console.log(`📋 Initial unique grades (from school books): ${uniqueGrades.join(', ') || '(none)'}`);
  
  // If 'both' is selected, also include OUP subjects and grades
  if (selectedQB === 'both' && questions.length > 0) {
    console.log(`🔄 Merging OUP subjects and grades for 'both' mode...`);
    const oupSubjects = [...new Set(questions.map(q => q.subject).filter(Boolean))];
    const oupGrades = [...new Set(questions.map(q => (q.grade || q.class || '').toString()).filter(Boolean))];
    
    console.log(`📋 OUP subjects found: ${oupSubjects.join(', ') || '(none)'}`);
    console.log(`📋 OUP grades found: ${oupGrades.join(', ') || '(none)'}`);
    
    uniqueSubjects = [...new Set([...uniqueSubjects, ...oupSubjects])];
    uniqueGrades = [...new Set([...uniqueGrades, ...oupGrades])];
    
    console.log(`✓ Merged unique subjects: ${uniqueSubjects.join(', ')}`);
    console.log(`✓ Merged unique grades: ${uniqueGrades.join(', ')}`);
  }

  // Debug logging
  useEffect(() => {
    console.log('📚 User Profile Data:', {
      grades,
      subjects,
      assignedBooks: assignedBooks.length,
      assignedBooksData: assignedBooks,
      uniqueSubjects,
      uniqueGrades,
      selectedQB,
      questionsCount: questions.length
    });
  }, [grades, subjects, assignedBooks, selectedQB, questions]);
  
  // Build books object from assignedBooks/subjectGradePairs and OUP questions
  // Store book objects with both title and id
  const books: { [grade: string]: { [subject: string]: any[] } } = {};
  const bookIdMap: { [bookTitle: string]: string } = {}; // Map book title to its ID
  const subjectIdMap: { [subjectName: string]: string } = {}; // Map subject name to its ID
  
  // Add school books
  uniqueGrades.forEach(grade => {
    books[String(grade)] = {};
    uniqueSubjects.forEach(subject => {
      if (subjectGradePairs.length > 0) {
        // Use subjectGradePairs for Teachers
        books[String(grade)][subject] = subjectGradePairs
          .filter(p => normalizeGrade(p.grade) === grade && p.subject === subject)
          .flatMap(p => p.assignedBooks || [])
          .map((book: any) => {
            const bookObj = typeof book === 'string' ? { title: book } : book;
            if (bookObj && typeof bookObj === 'object' && 'id' in bookObj && 'title' in bookObj) {
              // Use composite key: subject-grade-title to handle same book name across different grades
              const bookKey = `${subject}-${grade}-${bookObj.title}`;
              bookIdMap[bookKey] = bookObj.id as string;
            }
            // Track subject ID if available
            if (bookObj && typeof bookObj === 'object' && 'subjectId' in bookObj) {
              subjectIdMap[subject] = bookObj.subjectId as string;
            }
            return bookObj;
          });
      } else {
        // Fallback to assignedBooks
        books[String(grade)][subject] = assignedBooks
          .filter(book => {
            const normalizedBookGrade = normalizeGrade(book.grade);
            return normalizedBookGrade === grade && book.subject === subject;
          })
          .map((book: any) => {
            if (book && typeof book === 'object' && 'id' in book && 'title' in book) {
              // Use composite key: subject-grade-title to handle same book name across different grades
              const normalizedBookGrade = normalizeGrade(book.grade);
              const bookKey = `${book.subject}-${normalizedBookGrade}-${book.title}`;
              bookIdMap[bookKey] = book.id;
            }
            // Track subject ID if available
            if (book && typeof book === 'object' && 'subjectId' in book) {
              subjectIdMap[subject] = book.subjectId;
            }
            return book;
          });
      }
    });
  });
  
  // Add OUP books if 'both' is selected
  if (selectedQB === 'both' && questions.length > 0) {
    console.log('📖 Adding OUP books to selection...');
    questions.forEach(q => {
      const qGrade = (q.grade || q.class || '').toString();
      const qSubject = q.subject || '';
      const qBook = q.book || '';
      
      if (qGrade && qSubject && qBook) {
        if (!books[qGrade]) {
          books[qGrade] = {};
        }
        if (!books[qGrade][qSubject]) {
          books[qGrade][qSubject] = [];
        }
        if (!books[qGrade][qSubject].includes(qBook)) {
          books[qGrade][qSubject].push(qBook);
          console.log(`✓ Added OUP book: ${qBook} (Grade ${qGrade}, ${qSubject})`);
        }
      }
    });
  }
  
  console.log('📚 Final books object:', books);

  const quizTypes = ['Weekly', 'Monthly', 'Half Yearly', 'Final Exam', 'Other'];
  const maxQuestions = 200;
  const maxTimeLimit = 300;
  const optionLabels = (isRTL: boolean): string[] => isRTL ? ['ا', 'ب', 'ج', 'د', 'ھ', 'و'] : ['A', 'B', 'C', 'D', 'E', 'F'];

  // Fetch students in the selected grade
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedGrade || !user?.schoolId) {
        setAvailableStudents([]);
        return;
      }
      
      try {
        const response = await fetch(`/api/teacher/students?schoolId=${user.schoolId}&grade=${encodeURIComponent(selectedGrade)}`);
        if (response.ok) {
          const data = await response.json();
          setAvailableStudents(data.students || []);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        setAvailableStudents([]);
      }
    };
    
    fetchStudents();
  }, [selectedGrade, user?.schoolId]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        if (!user?.schoolId) return;
        
        console.log(`🔄 Fetching questions for QB: ${selectedQB}`);
        let allQuestions: any[] = [];
        
        // Fetch from school questions if QB is 'school' or 'both'
        if (selectedQB === 'school' || selectedQB === 'both') {
          try {
            console.log(`📚 Fetching school questions from questions/schools/${user.schoolId}...`);
            const schoolQuestionsRef = collection(db, 'questions', 'schools', user.schoolId);
            const snapshot = await getDocs(schoolQuestionsRef);
            const questionList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log(`✓ Found ${questionList.length} school questions`);
            allQuestions = [...allQuestions, ...questionList];
          } catch (error) {
            console.error('Error fetching school questions:', error);
          }
        }
        
        // Fetch from OUP questions if QB is 'oup' or 'both'
        if (selectedQB === 'oup' || selectedQB === 'both') {
          try {
            console.log(`📚 Fetching OUP questions from questions/oup/items...`);
            const oupQuestionsRef = collection(db, 'questions', 'oup', 'items');
            const snapshot = await getDocs(oupQuestionsRef);
            const questionList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log(`✓ Found ${questionList.length} OUP questions`);
            allQuestions = [...allQuestions, ...questionList];
          } catch (error) {
            console.error('Error fetching OUP questions:', error);
          }
        }
        
        console.log(`📊 Total questions after fetch: ${allQuestions.length}`);
        setHasQuestionType(allQuestions.some(q => q.type || q.questionType));
        setQuestions(allQuestions);
      } catch (error) {
        console.error('Fetch error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert('Failed to fetch questions: ' + errorMessage);
      }
    };
    
    if (user?.schoolId && selectedQB) {
      fetchQuestions();
    }
  }, [user?.schoolId, selectedQB]);

  // Show format modal automatically when QB is selected but format is not
  useEffect(() => {
    if (selectedQB && !quizFormat) {
      setShowFormatModal(true);
    }
  }, [selectedQB, quizFormat]);

  // Dynamically fetch available chapters and SLOs based on selected grade, subject, and book
  // Chapters are consistent across all accounts, SLOs vary based on QB source and available questions
  useEffect(() => {
    const fetchChaptersAndSLOs = async () => {
      console.log('🔍 fetchChaptersAndSLOs triggered with:', { selectedSubject, selectedBook, selectedGrade });
      
      // Reset if missing subject/book (chapters need these)
      if (!selectedSubject || !selectedBook) {
        console.log('⚠️ Missing subject or book, resetting chapters');
        setIsLoadingChapters(false);
        setAvailableChapters([]);
        setAvailableSLOs([]);
        return;
      }

      setIsLoadingChapters(true);
      try {
        // Fetch chapters from API (consistent across all accounts) - doesn't require questions to be loaded
        const normalizedGrade = normalizeGrade(selectedGrade);
        const bookKey = `${selectedSubject}-${normalizedGrade}-${selectedBook}`;
        const bookId = bookIdMap[bookKey];
        const subjectId = subjectIdMap[selectedSubject];
        const url = `/api/admin/chapters?subject=${encodeURIComponent(selectedSubject)}&book=${encodeURIComponent(selectedBook)}&bookId=${encodeURIComponent(bookId || '')}&subjectId=${encodeURIComponent(subjectId || '')}`;
        console.log('🌐 Calling chapters API:', url, { selectedSubject, selectedBook, selectedGrade, normalizedGrade, bookKey, subjectId, bookId });
        
        const chaptersResponse = await fetch(url);
        const chaptersData = await chaptersResponse.json();
        let chapters = chaptersData.chapters || [];
        
        // Strip quotes from chapter names if they exist
        chapters = chapters.map((ch: string) => {
          let cleaned = ch.trim();
          if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.slice(1, -1);
          }
          return cleaned;
        });

        console.log('📚 Chapters API Response:', {
          status: chaptersResponse.status,
          selectedBook,
          selectedSubject,
          chaptersCount: chapters.length,
          chapters,
          chaptersDebug: chapters.map((c: string) => `"${c}"`),
          source: chaptersData.source,
          foundSubjectId: chaptersData.subjectId,
          error: chaptersData.error
        });

        setAvailableChapters(chapters);
        setIsLoadingChapters(false);
        
        // Save the numeric subject ID that was found
        if (chaptersData.subjectId) {
          setFoundSubjectId(chaptersData.subjectId);
          console.log('✅ Saved subject ID:', chaptersData.subjectId);
        }

        // Now fetch SLOs based on selected QB source and chapters (only if questions are loaded)
        if (!selectedGrade || questions.length === 0) {
          console.log('ℹ️ Skipping SLO fetch - missing grade or no questions loaded');
          setAvailableSLOs([]);
          setSelectedChapters([]);
          setSelectedSLOs([]);
          return;
        }

        const selectedGradeNormalized = String(selectedGrade).replace('Grade ', '').trim().toLowerCase();
        const selectedSubjectLower = selectedSubject.toLowerCase();
        const selectedBookLower = selectedBook.toLowerCase();
        // Reuse bookKey and bookId from above
        const selectedBookId = bookId;

        const slosSet = new Set<string>();

        questions.forEach(q => {
          const qGradeNormalized = (q.grade || q.class || '').toString().replace('Grade ', '').trim().toLowerCase();
          const qSubject = (q.subject || '').toLowerCase();
          const qBook = (q.book || '').toLowerCase();
          const qSLO = q.slo || '';
          
          // Match grade, subject, and book (with numeric ID support)
          const bookMatch = qBook === selectedBookLower || 
                           qBook === selectedBookId?.toString().toLowerCase() ||
                           qBook === selectedBookId;

          if (qGradeNormalized === selectedGradeNormalized &&
              qSubject === selectedSubjectLower &&
              bookMatch &&
              qSLO) {
            slosSet.add(qSLO);
          }
        });

        const slos = Array.from(slosSet).sort();

        console.log('✅ SLOs for QB source:', {
          selectedQB,
          slos,
          sloCount: slos.length
        });

        setAvailableSLOs(slos);
        
        // Reset selected chapters and SLOs when filters change
        setSelectedChapters([]);
        setSelectedSLOs([]);
      } catch (error) {
        console.error('❌ Error fetching chapters and SLOs:', error);
        setIsLoadingChapters(false);
        setAvailableChapters([]);
        setAvailableSLOs([]);
      }
    };

    fetchChaptersAndSLOs();
  }, [selectedGrade, selectedSubject, selectedBook, questions, selectedQB]);

  // Reset question configuration when grade/subject/book changes
  useEffect(() => {
    setQuestionConfig({
      // Basic question types
      multiple: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 1 },
      truefalse: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 1 },
      short: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 2 },
      long: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 5 },
      fillblanks: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 1 },
      // Interactive question types
      dragdrop: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 2 },
      diagramlabeling: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 3 },
      matching: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 2 },
      categorization: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 3 },
      ordering: { count: 0, difficulties: ['Easy', 'Medium', 'Hard'], marks: 2 }
    });
    setSelectedChapters([]);
    setSelectedSLOs([]);
  }, [selectedGrade, selectedSubject, selectedBook]);

  // Sync settings state when editor opens with an existing quiz
  useEffect(() => {
    if (showEditor && generatedQuiz) {
      // Set time limit or default to 30
      setTimeLimit(generatedQuiz.timeLimitMinutes || 30);
      
      // Set scheduled start or reset to empty
      if (generatedQuiz.schedule?.startAt) {
        const startDate = generatedQuiz.schedule.startAt.toDate ? generatedQuiz.schedule.startAt.toDate() : new Date(generatedQuiz.schedule.startAt);
        const localStart = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setScheduledStart(localStart);
      } else {
        setScheduledStart('');
      }
      
      // Set scheduled end or reset to empty
      if (generatedQuiz.schedule?.endAt) {
        const endDate = generatedQuiz.schedule.endAt.toDate ? generatedQuiz.schedule.endAt.toDate() : new Date(generatedQuiz.schedule.endAt);
        const localEnd = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setScheduledEnd(localEnd);
      } else {
        setScheduledEnd('');
      }
    }
  }, [showEditor, generatedQuiz]);

  const getAvailableChapters = useCallback(() => {
    return availableChapters;
  }, [availableChapters]);

  const getAvailableSLOs = useCallback(() => {
    if (!selectedGrade || !selectedSubject || !selectedBook || selectedChapters.length === 0) return [];
    
    console.log('🔎 Getting available SLOs for:', { selectedGrade, selectedSubject, selectedBook, selectedChapters, foundSubjectId });
    
    // Filter questions by selected chapters to get SLOs
    const slos = new Set<string>();
    const selectedGradeNormalized = String(selectedGrade).replace(/^(Grade|Class)\s+/i, '').trim().toLowerCase();
    const selectedSubjectLower = selectedSubject.toLowerCase();
    const selectedBookLower = selectedBook.toLowerCase();
    
    // Get the numeric IDs for subject and book
    const normalizedGradeForKey = normalizeGrade(selectedGrade);
    const bookKey = `${selectedSubject}-${normalizedGradeForKey}-${selectedBook}`;
    const numericSubjectId = foundSubjectId || subjectIdMap[selectedSubject] || selectedSubject;
    const numericBookId = (bookIdMap[bookKey] || selectedBook) as string;
    
    console.log('📌 Using IDs:', { numericSubjectId, numericBookId, bookKey, selectedSubject, selectedBook, foundSubjectId });
    
    let matchedCount = 0;
    let failedGrade = 0, failedSubject = 0, failedBook = 0, failedChapter = 0, failedNoSLO = 0;
    
    questions.forEach(q => {
      const qGradeNormalized = (q.grade || q.class || '').toString().replace(/^(Grade|Class)\s+/i, '').trim().toLowerCase();
      const qSubject = (q.subject || '').toString().toLowerCase();
      const qBook = (q.book || '').toString().toLowerCase();
      let qChapter = q.chapter || '';
      const qSLO = q.slo || '';
      
      // Clean up chapter name - remove quotes if present
      if (qChapter.startsWith('"') && qChapter.endsWith('"')) {
        qChapter = qChapter.slice(1, -1);
      } else if (qChapter.startsWith("'") && qChapter.endsWith("'")) {
        qChapter = qChapter.slice(1, -1);
      }
      
      // Check if this question matches our selected grade/subject/book
      // Try both numeric IDs and display names (convert both to lowercase and string for comparison)
      const gradeMatch = qGradeNormalized === selectedGradeNormalized;
      const subjectMatch = qSubject === selectedSubjectLower || 
                          qSubject === String(numericSubjectId).toLowerCase() ||
                          qSubject === numericSubjectId;
      const bookMatch = qBook === selectedBookLower || 
                       qBook === String(numericBookId).toLowerCase() ||
                       qBook === numericBookId;
      const chapterMatch = selectedChapters.includes(qChapter);
      
      // Debug: Log first 5 questions that match grade/subject/book but fail overall
      if (gradeMatch && subjectMatch && bookMatch) {
        if (!chapterMatch) {
          if (failedChapter < 3) {
            console.log('❌ SLO Search - Chapter mismatch:', { 
              qChapter, 
              selectedChapters: selectedChapters.slice(0, 3),
              qSLO,
              hasChapter: !!qChapter,
              hasSLO: !!qSLO
            });
          }
          failedChapter++;
        } else if (!qSLO) {
          if (failedNoSLO < 3) {
            console.log('⚠️ SLO Search - Question has no SLO:', { qChapter, qSubject, qBook, qGrade: qGradeNormalized });
          }
          failedNoSLO++;
        }
      }
      
      if (!gradeMatch) failedGrade++;
      if (!subjectMatch) failedSubject++;
      if (!bookMatch) failedBook++;
      
      if (gradeMatch && subjectMatch && bookMatch && chapterMatch && qSLO) {
        console.log('✅ SLO Match found:', { qChapter, qSLO, qSubject, qBook, numericSubjectId, numericBookId });
        slos.add(qSLO);
        matchedCount++;
      }
    });
    
    console.log('📊 SLO Search Summary:', {
      totalQuestions: questions.length,
      matched: matchedCount,
      failedGrade,
      failedSubject,
      failedBook,
      failedChapter,
      failedNoSLO
    });
    
    const sloArray = Array.from(slos).sort();
    console.log(`✅ Available SLOs (${sloArray.length}):`, sloArray);
    return sloArray;
  }, [questions, selectedGrade, selectedSubject, selectedBook, selectedChapters, bookIdMap, subjectIdMap, foundSubjectId]);

  // Helper function to normalize question types for consistent matching
  const normalizeQuestionType = (qType: string): string => {
    if (!qType) return '';
    
    const normalized = qType.toLowerCase().trim()
      .replace(/\s+/g, '') // Remove spaces
      .replace(/[_-]/g, ''); // Remove underscores and hyphens
    
    // Map various formats to standard types
    const typeMap: { [key: string]: string } = {
      // Multiple choice variations
      'mcq': 'multiple',
      'mcqs': 'multiple',
      'multiplechoice': 'multiple',
      'multipleChoice': 'multiple',
      'multiple': 'multiple',
      
      // True/False variations
      'truefalse': 'truefalse',
      'true/false': 'truefalse',
      'tf': 'truefalse',
      'trueofalse': 'truefalse',
      
      // Short answer variations
      'short': 'short',
      'shortanswer': 'short',
      'shortans': 'short',
      'sa': 'short',
      
      // Long answer variations
      'long': 'long',
      'longanswer': 'long',
      'longans': 'long',
      'la': 'long',
      'essay': 'long',
      
      // Fill in the blanks variations
      'fillblanks': 'fillblanks',
      'fillintheblanks': 'fillblanks',
      'fitb': 'fillblanks',
      'blanks': 'fillblanks',
      'blanksafill': 'fillblanks',
    };
    
    return typeMap[normalized] || normalized;
  };

  const getQuestionCountByType = useCallback((type: string): number => {
    if (!selectedGrade || !selectedSubject || !selectedBook) return 0;
    const selectedDifficulties = (questionConfig as any)[type]?.difficulties || [];
    const selectedDifficultiesLower = selectedDifficulties.map((d: string) => d.toLowerCase());
    
    const selectedGradeNormalized = String(selectedGrade).replace(/^(Grade|Class)\s+/i, '').trim().toLowerCase();
    const selectedSubjectLower = selectedSubject.toLowerCase();
    const selectedBookLower = selectedBook.toLowerCase();
    
    // Get the numeric IDs for subject and book
    const normalizedGradeForKey = normalizeGrade(selectedGrade);
    const bookKey = `${selectedSubject}-${normalizedGradeForKey}-${selectedBook}`;
    const numericSubjectId = foundSubjectId || subjectIdMap[selectedSubject] || selectedSubject;
    const numericBookId = bookIdMap[bookKey] || selectedBook;
    
    let matchCount = 0;
    let totalQuestions = 0;
    let sampleQuestionData: any = null;
    const typesInSelectedRange = new Set<string>();
    const allGradeSubjectBookCombos = new Set<string>();
    
    questions.forEach(q => {
      totalQuestions++;
      
      const qGradeRaw = (q.grade || q.class || '').toString();
      const qGradeNormalized = qGradeRaw.replace(/^(Grade|Class)\s+/i, '').trim().toLowerCase();
      const qSubject = (q.subject || '').toString().toLowerCase();
      const qBook = (q.book || '').toString().toLowerCase();
      const qType = (q.type || q.questionType || '').toLowerCase();
      const normalizedType = normalizeQuestionType(qType);
      
      // Track ALL combinations in database
      allGradeSubjectBookCombos.add(`${qGradeNormalized}|${qSubject}|${qBook}`);
      
      // Track what types exist for the selected grade/subject/book (try both display names and numeric IDs)
      const subjectTypeMatch = qSubject === selectedSubjectLower || qSubject === numericSubjectId.toLowerCase();
      const bookTypeMatch = qBook === selectedBookLower || qBook === numericBookId.toLowerCase();
      if (qGradeNormalized === selectedGradeNormalized && subjectTypeMatch && bookTypeMatch) {
        typesInSelectedRange.add(`${qType}(${normalizedType})`);
      }
      
      // Capture one sample for debugging
      if (!sampleQuestionData) {
        sampleQuestionData = {
          grade_raw: qGradeRaw,
          grade_norm: qGradeNormalized,
          subject: qSubject,
          book: qBook,
          type: qType,
          type_norm: normalizedType,
          numericSubjectId,
          numericBookId
        };
      }
      
      // Check all matching conditions (try both display names and numeric IDs)
      const gradeMatch = qGradeNormalized === selectedGradeNormalized;
      const subjectMatch = qSubject === selectedSubjectLower || qSubject === numericSubjectId.toLowerCase();
      const bookMatch = qBook === selectedBookLower || qBook === numericBookId.toLowerCase();
      const typeMatch = normalizedType === type;
      
      if (gradeMatch && subjectMatch && bookMatch && typeMatch) {
        let qChapter = (q.chapter || '').trim();
        // Remove surrounding quotes if present
        if ((qChapter.startsWith('"') && qChapter.endsWith('"')) || (qChapter.startsWith("'") && qChapter.endsWith("'"))) {
          qChapter = qChapter.slice(1, -1);
        }
        const qSLO = q.slo || '';
        const qDifficulty = (q.difficulty || 'Medium').toString();
        const qDifficultyLower = qDifficulty.toLowerCase();
        
        // Debug chapter matching
        if (selectedChapters.length > 0 && qChapter) {
          const isChapterMatch = selectedChapters.includes(qChapter);
          if (!isChapterMatch && type === 'multiple') {
            console.log('❌ Chapter mismatch:', {
              qChapter: `"${qChapter}"`,
              selectedChapters,
              selectedChaptersDebug: selectedChapters.map(c => `"${c}"`),
              isIncluded: isChapterMatch,
              selectedCount: selectedChapters.length
            });
          }
        }
        
        if (selectedChapters.length > 0 && !selectedChapters.includes(qChapter)) {
          // Skip this question if chapter doesn't match and we have selected chapters
          // But first, try matching without quotes in case data has quotes
          const qChapterUnquoted = qChapter.replace(/^["']|["']$/g, '');
          if (!selectedChapters.includes(qChapterUnquoted)) {
            return;
          }
        }
        if (selectedSLOs.length > 0 && !selectedSLOs.includes(qSLO)) return;
        if (selectedDifficultiesLower.length > 0 && !selectedDifficultiesLower.includes(qDifficultyLower)) return;
        
        matchCount++;
      }
    });
    
    // Log only when looking for 'multiple' to avoid spam
    if (type === 'multiple' && process.env.NODE_ENV === 'development') {
      // Additional debug: collect all raw types for selected combo
      const typesForSelectedCombo = new Map<string, Set<string>>();
      questions.forEach(q => {
        const qGradeNormalized = (q.grade || q.class || '').toString().replace(/^(Grade|Class)\s+/i, '').trim().toLowerCase();
        const qSubject = (q.subject || '').toLowerCase();
        const qBook = (q.book || '').toLowerCase();
        const qType = (q.type || q.questionType || '').toLowerCase();
        const normalizedType = normalizeQuestionType(qType);
        
        if (qGradeNormalized === selectedGradeNormalized && qSubject === selectedSubjectLower && qBook === selectedBookLower) {
          const key = `${normalizedType}`;
          if (!typesForSelectedCombo.has(key)) {
            typesForSelectedCombo.set(key, new Set());
          }
          typesForSelectedCombo.get(key)!.add(qType);
        }
      });
      
      console.log('====== QUIZ SEARCH DEBUG ======');
      console.log('SELECTED:');
      console.log('  grade:', selectedGrade, '=> normalized:', selectedGradeNormalized);
      console.log('  subject:', selectedSubjectLower);
      console.log('  book:', selectedBookLower);
      console.log('SAMPLE QUESTION FROM DB:');
      console.log('  grade_raw:', sampleQuestionData?.grade_raw, '=> normalized:', sampleQuestionData?.grade_norm);
      console.log('  subject:', sampleQuestionData?.subject);
      console.log('  book:', sampleQuestionData?.book);
      console.log('  type:', sampleQuestionData?.type, '=> normalized:', sampleQuestionData?.type_norm);
      console.log('ALL TYPES FOUND FOR SELECTED COMBO (raw -> normalized):');
      if (typesForSelectedCombo.size === 0) {
        console.log('  (NO TYPES FOUND - checking if questions have type field...)');
      } else {
        typesForSelectedCombo.forEach((rawTypes, normalized) => {
          console.log(`  ${normalized}: [${Array.from(rawTypes).join(', ')}]`);
        });
      }
      console.log('ALL GRADE|SUBJECT|BOOK COMBOS IN DATABASE:');
      Array.from(allGradeSubjectBookCombos).forEach(combo => console.log('  ', combo));
      console.log('RESULTS:');
      console.log('  total_questions:', totalQuestions);
      console.log('  matched_for_type_"' + type + '":', matchCount);
      console.log('==============================');
    }
    
    return matchCount;
  }, [questions, selectedGrade, selectedSubject, selectedBook, selectedChapters, selectedSLOs, questionConfig]);

  const getTotalConfiguredQuestions = useCallback(() => {
    return Object.values(questionConfig).reduce((sum, config) => sum + config.count, 0);
  }, [questionConfig]);

  const generateQuestions = useCallback((overrideSeed: string | null = null): any[] => {
    const seedToUse = overrideSeed || randomSeed;
    
    // Build questions based on questionConfig
    let allQuestions: any[] = [];
    let questionCounter = 1;

    // Debug: Show what questions exist for this grade/subject/book
    const debugQuestionsForCombo = questions.filter(q => {
      const qGradeNormalized = (q.grade || q.class || '').toString().replace(/^(Grade|Class)\s+/i, '').trim().toLowerCase();
      const selectedGradeNormalized = String(selectedGrade).replace(/^(Grade|Class)\s+/i, '').trim().toLowerCase();
      const qSubject = (q.subject || '').toLowerCase();
      const qBook = (q.book || '').toLowerCase();
      
      const gradeMatch = qGradeNormalized === selectedGradeNormalized;
      const subjectMatch = qSubject === selectedSubject.toLowerCase();
      const bookMatch = qBook === selectedBook.toLowerCase();
      
      return gradeMatch && subjectMatch && bookMatch;
    });

    if (debugQuestionsForCombo.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('📊 DEBUG: Questions found for grade/subject/book:', {
        grade: selectedGrade,
        subject: selectedSubject,
        book: selectedBook,
        totalFound: debugQuestionsForCombo.length,
        types: [...new Set(debugQuestionsForCombo.map(q => {
          const raw = q.type || q.questionType || 'UNKNOWN';
          const normalized = normalizeQuestionType((raw || '').toLowerCase());
          return `${raw} -> ${normalized}`;
        }))],
        sampleQuestion: {
          type: debugQuestionsForCombo[0].type,
          questionType: debugQuestionsForCombo[0].questionType,
          difficulty: debugQuestionsForCombo[0].difficulty,
          chapter: debugQuestionsForCombo[0].chapter,
          slo: debugQuestionsForCombo[0].slo,
          questionText: (debugQuestionsForCombo[0].questionText || '').substring(0, 50),
        },
      });
    }

    Object.entries(questionConfig).forEach(([type, config]) => {
      if (config.count === 0) return;

      // Filter questions for this type with selected difficulties
      const typeQuestions = questions.filter(q => {
        const qGradeNormalized = (q.grade || q.class || '').toString().replace(/^(Grade|Class)\s+/i, '').trim().toLowerCase();
        const selectedGradeNormalized = String(selectedGrade).replace(/^(Grade|Class)\s+/i, '').trim().toLowerCase();
        const qSubject = (q.subject || '').toLowerCase();
        const qBook = (q.book || '').toLowerCase();
        let qChapter = (q.chapter || '').trim();
        // Remove surrounding quotes if present and normalize
        if ((qChapter.startsWith('"') && qChapter.endsWith('"')) || (qChapter.startsWith("'") && qChapter.endsWith("'"))) {
          qChapter = qChapter.slice(1, -1).trim();
        }
        const qSLO = (q.slo || '').trim();
        const qType = (q.type || q.questionType || '').toLowerCase();
        const qDifficulty = (q.difficulty || 'Medium').toString();
        const qDifficultyLower = qDifficulty.toLowerCase();
        const normalizedType = normalizeQuestionType(qType);
        
        // Book matching: check both display name and numeric ID from bookIdMap
        const normalizedGradeForKey = normalizeGrade(selectedGrade);
        const bookKey = `${selectedSubject}-${normalizedGradeForKey}-${selectedBook}`;
        const selectedBookLower = selectedBook.toLowerCase();
        const selectedBookId = bookIdMap[bookKey];
        const bookMatch = qBook === selectedBookLower || 
                         qBook === selectedBookId?.toString().toLowerCase() ||
                         qBook === selectedBookId;

        // Basic matches (grade, subject, book, type, difficulty)
        const gradeMatch = qGradeNormalized === selectedGradeNormalized;
        const subjectMatch = qSubject === selectedSubject.toLowerCase();
        const typeMatch = normalizedType === type;
        const difficultiesLower = (config.difficulties || ['Easy', 'Medium', 'Hard']).map(d => d.toLowerCase());
        const difficultyMatch = difficultiesLower.length === 0 || difficultiesLower.includes(qDifficultyLower);
        
        // Chapter and SLO matching - be lenient if data is missing
        let chapterMatch = true;
        let sloMatch = true;
        
        // If chapters were selected, try to match - but don't exclude questions without chapter data
        if (selectedChapters.length > 0) {
          if (qChapter) {
            chapterMatch = selectedChapters.some(ch => {
              const chTrimmed = ch.trim();
              return qChapter === chTrimmed || 
                     qChapter.toLowerCase() === chTrimmed.toLowerCase();
            });
          }
          // If question has no chapter data, still allow it (chapterMatch stays true)
        }
        
        // If SLOs were selected, try to match - but don't exclude questions without SLO data
        if (selectedSLOs.length > 0) {
          if (qSLO) {
            sloMatch = selectedSLOs.some(slo => {
              const sloTrimmed = slo.trim();
              return qSLO === sloTrimmed || 
                     qSLO.toLowerCase() === sloTrimmed.toLowerCase();
            });
          }
          // If question has no SLO data, still allow it (sloMatch stays true)
        }
        
        const allMatch = gradeMatch && subjectMatch && bookMatch && chapterMatch && sloMatch && typeMatch && difficultyMatch;
        
        // Log questions that don't match to help debug
        if (!allMatch && type === 'multiple' && q.questionText && q.questionText.substring(0, 50)) {
          console.log(`❌ Question excluded: "${q.questionText.substring(0, 50)}..."`, {
            gradeMatch,
            subjectMatch,
            bookMatch,
            typeMatch,
            difficultyMatch,
            chapterMatch,
            sloMatch,
            qChapter,
            selectedChapters,
            qSLO,
            selectedSLOs,
          });
        }

        return gradeMatch && subjectMatch && bookMatch && chapterMatch && sloMatch && typeMatch && difficultyMatch;
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Questions of type "${type}": ${typeQuestions.length} available`);
        if (typeQuestions.length === 0 && debugQuestionsForCombo.length > 0) {
          console.log(`⚠️  No ${type} questions found even though grade/subject/book combo has ${debugQuestionsForCombo.length} questions total`);
          console.log('Available types in this combo:', [...new Set(debugQuestionsForCombo.map(q => {
            const raw = q.type || q.questionType;
            const normalized = normalizeQuestionType((raw || '').toLowerCase());
            return `${raw}=>${normalized}`;
          }))]);
        }
      }

      // Shuffle and select the required count
      const selectedQuestions = shuffle(typeQuestions, seedToUse).slice(0, config.count);

      // Convert to quiz format
      selectedQuestions.forEach(q => {
        const questionText = q.questionText || q.question || '';
        if (!questionText || !q.subject || !q.grade) return;

        const qType = type;
        let options = [];
        let answer = null;
        let interactiveData = null;

        // Handle interactive question types
        const isInteractiveType = ['dragdrop', 'diagramlabeling', 'matching', 'categorization', 'ordering'].includes(qType);
        
        if (isInteractiveType && q.isInteractive && q.interactiveData) {
          interactiveData = q.interactiveData;
          answer = { value: 'interactive', text: 'See interactive data' };
        } else if (qType === 'multiple') {
          options = shuffle(q.options.map((opt: any, idx: number) => ({
            text: opt || `Option ${idx + 1}`,
            format: q.subject === 'Math' ? 'math' : 'text',
          })), seedToUse);
          // Normalize correct answer: handle arrays, comma-separated, and case-insensitive matching
          let correctCandidate: any = q.correctAnswer;
          if (Array.isArray(correctCandidate)) {
            correctCandidate = correctCandidate[0] || '';
          }
          if (typeof correctCandidate === 'string' && correctCandidate.includes(',')) {
            correctCandidate = correctCandidate.split(',')[0].trim();
          }
          const idx = options.findIndex(opt => (opt.text || '').toString().trim().toLowerCase() === (correctCandidate || '').toString().trim().toLowerCase());
          answer = { value: idx, text: q.correctAnswer };
          if (idx === -1 || !q.correctAnswer) return;
        } else if (qType === 'truefalse') {
          const trueFalseOptions = [
            { text: 'True', format: 'text' },
            { text: 'False', format: 'text' }
          ];
          options = shuffle(trueFalseOptions, seedToUse);
          const correctAnswerBoolean = q.correctAnswer?.toLowerCase() === 'true';
          answer = { value: correctAnswerBoolean, text: q.correctAnswer };
        } else if (qType === 'fillblanks') {
          if (q.isInteractive && q.interactiveData) {
            interactiveData = q.interactiveData;
            answer = { value: 'interactive', text: 'See interactive data' };
          } else {
            // For regular fillblanks, check both blanks object and correctAnswer field
            if (q.blanks && typeof q.blanks === 'object' && Object.keys(q.blanks).length > 0) {
              // Question has blanks object (from individual creation)
              answer = { value: q.blanks, text: JSON.stringify(q.blanks) };
            } else {
              // Fallback to correctAnswer field
              answer = { value: q.correctAnswer || '', text: q.correctAnswer || '' };
            }
          }
        } else {
          answer = { value: q.correctAnswer || '', text: q.correctAnswer || '' };
        }

        allQuestions.push({
          id: questionCounter++,
          type: qType,
          grade: q.grade,
          subject: q.subject,
          difficulty: q.difficulty,
          slo: q.slo || '',
          cognitiveLevel: q.cognitiveLevel || null,
          marks: isMarked ? config.marks : 0,
          question: { text: questionText, format: q.subject === 'Math' ? 'math' : 'text', isRTL: q.subject === 'Urdu' },
          options,
          answer,
          explanation: { text: q.explanation || '', format: 'text', isRTL: false },
          isInteractive: isInteractiveType && q.isInteractive,
          interactiveData: interactiveData,
          imageUrl: q.imageUrl || null,
        });
      });
    });

    // Shuffle all questions for final quiz
    return shuffle(allQuestions, seedToUse);
  }, [questions, questionConfig, selectedGrade, selectedSubject, selectedBook, selectedChapters, selectedSLOs, isMarked, randomSeed]);

  const validateQuizSettings = useCallback(() => {
    const errors = [];
    if (!selectedGrade || !selectedSubject || !selectedBook) errors.push('Please select grade, subject, and book');
    const totalQuestionsConfigured = Object.values(questionConfig).reduce((sum, config) => sum + config.count, 0);
    if (totalQuestionsConfigured === 0) errors.push('Please configure at least one question');
    return errors.length ? errors.join('\n') : '';
  }, [selectedGrade, selectedSubject, selectedBook, questionConfig]);

  const handleCreateQuiz = () => {
    const error = validateQuizSettings();
    if (error) {
      alert(error);
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmGenerateQuiz = async () => {
    if (!quizTitle || quizTitle.length > 120) {
      alert('Quiz title is required and must be under 120 characters');
      const newSeed = uuidv4();
      setRandomSeed(newSeed);
      const newQuestions = generateQuestions(newSeed);
      setEditedQuestions(newQuestions);
      return;
    }

    setIsGenerating(true);
    
    try {
      // Generate new random seed for each quiz to ensure different questions every time
      const newSeed = uuidv4();
      setRandomSeed(newSeed);
      const questions = generateQuestions(newSeed);
      if (questions.length === 0) {
        const configuredTypes = Object.entries(questionConfig).filter(([_, config]) => config.count > 0).map(([type, _]) => type);
        alert(`No questions available for the configured criteria.\nGrade: ${selectedGrade}\nSubject: ${selectedSubject}\nBook: ${selectedBook}\nChapters: ${selectedChapters.join(', ') || 'All'}\nSLOs: ${selectedSLOs.join(', ') || 'All'}\nQuestion Types: ${configuredTypes.join(', ')}\nPlease check your database for matching questions.`);
        return;
      }

    const sanitizeObject = (obj: any): any => {
      const sanitized: { [key: string]: any } = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = value === undefined ? null : Array.isArray(value)
          ? value.map(item => item && typeof item === 'object' ? sanitizeObject(item) : item ?? null)
          : value && typeof value === 'object' ? sanitizeObject(value) : value ?? null;
      }
      return sanitized;
    };

    const quiz = sanitizeObject({
      title: quizTitle,
      quizType,
      quizFormat: quizFormat || 'Online',
      class: selectedGrade,
      subject: selectedSubject,
      book: selectedBook,
      chapters: selectedChapters,
      slos: selectedSLOs,
      schoolId: user?.schoolId || '',
      schoolName: user?.schoolName || '',
      questionConfiguration: Object.entries(questionConfig).filter(([_, config]) => config.count > 0).map(([type, config]) => ({
        type,
        count: config.count,
        difficulties: (config.difficulties && config.difficulties.length > 0) ? config.difficulties : ['Easy', 'Medium', 'Hard'],
        marksEach: config.marks
      })),
      isMarked,
      timeLimitMinutes: null,
      schedule: null,
      totalQuestions: questions.length,
      questionIds: questions.map(q => q.id),
      assignedStudents: assignedStudents,
      assignedBy: user?.name || user?.email || 'teacher',
      createdBy: user?.uid || 'current_user',
      items: questions.map(q => ({
        questionId: q.id,
        questionType: q.type,
        subject: q.subject,
        difficulty: q.difficulty,
        slo: q.slo || '',
        question: q.question,
        options: q.options || [],
        answer: q.answer,
        explanation: q.explanation,
        marks: q.marks,
        isInteractive: q.isInteractive || false,
        interactiveData: q.interactiveData || null,
        imageUrl: q.imageUrl || null,
      })),
      totalMarks: isMarked ? questions.reduce((sum, q) => sum + q.marks, 0) : null,
      randomization: { seed: newSeed, shuffledOrder: true, shuffleOptions: questions.some(q => q.type === 'multiple') },
      rendering: { respectRTL: selectedSubject === 'Urdu', renderMath: selectedSubject === 'Math' },
      status: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: 1,
      notes: null,
    });

      const quizDoc = await addDoc(collection(db, 'quizzes'), quiz);
      const quizId = quizDoc.id;
      
      setGeneratedQuiz({ ...quiz, id: quizId });
      setEditedQuestions(questions);
      setShowEditor(true);
      setShowConfirmModal(false);
      alert(`Quiz '${quizTitle}' created with ${questions.length} questions. Configure settings and assign to students if needed.`);
    } catch (error) {
      console.error('Error saving quiz:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert('Error saving quiz: ' + errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditQuestion = (index: number, field: string, value: any) => setEditedQuestions(prev => {
    const newQuestions = [...prev];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    return newQuestions;
  });

  // Text formatting functions for question editor
  const applyTextFormatting = (index: number, format: 'bold' | 'italic' | 'highlight', textareaRef: HTMLTextAreaElement | null) => {
    if (!textareaRef) return;
    
    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const selectedText = textareaRef.value.substring(start, end);
    
    if (!selectedText) {
      alert('Please select some text first');
      return;
    }
    
    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `<b>${selectedText}</b>`;
        break;
      case 'italic':
        formattedText = `<i>${selectedText}</i>`;
        break;
      case 'highlight':
        formattedText = `<mark>${selectedText}</mark>`;
        break;
    }
    
    const currentText = textareaRef.value;
    const newText = currentText.substring(0, start) + formattedText + currentText.substring(end);
    
    handleEditQuestion(index, 'question', { ...editedQuestions[index].question, text: newText });
    
    // Restore focus and selection
    setTimeout(() => {
      textareaRef.focus();
      const newCursorPos = start + formattedText.length;
      textareaRef.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const applyOptionFormatting = (questionIndex: number, optionIndex: number, format: 'bold' | 'italic' | 'highlight', inputRef: HTMLInputElement | null) => {
    if (!inputRef) return;
    
    const start = inputRef.selectionStart || 0;
    const end = inputRef.selectionEnd || 0;
    const selectedText = inputRef.value.substring(start, end);
    
    if (!selectedText) {
      alert('Please select some text first');
      return;
    }
    
    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `<b>${selectedText}</b>`;
        break;
      case 'italic':
        formattedText = `<i>${selectedText}</i>`;
        break;
      case 'highlight':
        formattedText = `<mark>${selectedText}</mark>`;
        break;
    }
    
    const currentText = inputRef.value;
    const newText = currentText.substring(0, start) + formattedText + currentText.substring(end);
    
    const newOptions = [...editedQuestions[questionIndex].options];
    newOptions[optionIndex] = { ...newOptions[optionIndex], text: newText };
    handleEditQuestion(questionIndex, 'options', newOptions);
    
    // Restore focus and selection
    setTimeout(() => {
      inputRef.focus();
      const newCursorPos = start + formattedText.length;
      inputRef.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSaveChanges = async () => {
    if (!generatedQuiz) return;
    
    // Validate quiz settings
    const errors = [];
    if (timeLimit < 1 || timeLimit > maxTimeLimit) {
      errors.push(`Time limit must be between 1 and ${maxTimeLimit} minutes`);
    }
    
    // Only validate schedule for Online quizzes
    if (quizFormat === 'Online') {
      if (!scheduledStart || new Date(scheduledStart) < new Date()) {
        errors.push('Scheduled start must be in the future');
      }
      if (scheduledEnd && new Date(scheduledEnd) <= new Date(scheduledStart)) {
        errors.push('Scheduled end must be after scheduled start');
      }
    }
    
    if (errors.length > 0) {
      alert('Please fix the following errors:\n\n' + errors.join('\n'));
      return;
    }
    
    setIsSavingChanges(true);
    try {
      const quizId = generatedQuiz.id;
      if (!quizId) {
        alert('Error: Quiz ID not found');
        return;
      }
      
      // Update quiz in Firestore with timeLimit and schedule
      const { doc, updateDoc } = await import('firebase/firestore');
      const quizRef = doc(db, 'quizzes', quizId);
      
      const updateData: any = {
        timeLimitMinutes: timeLimit,
        updatedAt: serverTimestamp(),
      };
      
      // Only add schedule for Online quizzes
      if (quizFormat === 'Online') {
        updateData.schedule = {
          startAt: scheduledStart ? Timestamp.fromDate(new Date(scheduledStart)) : null,
          endAt: scheduledEnd ? Timestamp.fromDate(new Date(scheduledEnd)) : null,
        };
      }
      
      await updateDoc(quizRef, updateData);
      
      // If students are assigned, create assignment records
      if (assignedStudents.length > 0) {
        try {
          await fetch('/api/teacher/assign-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quizId,
              studentIds: assignedStudents,
              quizTitle: generatedQuiz.title,
              quizData: { ...generatedQuiz, timeLimitMinutes: timeLimit, schedule: updateData.schedule },
              isMarked: generatedQuiz.isMarked,
              timeLimitMinutes: timeLimit,
              schedule: updateData.schedule,
            })
          });
        } catch (assignError) {
          console.warn('Warning: Assignment failed:', assignError);
          // Don't block the save if assignment fails
        }
      }
      
      const assignmentText = assignedStudents.length > 0 ? ` and assigned to ${assignedStudents.length} student(s)` : '';
      alert(`Quiz saved successfully${assignmentText}!`);
      setShowEditor(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert('Error saving changes: ' + errorMsg);
    } finally {
      setIsSavingChanges(false);
    }
  };

  const openReplaceModal = async (index: number) => {
    const currentQuestion = editedQuestions[index];
    setReplaceQuestionIndex(index);
    setReplaceLoading(prev => ({ ...prev, [index]: true }));
    
    try {
      // Fetch available questions of the same type
      const response = await fetch(`/api/teacher/questions?qb=${selectedQB}`, {
        headers: {
          'x-user-id': user?.uid || '',
          'x-school-id': user?.schoolId || '',
          'x-user-role': user?.role || '',
        },
      });
      
      if (!response.ok) {
        console.error('API response not OK:', response.status, response.statusText);
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📋 Fetched questions for replacement:', { totalFetched: data?.questions?.length || 0, currentQuestionType: currentQuestion.type, currentQuestionGrade: currentQuestion.grade, currentQuestionSubject: currentQuestion.subject });
      
      if (!data.questions || !Array.isArray(data.questions)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from API');
      }
      
      // Filter questions: same type, same subject, same grade, and exclude currently selected question
      const filteredQuestions = data.questions.filter((q: any) => {
        const qType = normalizeQuestionType((q.type || q.questionType || '').toLowerCase());
        const selectedType = normalizeQuestionType(currentQuestion.type.toLowerCase());
        const qGrade = String(q.grade || '').replace(/^(Grade|Class)\s+/i, '').trim().toLowerCase();
        const questionGrade = String(currentQuestion.grade || '').replace(/^(Grade|Class)\s+/i, '').trim().toLowerCase();
        const qSubject = (q.subject || '').toLowerCase();
        const questionSubject = (currentQuestion.subject || '').toLowerCase();
        
        const matches = qType === selectedType && 
                       qGrade === questionGrade && 
                       qSubject === questionSubject;
        
        if (matches && q.id !== currentQuestion.id) {
          return true;
        }
        return false;
      });
      
      console.log('📌 Filtered replacement questions:', { count: filteredQuestions.length, type: normalizeQuestionType(currentQuestion.type.toLowerCase()), grade: currentQuestion.grade, subject: currentQuestion.subject });
      
      if (filteredQuestions.length === 0) {
        alert(`No replacement questions found for type: ${currentQuestion.type}, Grade: ${currentQuestion.grade}, Subject: ${currentQuestion.subject}`);
      } else {
        // Automatically select a random question
        const randomReplacement = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
        replaceQuestion(randomReplacement, index);
      }
    } catch (error) {
      console.error('Error fetching replacement questions:', error);
      alert('Error fetching replacement questions: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setReplaceLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  const replaceQuestion = (newQuestion: any, index: number) => {
    if (index === null) return;
    
    // Convert the question to the same format as editedQuestions
    let answerValue: any;
    
    if (newQuestion.type === 'multiple' || newQuestion.type === 'mcq') {
      // For MCQ, find the correct answer index(es)
      const correctAns = newQuestion.correctAnswer?.toString().trim();
      const optionsArray = newQuestion.options || [];
      
      // Check if there are multiple correct answers (separated by comma)
      if (correctAns?.includes(',')) {
        // Multiple correct answers
        const correctAnswers = correctAns.split(',').map((ans: string) => ans.trim());
        const foundIndices: number[] = [];
        
        correctAnswers.forEach((ans: string) => {
          let foundIndex = optionsArray.findIndex((opt: any) => (opt || '').toString().trim() === ans);
          
          // If not found by exact match, try case-insensitive
          if (foundIndex === -1) {
            foundIndex = optionsArray.findIndex((opt: any) => 
              (opt || '').toString().toLowerCase().trim() === ans.toLowerCase().trim()
            );
          }
          
          if (foundIndex >= 0) {
            foundIndices.push(foundIndex);
          }
        });
        
        answerValue = foundIndices.length > 0 ? foundIndices : 0;
      } else {
        // Single correct answer
        let foundIndex = optionsArray.findIndex((opt: any) => (opt || '').toString().trim() === correctAns);
        
        // If not found by exact match, try case-insensitive
        if (foundIndex === -1) {
          foundIndex = optionsArray.findIndex((opt: any) => 
            (opt || '').toString().toLowerCase().trim() === correctAns?.toLowerCase().trim()
          );
        }
        
        answerValue = foundIndex >= 0 ? foundIndex : 0;
      }
    } else if (newQuestion.type === 'truefalse') {
      answerValue = newQuestion.correctAnswer?.toLowerCase() === 'true';
    } else {
      answerValue = newQuestion.correctAnswer;
    }
    
    const formattedQuestion = {
      id: newQuestion.id,
      type: normalizeQuestionType((newQuestion.type || newQuestion.questionType || '').toLowerCase()),
      grade: newQuestion.grade,
      subject: newQuestion.subject,
      difficulty: newQuestion.difficulty,
      slo: newQuestion.slo || '',
      marks: editedQuestions[index].marks, // Keep original marks
      question: { 
        text: newQuestion.questionText, 
        format: newQuestion.subject === 'Math' ? 'math' : 'text', 
        isRTL: newQuestion.subject === 'Urdu' 
      },
      options: (newQuestion.type === 'multiple' || newQuestion.type === 'mcq') ? newQuestion.options?.map((opt: any) => ({
        text: opt || '',
        format: newQuestion.subject === 'Math' ? 'math' : 'text',
      })) || [] : [],
      answer: {
        value: answerValue,
        text: newQuestion.correctAnswer || ''
      },
      explanation: newQuestion.explanation ? { text: newQuestion.explanation } : null,
    };
    
    const newQuestions = [...editedQuestions];
    newQuestions[index] = formattedQuestion;
    setEditedQuestions(newQuestions);
  };

  const handleReshuffle = () => {
    if (confirm('Reshuffling will change question selection, order, and MCQ option order. Continue?')) {
      const newSeed = uuidv4();
      setRandomSeed(newSeed);
      const newQuestions = generateQuestions(newSeed);
      setEditedQuestions(newQuestions);
    }
  };

  // Helper function to convert newlines to HTML breaks for PDF
  const convertNewlinesToHtml = (text: string): string => {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/\n/g, '<br>');
  };

  // Helper function to split text by newlines for Word (creates separate paragraphs)
  const splitTextByNewlines = (text: string): string[] => {
    if (!text || typeof text !== 'string') return [text];
    return text.split('\n');
  };

  const downloadQuizPDF = () => {
    if (!generatedQuiz) return;
    
    // Helper function to replace {blank#} placeholders with underscores
    const replaceBlanks = (text: any): any => {
      if (!text || typeof text !== 'string') return text;
      return text.replace(/\{blank\d+\}/g, '________');
    };
    
    // Preprocess ALL questions to replace {blank#} placeholders everywhere
    const processedQuestions = editedQuestions.map(q => ({
      ...q,
      question: {
        ...q.question,
        text: replaceBlanks(q.question.text)
      },
      options: q.options?.map((opt: any) => ({
        ...opt,
        text: replaceBlanks(opt.text)
      })),
      answer: {
        ...q.answer,
        text: typeof q.answer.text === 'string' ? replaceBlanks(q.answer.text) : q.answer.text
      }
    }));
    
    const pdfContent = `
      <!DOCTYPE html>
      <html dir="ltr">
      <head>
        <title>${generatedQuiz.title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">
        <script>
          window.MathJax = {
            tex: {
              inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
              displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']]
            },
            startup: {
              pageReady: () => {
                return MathJax.startup.defaultPageReady();
              }
            }
          };
        </script>
        <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap');
          body { font-family: '${paperFormat.questionFontFamily}', Georgia, serif; margin: 40px; line-height: ${paperFormat.questionLineSpacing}; color: #2c3e50; direction: ltr; font-size: 16px; }
          .header { border-bottom: 1px solid #2c3e50; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-family: 'Calibri', 'Arial', sans-serif; font-size: 26px; font-weight: bold; color: #1a1a1a; text-align: center; margin-bottom: 12px; letter-spacing: 0.5px; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border: 1px solid #1a1a1a; font-family: 'Calibri', 'Arial', sans-serif; }
          .header-table td { padding: 6px 8px; font-size: 12px; color: #1a1a1a; vertical-align: middle; border: 0.5px solid #999999; }
          .header-table .label { font-weight: 600; width: 25%; background-color: #ecf0f1; font-family: 'Calibri', 'Arial', sans-serif; }
          .header-table .value { width: 25%; font-family: '${paperFormat.questionFontFamily}', Georgia, serif; }
          .name-field { min-height: 12px; }
          .question { margin-bottom: ${paperFormat.questionMarginBottom}px; page-break-inside: avoid; }
          .question-number { margin-bottom: 10px; overflow: hidden; display: flex; justify-content: space-between; align-items: center; }
          .question-number-urdu { font-family: 'Noto Nastaliq Urdu', serif; direction: rtl; text-align: right; font-weight: 700; font-size: 19px; }
          .question-number-marks { font-family: 'Calibri', 'Arial', sans-serif; direction: ltr; text-align: right; font-weight: 600; font-size: 14px; }
          .question-number-marks-urdu { font-family: 'Calibri', 'Arial', sans-serif; direction: ltr; text-align: left; font-weight: 600; font-size: 14px; }
          .question-number-english { font-family: 'Calibri', 'Arial', sans-serif; direction: ltr; text-align: left; font-weight: 600; font-size: 19px; }
          .question-text { font-family: '${paperFormat.questionFontFamily}', Georgia, serif; font-size: ${paperFormat.questionFontSize}px; margin-bottom: 14px; font-weight: 500; color: #1a1a1a; line-height: ${paperFormat.questionLineSpacing}; }
          .options { margin-bottom: 12px; }
          .option { margin-bottom: 6px; font-size: ${paperFormat.optionFontSize}px; font-family: '${paperFormat.optionFontFamily}', Georgia, serif; color: #2c3e50; line-height: 1.6; }
          .urdu { font-family: 'Noto Nastaliq Urdu', serif; direction: rtl; text-align: right; margin-right: 20px; }
          mark { background-color: #fef08a; padding: 2px 4px; border-radius: 2px; }
          b, strong { font-weight: bold; }
          i, em { font-style: italic; }
          .cognitive-badge { display: inline-block; font-size: 10px; padding: 2px 6px; margin-left: 8px; border-radius: 3px; font-weight: 600; font-family: 'Calibri', 'Arial', sans-serif; }
          .cognitive-knowledge { background-color: #dbeafe; color: #1e40af; border: 1px solid #3b82f6; }
          .cognitive-understanding { background-color: #dcfce7; color: #166534; border: 1px solid #22c55e; }
          .cognitive-application { background-color: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
          .page-break { page-break-before: always; }
          @media print { body { margin: 20px; font-family: '${paperFormat.questionFontFamily}', Georgia, serif; } .page-break { page-break-before: always; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${generatedQuiz.title}</div>
          <table class="header-table">
            <tr>
              <td class="label">Student Name:</td>
              <td class="value name-field"></td>
              <td class="label">Student ID:</td>
              <td class="value name-field"></td>
            </tr>
            <tr>
              <td class="label">Class:</td>
              <td class="value">${generatedQuiz.class}</td>
              <td class="label">Subject:</td>
              <td class="value">${generatedQuiz.subject}</td>
            </tr>
            <tr>
              <td class="label">Series:</td>
              <td class="value name-field"></td>
              <td class="label">Test Type:</td>
              <td class="value">${generatedQuiz.quizType || 'Quiz'}</td>
            </tr>
            <tr>
              <td class="label">Total Marks:</td>
              <td class="value">${isMarked ? generatedQuiz.totalMarks : 'N/A'}</td>
              <td class="label">Total Time:</td>
              <td class="value">${generatedQuiz.timeLimitMinutes} minutes</td>
            </tr>
            <tr>
              <td class="label">Obtained Marks:</td>
              <td class="value name-field"></td>
              <td class="label">Date:</td>
              <td class="value">${new Date().toLocaleDateString()}</td>
            </tr>
          </table>
        </div>
        ${processedQuestions
          .map(
            (q, i) => `
              <div class="question">
                <div class="question-number" ${q.question.isRTL ? 'style="direction: rtl;"' : ''}>
                  <div class="${q.question.isRTL ? 'question-number-urdu' : 'question-number-english'}">
                    ${q.question.isRTL ? 'سوال ' + toUrduNumber(i + 1) : 'Question ' + (i + 1)}
                  </div>
                  ${isMarked ? `<div class="${q.question.isRTL ? 'question-number-marks-urdu' : 'question-number-marks'}">(${q.marks} marks)</div>` : ''}
                </div>
                <div class="question-text ${q.question.isRTL ? 'urdu' : ''}">
                  ${convertNewlinesToHtml(extractLatexFromFormulas(q.question.text))}
                  ${showCognitiveLevel && q.cognitiveLevel ? 
                    (q.cognitiveLevel.knowledge ? '<span class="cognitive-badge cognitive-knowledge">Knowledge</span>' : '') +
                    (q.cognitiveLevel.understanding ? '<span class="cognitive-badge cognitive-understanding">Understanding</span>' : '') +
                    (q.cognitiveLevel.application ? '<span class="cognitive-badge cognitive-application">Application</span>' : '')
                  : ''}
                </div>
                ${(q as any).imageUrl ? `<div style="margin-top: 10px; margin-bottom: 10px;"><img src="${(q as any).imageUrl}" alt="Question image" style="max-width: 100%; height: auto; max-height: 300px; border: 1px solid #ddd; border-radius: 4px;" /></div>` : ''}
                ${
                  q.type === 'multiple' && q.options?.length
                    ? `<div class="options ${q.question.isRTL ? 'urdu' : ''}">${q.options
                        .map(
                          (opt: any, j: number) =>
                            `<div class="option">${q.question.isRTL ? optionLabels(true)[j] : String.fromCharCode(65 + j)}. ${opt.format === 'math' ? '\\(' + opt.text + '\\)' : convertNewlinesToHtml(opt.text)}</div>`
                        )
                        .join('')}</div>`
                    : q.type === 'truefalse'
                    ? `<div class="options ${q.question.isRTL ? 'urdu' : ''}">
                        <div class="option">${q.question.isRTL ? 'ا' : 'A'}. ${q.question.isRTL ? 'صحیح' : 'True'}</div>
                        <div class="option">${q.question.isRTL ? 'ب' : 'B'}. ${q.question.isRTL ? 'غلط' : 'False'}</div>
                      </div>`
                    : q.type === 'fillblanks'
                    ? ''
                    : `<div class="options ${q.question.isRTL ? 'urdu' : ''}"><div class="option">${q.question.isRTL ? 'نیچے اپنا جواب لکھیں۔' : 'Write your answer below.'}</div></div>`
                }
                ${
                  (q.type === 'short' || q.type === 'long')
                    ? `<div class="answer-lines" style="margin-top: 12px;">
                        ${Array.from({ length: answerLines[(editedQuestions.indexOf(q) + '-lines') as any] ?? defaultAnswerLines }).map(() => 
                          `<div style="border-bottom: 1px solid #333; height: ${paperFormat.answerLineSpacing}px; margin-bottom: 8px;"></div>`
                        ).join('')}
                      </div>`
                    : ''
                }
              </div>
              ${(i + 1) % 5 === 0 && i < processedQuestions.length - 1 ? '<div class="page-break"></div>' : ''}
            `
          )
          .join('')}
      </body>
      </html>
    `;
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(pdfContent);
      newWindow.document.close();
      
      // Wait for MathJax to load and render before printing
      const checkMathJax = setInterval(() => {
        if ((newWindow as any).MathJax && (newWindow as any).MathJax.typesetPromise) {
          clearInterval(checkMathJax);
          (newWindow as any).MathJax.typesetPromise().then(() => {
            setTimeout(() => {
              newWindow.print();
              alert('Quiz PDF ready! Use print dialog to save as PDF.');
            }, 500);
          });
        }
      }, 100);
      
      // Fallback timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkMathJax);
        newWindow.print();
        alert('Quiz PDF ready! Use print dialog to save as PDF.');
      }, 5000);
    }
  };

  const downloadAnswerKey = () => {
    if (!generatedQuiz) return;
    
    // Helper function to replace {blank#} placeholders with underscores
    const replaceBlanks = (text: any): any => {
      if (!text || typeof text !== 'string') return text;
      return text.replace(/\{blank\d+\}/g, '________');
    };
    
    // Preprocess ALL questions to replace {blank#} placeholders everywhere
    const processedQuestions = editedQuestions.map(q => ({
      ...q,
      question: {
        ...q.question,
        text: replaceBlanks(q.question.text)
      },
      options: q.options?.map((opt: any) => ({
        ...opt,
        text: replaceBlanks(opt.text)
      })),
      answer: {
        ...q.answer,
        text: typeof q.answer.text === 'string' ? replaceBlanks(q.answer.text) : q.answer.text
      }
    }));
    
    const answerKeyContent = `
      <!DOCTYPE html>
      <html dir="ltr">
      <head>
        <title>${generatedQuiz.title} - Answer Key</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">
        <script>
          window.MathJax = {
            tex: {
              inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
              displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']]
            },
            startup: {
              pageReady: () => {
                return MathJax.startup.defaultPageReady();
              }
            }
          };
        </script>
        <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; direction: ltr; }
          .header { border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 28px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
          .info { font-size: 14px; color: #6b7280; margin-bottom: 5px; }
          .answer { margin-bottom: 20px; }
          .answer-number { margin-bottom: 8px; overflow: hidden; display: flex; justify-content: space-between; align-items: center; }
          .answer-number-urdu { font-family: 'Noto Nastaliq Urdu', sans-serif; direction: rtl; text-align: right; font-weight: bold; font-size: 18px; }
          .answer-number-marks { font-family: Arial, sans-serif; direction: ltr; text-align: right; font-weight: bold; }
          .answer-number-marks-urdu { font-family: Arial, sans-serif; direction: ltr; text-align: left; font-weight: bold; }
          .answer-number-english { font-family: Arial, sans-serif; direction: ltr; text-align: left; font-weight: bold; font-size: 18px; }
          .answer-text { font-size: 16px; margin-bottom: 12px; }
          .urdu { font-family: 'Noto Nastaliq Urdu', sans-serif; direction: rtl; text-align: right; }
          mark { background-color: #fef08a; padding: 2px 4px; border-radius: 2px; }
          b, strong { font-weight: bold; }
          i, em { font-style: italic; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${generatedQuiz.title} - Answer Key</div>
          <div class="info"><strong>Grade:</strong> ${generatedQuiz.class}</div>
          <div class="info"><strong>Subject:</strong> ${generatedQuiz.subject}</div>
          <div class="info"><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
          <div class="info"><strong>Total Questions:</strong> ${generatedQuiz.totalQuestions}</div>
        </div>
        ${processedQuestions
          .map(
            (q, i) => `
              <div class="answer">
                <div class="answer-number" ${q.question.isRTL ? 'style="direction: rtl;"' : ''}>
                  <div class="${q.question.isRTL ? 'answer-number-urdu' : 'answer-number-english'}">
                    ${q.question.isRTL ? 'سوال ' + toUrduNumber(i + 1) : 'Question ' + (i + 1)}
                  </div>
                  ${isMarked ? `<div class="${q.question.isRTL ? 'answer-number-marks-urdu' : 'answer-number-marks'}">(${q.marks} marks)</div>` : ''}
                </div>
                <div class="answer-text ${q.question.isRTL ? 'urdu' : ''}">${convertNewlinesToHtml(extractLatexFromFormulas(q.question.text))}</div>
                <div class="answer-text"><strong>Answer:</strong> ${
                  q.type === 'multiple' && q.options?.length
                    ? `${q.question.isRTL ? optionLabels(true)[q.answer.value] : String.fromCharCode(65 + q.answer.value)}. ${convertNewlinesToHtml(q.options[q.answer.value]?.text) || q.answer.text}`
                    : q.type === 'truefalse'
                    ? q.question.isRTL
                      ? q.answer.value
                        ? 'صحیح'
                        : 'غلط'
                      : q.answer.value
                      ? 'True'
                      : 'False'
                    : q.type === 'fillblanks'
                    ? typeof q.answer.value === 'string'
                      ? convertNewlinesToHtml(q.answer.value)
                      : Object.entries(q.answer.value || {})
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(q.question.isRTL ? ' یا ' : ' or ') : v}`)
                        .join(', ')
                    : convertNewlinesToHtml(q.answer.text || q.answer.value)
                }</div>
              </div>
            `
          )
          .join('')}
      </body>
      </html>
    `;
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(answerKeyContent);
      newWindow.document.close();
      
      // Wait for MathJax to load and render before printing
      const checkMathJax = setInterval(() => {
        if ((newWindow as any).MathJax && (newWindow as any).MathJax.typesetPromise) {
          clearInterval(checkMathJax);
          (newWindow as any).MathJax.typesetPromise().then(() => {
            setTimeout(() => {
              newWindow.print();
              alert('Answer Key ready! Use print dialog to save as PDF.');
            }, 500);
          });
        }
      }, 100);
      
      // Fallback timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkMathJax);
        newWindow.print();
        alert('Answer Key ready! Use print dialog to save as PDF.');
      }, 5000);
    }
  };

  const downloadQuizWord = async () => {
    if (!generatedQuiz) return;
    try {
      const docxModule = await import('docx');
      const { Document, Packer, Paragraph, TextRun, Header, Footer, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun, ShadingType } = docxModule;
      
      // Helper function to parse HTML formatting tags and create TextRun array
      const parseFormattedText = (text: string, baseFont: string, baseSize: number, baseColor: string, isRTL: boolean): any[] => {
        if (!text || typeof text !== 'string') return [new TextRun({ text: text || '', font: baseFont, size: baseSize, color: baseColor })];
        
        const runs: any[] = [];
        const regex = /<(b|i|mark)>(.*?)<\/\1>|([^<]+)/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
          if (match[3]) {
            // Plain text
            runs.push(new TextRun({ text: match[3], font: baseFont, size: baseSize, color: baseColor }));
          } else {
            // Formatted text
            const tag = match[1];
            const content = match[2];
            const runOptions: any = { text: content, font: baseFont, size: baseSize, color: baseColor };
            
            if (tag === 'b') {
              runOptions.bold = true;
            } else if (tag === 'i') {
              runOptions.italics = true;
            } else if (tag === 'mark') {
              runOptions.highlight = 'yellow';
            }
            
            runs.push(new TextRun(runOptions));
          }
        }
        
        return runs.length > 0 ? runs : [new TextRun({ text: text, font: baseFont, size: baseSize, color: baseColor })];
      };
      
      // Helper function to fetch image and convert to buffer
      const fetchImageAsBuffer = async (url: string): Promise<Uint8Array | null> => {
        try {
          const response = await fetch(url);
          if (!response.ok) return null;
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          return new Uint8Array(arrayBuffer);
        } catch (error) {
          console.error('Error fetching image:', error);
          return null;
        }
      };
      
      // Pre-fetch all images
      const imageBuffers: { [key: number]: Uint8Array | null } = {};
      for (let i = 0; i < editedQuestions.length; i++) {
        const q = editedQuestions[i];
        if ((q as any).imageUrl) {
          imageBuffers[i] = await fetchImageAsBuffer((q as any).imageUrl);
        }
      }
      
      // Alternative download function if file-saver doesn't work
      const downloadBlob = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      };

      const doc = new Document({
        sections: [{
          properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: generatedQuiz.title, size: 40, font: 'Calibri', bold: true, color: '1a1a1a' })],
                  alignment: AlignmentType.LEFT,
                  spacing: { after: 200 },
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: `Generated: ${new Date().toLocaleString()}`, size: 20, font: 'Calibri' })],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 200 },
                }),
              ],
            }),
          },
          children: [
            // Comprehensive Header Table
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                insideVertical: { style: BorderStyle.SINGLE, size: 1 },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Student Name:', bold: true, size: 24, font: 'Calibri', color: '1a1a1a' })] })],
                      width: { size: 25, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '____________________', size: 24, font: 'Cambria', color: '666666' })] })],
                      width: { size: 25, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Student ID:', bold: true, size: 24, font: 'Calibri', color: '1a1a1a' })] })],
                      width: { size: 25, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '____________________', size: 24, font: 'Cambria', color: '666666' })] })],
                      width: { size: 25, type: WidthType.PERCENTAGE },
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Class:', bold: true, size: 24, font: 'Calibri', color: '1a1a1a' })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: generatedQuiz.class, size: 24, font: 'Cambria', color: '#2c3e50' })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Subject:', bold: true, size: 24, font: 'Calibri', color: '1a1a1a' })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: generatedQuiz.subject, size: 24, font: 'Cambria', color: '#2c3e50' })] })],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Series:', bold: true, size: 24, font: 'Calibri', color: '1a1a1a' })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '____________________', size: 24, font: 'Cambria', color: '666666' })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Test Type:', bold: true, size: 24, font: 'Calibri', color: '1a1a1a' })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: generatedQuiz.quizType || 'Quiz', size: 24, font: 'Cambria', color: '#2c3e50' })] })],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Total Marks:', bold: true, size: 24, font: 'Calibri', color: '1a1a1a' })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: isMarked ? generatedQuiz.totalMarks.toString() : 'N/A', size: 24, font: 'Cambria', color: '#2c3e50' })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Total Time:', bold: true, size: 24, font: 'Calibri', color: '1a1a1a' })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: `${generatedQuiz.timeLimitMinutes} minutes`, size: 24, font: 'Cambria', color: '#2c3e50' })] })],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Obtained Marks:', bold: true, size: 24, font: 'Calibri', color: '1a1a1a' })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '____________________', size: 24, font: 'Cambria', color: '666666' })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Date:', bold: true, size: 24, font: 'Calibri', color: '1a1a1a' })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: new Date().toLocaleDateString(), size: 24, font: 'Cambria', color: '#2c3e50' })] })],
                    }),
                  ],
                }),
              ],
            }),
            // Add spacing after header table
            new Paragraph({
              children: [new TextRun({ text: '', size: 20 })],
              spacing: { after: 400 },
            }),
            ...editedQuestions.flatMap((q, i) => [
              // Question Header with proper marks positioning
              ...(isMarked ? [
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: q.question.isRTL ? [
                        // For RTL (Urdu): Marks on left, Question number on right
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({ 
                                  text: `(${q.marks} marks)`, 
                                  size: 24, 
                                  font: 'Arial',
                                  bold: true 
                                })
                              ],
                              alignment: AlignmentType.LEFT,
                            })
                          ],
                          width: { size: 30, type: WidthType.PERCENTAGE },
                          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({ 
                                  text: `سوال نمبر ${toUrduNumber(i + 1)} :`, 
                                  size: 24, 
                                  font: 'Noto Nastaliq Urdu',
                                  bold: true 
                                })
                              ],
                              alignment: AlignmentType.RIGHT,
                            })
                          ],
                          width: { size: 70, type: WidthType.PERCENTAGE },
                          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                        }),
                      ] : [
                        // For LTR (English): Question number on left, Marks on right
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({ 
                                  text: `Question ${i + 1}:`, 
                                  size: 28, 
                                  font: 'Calibri',
                                  bold: true,
                                  color: '1a1a1a'
                                })
                              ],
                              alignment: AlignmentType.LEFT,
                            })
                          ],
                          width: { size: 70, type: WidthType.PERCENTAGE },
                          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                        }),
                        new TableCell({
                          children: [
                            new Paragraph({
                              children: [
                                new TextRun({ 
                                  text: `(${q.marks} marks)`, 
                                  size: 24, 
                                  font: 'Calibri',
                                  bold: true,
                                  color: '1a1a1a'
                                })
                              ],
                              alignment: AlignmentType.RIGHT,
                            })
                          ],
                          width: { size: 30, type: WidthType.PERCENTAGE },
                          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                        }),
                      ],
                    }),
                  ],
                  borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
                }),
              ] : [
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: q.question.isRTL ? `سوال نمبر ${toUrduNumber(i + 1)} :` : `Question ${i + 1}:`, 
                      size: 28, 
                      font: q.question.isRTL ? 'Noto Nastaliq Urdu' : 'Calibri',
                      bold: true,
                      color: '1a1a1a'
                    })
                  ],
                  heading: 'Heading2',
                  alignment: q.question.isRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
                  spacing: { before: 200, after: 100 },
                }),
              ]),
              // Question text - split by newlines to preserve formatting and parse HTML tags
              ...splitTextByNewlines(q.type === 'fillblanks' 
                ? convertFormulasToReadable(q.question.text.replace(/\{blank\d+\}/g, '________'))
                : convertFormulasToReadable(q.question.text)
              ).map(line => new Paragraph({
                children: parseFormattedText(
                  line || ' ', // Use space for empty lines to preserve line breaks
                  q.question.isRTL ? 'Noto Nastaliq Urdu' : paperFormat.questionFontFamily,
                  paperFormat.questionFontSize * 2, // Convert to half-points (Word uses half-points)
                  '2c3e50',
                  q.question.isRTL
                ),
                alignment: q.question.isRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
                spacing: { 
                  after: line === '' ? 50 : Math.round((paperFormat.questionLineSpacing - 1) * 120),
                  line: Math.round(paperFormat.questionLineSpacing * 240),
                  lineRule: 'atLeast' as any
                },
              })),
              // Cognitive Level badges
              ...(showCognitiveLevel && q.cognitiveLevel && (q.cognitiveLevel.knowledge || q.cognitiveLevel.understanding || q.cognitiveLevel.application) ? [
                new Paragraph({
                  children: [
                    ...(q.cognitiveLevel.knowledge ? [
                      new TextRun({ 
                        text: ' Knowledge ', 
                        size: 18, 
                        font: 'Calibri',
                        bold: true,
                        color: '1e40af',
                        shading: { fill: 'dbeafe', type: ShadingType.SOLID }
                      }),
                      new TextRun({ text: '  ', size: 18 })
                    ] : []),
                    ...(q.cognitiveLevel.understanding ? [
                      new TextRun({ 
                        text: ' Understanding ', 
                        size: 18, 
                        font: 'Calibri',
                        bold: true,
                        color: '166534',
                        shading: { fill: 'dcfce7', type: ShadingType.SOLID }
                      }),
                      new TextRun({ text: '  ', size: 18 })
                    ] : []),
                    ...(q.cognitiveLevel.application ? [
                      new TextRun({ 
                        text: ' Application ', 
                        size: 18, 
                        font: 'Calibri',
                        bold: true,
                        color: '92400e',
                        shading: { fill: 'fef3c7', type: ShadingType.SOLID }
                      })
                    ] : [])
                  ],
                  spacing: { after: 100 }
                })
              ] : []),
              ...((q as any).imageUrl && imageBuffers[i] ? [new Paragraph({
                children: [
                  new ImageRun({
                    data: imageBuffers[i]!,
                    transformation: {
                      width: 400,
                      height: 300,
                    },
                  })
                ],
                alignment: AlignmentType.LEFT,
                spacing: { after: 100 },
              })] : (q as any).imageUrl ? [new Paragraph({
                children: [new TextRun({ text: `[Image: ${(q as any).imageUrl}]`, size: 20, font: 'Calibri', color: '999999', italics: true })],
                alignment: AlignmentType.LEFT,
                spacing: { after: 100 },
              })] : []),
              ...(q.type === 'multiple' && q.options?.length
                ? q.options.flatMap((opt: any, j: number) => {
                    const optionLabel = q.question.isRTL ? optionLabels(true)[j] : String.fromCharCode(65 + j);
                    const optionText = convertFormulasToReadable(opt.text);
                    const optionLines = splitTextByNewlines(optionText);
                    
                    // First line includes the label (A., B., etc.)
                    return optionLines.map((line, lineIndex) => {
                      const prefix = lineIndex === 0 ? `${optionLabel}. ` : '   '; // Indent continuation lines
                      
                      // Parse formatting for the line content
                      const textRuns = parseFormattedText(
                        line || ' ',
                        q.question.isRTL ? 'Noto Nastaliq Urdu' : paperFormat.optionFontFamily,
                        paperFormat.optionFontSize * 2, // Convert to half-points
                        '2c3e50',
                        q.question.isRTL
                      );
                      
                      // Add prefix as first text run
                      const allRuns = [
                        new TextRun({ 
                          text: prefix,
                          size: paperFormat.optionFontSize * 2, 
                          font: q.question.isRTL ? 'Noto Nastaliq Urdu' : paperFormat.optionFontFamily,
                          color: '2c3e50'
                        }),
                        ...textRuns
                      ];
                      
                      return new Paragraph({
                        children: allRuns,
                        alignment: q.question.isRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
                        spacing: { after: lineIndex === optionLines.length - 1 ? 60 : 30 },
                      });
                    });
                  })
                : q.type === 'truefalse' && q.options?.length
                ? q.options.flatMap((opt: any, j: number) => {
                    const optionLabel = q.question.isRTL ? optionLabels(true)[j] : String.fromCharCode(65 + j);
                    const optionText = q.question.isRTL ? (opt.text === 'True' ? 'صحیح' : 'غلط') : opt.text;
                    const formattedOption = q.question.isRTL 
                      ? `${optionLabel}. ${optionText}` 
                      : `${optionLabel}. ${optionText}`;
                    
                    return [new Paragraph({
                      children: [new TextRun({ 
                        text: formattedOption, 
                        size: 26, 
                        font: q.question.isRTL ? 'Noto Nastaliq Urdu' : 'Cambria',
                        color: '2c3e50'
                      })],
                      alignment: q.question.isRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
                      spacing: { after: 60 },
                    })];
                  })
                : q.type === 'fillblanks'
                ? []
                : [
                    new Paragraph({
                      children: [new TextRun({ 
                        text: q.question.isRTL ? 'نیچے اپنا جواب لکھیں۔' : 'Write your answer below.', 
                        size: 26, 
                        font: q.question.isRTL ? 'Noto Nastaliq Urdu' : 'Cambria',
                        color: '2c3e50'
                      })],
                      alignment: q.question.isRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
                      spacing: { after: 50 },
                    }),
                    // Add answer lines for short/long answer questions only (not fillblanks)
                    ...(Array.from({ length: (answerLines as any)[`${i}-lines`] ?? defaultAnswerLines }).map(() => 
                      new Paragraph({
                        children: [new TextRun({ 
                          text: '_______________________________________________________', 
                          size: 20, 
                          font: 'Calibri',
                          color: '999999'
                        })],
                        alignment: q.question.isRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
                        spacing: { 
                          after: Math.round(paperFormat.answerLineSpacing * 4.17), // Convert px to twips (1px = ~4.17 twips)
                          before: 50
                        },
                      })
                    )),
                  ]),
              ...(i < editedQuestions.length - 1 && (i + 1) % 5 === 0 ? [new Paragraph({ pageBreakBefore: true })] : []),
            ]).flat(),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, `${generatedQuiz.title}.docx`);
      alert('Quiz Word document downloaded!');
    } catch (error) {
      console.error('Error generating Word document:', error);
      alert('Error generating Word document: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const mathJaxConfig = {
    tex: { inlineMath: [['$', '$'], ['\\(', '\\)']], displayMath: [['$$', '$$'], ['\\[', '\\]']] },
    options: { renderActions: { find: [10, () => {}, () => {}] } },
  };

  // Format selection modal
  const FormatSelectionModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        <div className="p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Quiz Format</h2>
          <p className="text-gray-600 mb-6">Choose how you want to create your quiz</p>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                setQuizFormat('Online');
                setShowFormatModal(false);
              }}
              className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl mt-1 group-hover:scale-110 transition-transform">🌐</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Online Quiz</h3>
                  <p className="text-sm text-gray-600">Create interactive quizzes for online submission. Includes all question types and student assignments.</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">All Question Types</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Student Assign</span>
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                setQuizFormat('Offline');
                setShowFormatModal(false);
              }}
              className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl mt-1 group-hover:scale-110 transition-transform">🖨️</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Offline (Printable)</h3>
                  <p className="text-sm text-gray-600">Create printable quizzes with basic question types only. Perfect for paper-based assessments.</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Printable Format</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Basic Types Only</span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <MathJaxContext config={mathJaxConfig}>
      {showFormatModal && <FormatSelectionModal />}
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole="Teacher" currentPage="quiz" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Generate Quiz</h1>
                  <p className="text-sm sm:text-base text-gray-600">QB: <span className="font-semibold">{selectedQB ? (selectedQB === 'both' ? 'Both Sources' : selectedQB.charAt(0).toUpperCase() + selectedQB.slice(1)) : 'Not Selected'}</span> | Format: <span className="font-semibold">{quizFormat || 'Not Selected'}</span></p>
                </div>
                {selectedQB && (
                  <button
                    onClick={() => setSelectedQB(null)}
                    className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Change QB
                  </button>
                )}
                {quizFormat && (
                  <button
                    onClick={() => setShowFormatModal(true)}
                    className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Change Format
                  </button>
                )}
              </div>
            </div>

          {/* Step 0: Question Bank Selection */}
          {!selectedQB && (
            <div className="bg-white rounded-xl shadow-sm border-2 border-blue-900 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Question Bank Source</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedQB('school')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedQB === 'school' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900 mb-1">School Questions</div>
                  <div className="text-sm text-gray-600">Questions from your school</div>
                </button>
                <button
                  onClick={() => setSelectedQB('oup')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedQB === 'oup' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900 mb-1">OUP Questions</div>
                  <div className="text-sm text-gray-600">Published OUP content</div>
                </button>
                <button
                  onClick={() => setSelectedQB('both')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedQB === 'both' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900 mb-1">Both</div>
                  <div className="text-sm text-gray-600">Mix from both sources</div>
                </button>
              </div>
            </div>
          )}

          {selectedQB && !quizFormat && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm">
              Please select a quiz format (Online or Offline) to get started.
            </div>
          )}

          {/* Debug: Show assigned books - HIDDEN */}

          {selectedQB && user && assignedBooks.length === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
              <strong>⚠️ No Books Assigned:</strong>
              <div className="text-xs mt-2">
                You don't have any books assigned yet. Please contact your administrator to assign books to your account.
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Grade, Subject, Book Selection */}
              {selectedQB && quizFormat && (<div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm mr-2">1</span>
                  Course Selection
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grade / Class</label>
                    <select
                      value={selectedGrade}
                      onChange={e => {
                        setSelectedGrade(e.target.value);
                        setSelectedSubject('');
                        setSelectedBook('');
                        setSelectedChapters([]);
                        setSelectedSLOs([]);
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                    >
                      <option value="">Select Grade</option>
                      {uniqueGrades.map(grade => (
                        <option key={grade} value={grade}>Class {grade}</option>
                      ))}
                    </select>
                  </div>
                  {selectedGrade && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                      <select
                        value={selectedSubject}
                        onChange={e => {
                          setSelectedSubject(e.target.value);
                          setSelectedBook('');
                          setSelectedChapters([]);
                          setSelectedSLOs([]);
                        }}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      >
                        <option value="">Select Subject</option>
                        {(() => {
                          // Get subjects for the selected grade
                          if (subjectGradePairs.length > 0) {
                            // Use subjectGradePairs for Teachers
                            const normalizedSelectedGrade = normalizeGrade(selectedGrade);
                            return subjectGradePairs
                              .filter(p => normalizeGrade(p.grade) === normalizedSelectedGrade)
                              .map(p => p.subject)
                              .filter((v, i, a) => a.indexOf(v) === i)
                              .map(subject => (
                                <option key={subject} value={subject}>{subject}</option>
                              ));
                          } else {
                            // Fallback to assignedBooks
                            return assignedBooks
                              .filter(b => {
                                const normalizedBookGrade = normalizeGrade(b.grade);
                                return normalizedBookGrade === selectedGrade;
                              })
                              .map(b => b.subject)
                              .filter((v, i, a) => a.indexOf(v) === i)
                              .map(subject => (
                                <option key={subject} value={subject}>{subject}</option>
                              ));
                          }
                        })()}
                      </select>
                    </div>
                  )}
                  {selectedSubject && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                      <select
                        value={selectedBook}
                        onChange={e => {
                          setSelectedBook(e.target.value);
                          setSelectedChapters([]);
                          setSelectedSLOs([]);
                        }}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                      >
                        <option value="">Select Book</option>
                        {(() => {
                          // Use the pre-built books object to get books for selected grade and subject
                          const availableBooks = books[String(selectedGrade)]?.[selectedSubject] || [];
                          console.log('📖 Book Selection Debug:', {
                            selectedGrade,
                            selectedSubject,
                            availableBooksLength: availableBooks.length,
                            availableBooks,
                            bookIdMap,
                            booksObject: books
                          });
                          return availableBooks.map(bookObj => {
                            const bookTitle = typeof bookObj === 'string' ? bookObj : bookObj.title;
                            return (
                              <option key={bookTitle} value={bookTitle}>{bookTitle}</option>
                            );
                          });
                        })()}
                      </select>
                    </div>
                  )}
                </div>
              </div>)}

              {/* Step 2: Chapter Selection */}
              {quizFormat && selectedBook && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm mr-2">2</span>
                        Select Chapters
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">📚 Chapters are consistent across all accounts (from {selectedQB === 'both' ? 'OUP & School' : selectedQB === 'oup' ? 'OUP' : 'School'} sources)</p>
                    </div>
                    {getAvailableChapters().length > 0 && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedChapters(getAvailableChapters())}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Select All
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => {
                            setSelectedChapters([]);
                            setSelectedSLOs([]);
                          }}
                          className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </div>
                  {getAvailableChapters().length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                        {getAvailableChapters().map(chapter => (
                          <label key={chapter} className="flex items-start cursor-pointer p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={selectedChapters.includes(chapter)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedChapters(prev => [...prev, chapter]);
                                } else {
                                  setSelectedChapters(prev => prev.filter(c => c !== chapter));
                                  setSelectedSLOs([]);
                                }
                              }}
                              className="mt-1 mr-3 min-w-[16px]"
                            />
                            <span className="text-sm text-gray-700">{chapter}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-3">{selectedChapters.length} chapter(s) selected</p>
                    </>
                  ) : isLoadingChapters ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="flex justify-center mb-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      </div>
                      <p className="text-sm font-medium text-gray-700">Loading chapters...</p>
                      <p className="text-xs text-gray-600 mt-1">This may take a moment</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <p className="mt-2 text-sm font-medium text-gray-700">No Chapters Found</p>
                      <p className="text-xs text-gray-600 mt-1">
                        No chapters available for <strong>"{selectedBook}"</strong> in {selectedQB === 'both' ? 'OUP & School' : selectedQB === 'oup' ? 'OUP' : 'School'} sources
                      </p>
                      {selectedQB === 'school' && (
                        <div className="text-xs text-blue-600 mt-3 space-y-1">
                          <p>💡 <strong>How to fix this:</strong></p>
                          <ul className="list-disc list-inside text-left inline-block">
                            <li>Ask your admin to create chapters for "{selectedBook}"</li>
                            <li>Or add questions with chapter information to your school's question bank</li>
                          </ul>
                        </div>
                      )}
                      {selectedQB === 'oup' && (
                        <p className="text-xs text-blue-600 mt-2">
                          💡 OUP chapters for "{selectedBook}" may not be available yet. Try selecting "School" or "Both" sources.
                        </p>
                      )}
                      {selectedQB === 'both' && (
                        <div className="text-xs text-blue-600 mt-3 space-y-1">
                          <p>💡 <strong>How to fix this:</strong></p>
                          <ul className="list-disc list-inside text-left inline-block">
                            <li>Check if OUP has chapters for this book</li>
                            <li>Ask your admin to create chapters in your school</li>
                            <li>Add questions with chapter information</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: SLO Selection */}
              {quizFormat && selectedChapters.length > 0 && getAvailableSLOs().length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm mr-2">3</span>
                        Select Learning Outcomes (SLOs)
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">🎯 SLOs are shown based on available questions in your selected {selectedQB === 'both' ? 'OUP & School' : selectedQB === 'oup' ? 'OUP' : 'School'} sources</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedSLOs(getAvailableSLOs())}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => setSelectedSLOs([])}
                        className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {getAvailableSLOs().map(slo => (
                      <label key={slo} className="flex items-start cursor-pointer p-3 border rounded-lg hover:bg-blue-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedSLOs.includes(slo)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSLOs(prev => [...prev, slo]);
                            } else {
                              setSelectedSLOs(prev => prev.filter(s => s !== slo));
                            }
                          }}
                          className="mt-1 mr-3 min-w-[16px]"
                        />
                        <span className="text-sm text-gray-700">{slo}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">{selectedSLOs.length} SLO(s) selected</p>
                </div>
              )}

              {/* Info message when no SLOs available */}
              {quizFormat && selectedChapters.length > 0 && getAvailableSLOs().length === 0 && (
                <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-semibold text-yellow-900 mb-1">No SLOs Available</h4>
                      <p className="text-xs text-yellow-800">
                        The selected questions don't have Student Learning Outcomes (SLOs) assigned. You can still proceed to create a quiz without SLO filtering.
                      </p>
                      <p className="text-xs text-yellow-700 mt-2">
                        💡 <strong>Tip:</strong> Add SLO values to your questions when creating them to enable SLO-based filtering.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Question Configuration by Type */}
              {quizFormat && selectedBook && (selectedChapters.length > 0 || selectedSLOs.length > 0) && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm mr-2">4</span>
                    Configure Questions
                    {quizFormat === 'Online' && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">+ Interactive Types</span>
                    )}
                  </h3>
                  
                  {/* Check if any questions are available */}
                  {(() => {
                    const selectedGradeNormalized = String(selectedGrade).replace(/^(Grade|Class)\s+/i, '').trim().toLowerCase();
                    const selectedSubjectLower = selectedSubject.toLowerCase();
                    const selectedBookLower = selectedBook.toLowerCase();
                    
                    const availableForConfig = questions.filter(q => {
                      const qGradeNormalized = (q.grade || q.class || '').toString().replace(/^(Grade|Class)\s+/i, '').trim().toLowerCase();
                      const qSubject = (q.subject || '').toLowerCase();
                      const qBook = (q.book || '').toLowerCase();
                      const qChapter = q.chapter || '';
                      const qSLO = q.slo || '';
                      
                      const gradeMatch = qGradeNormalized === selectedGradeNormalized;
                      const subjectMatch = qSubject === selectedSubjectLower;
                      const bookMatch = qBook === selectedBookLower;
                      const chapterMatch = selectedChapters.length === 0 || selectedChapters.includes(qChapter);
                      const sloMatch = selectedSLOs.length === 0 || selectedSLOs.includes(qSLO);
                      
                      return gradeMatch && subjectMatch && bookMatch && chapterMatch && sloMatch;
                    }).length;

                    if (availableForConfig === 0) {
                      return (
                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-center">
                          <svg className="mx-auto h-12 w-12 text-yellow-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm font-medium text-yellow-900 mb-1">No Questions Available</p>
                          <p className="text-xs text-yellow-800">
                            No questions found for the selected book, chapter(s), and SLO(s) in the <strong>{selectedQB === 'both' ? 'OUP & School' : selectedQB === 'oup' ? 'OUP' : 'School'}</strong> question bank.
                          </p>
                          {selectedQB === 'school' && (
                            <p className="text-xs text-blue-700 mt-2">
                              💡 Add questions to your school question bank for this book and chapter combination.
                            </p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {/* Filter question types based on format: Offline = basic only, Online = all types */}
                        {questionTypes
                          .filter(qt => quizFormat === 'Online' || !qt.isInteractive)
                          .map(({ key, label, icon, isInteractive }) => {
                          const available = getQuestionCountByType(key);
                          return (
                            <div key={key} className={`border rounded-lg p-4 ${available > 0 ? 'bg-gray-50' : 'bg-red-50 opacity-50'}`}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <i className={`${icon} ${isInteractive ? 'text-purple-600' : 'text-blue-600'}`}></i>
                                  <span className="font-medium text-gray-900">{label}</span>
                                  {isInteractive && (
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Interactive</span>
                                  )}
                                  <span className={`text-xs ${available > 0 ? 'text-gray-500' : 'text-red-600 font-medium'}`}>
                                    ({available} available)
                                    {available === 0 && ' - Not available in ' + selectedQB}
                                  </span>
                                </div>
                              </div>
                              {available > 0 && (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                                      <input
                                        type="number"
                                        min="0"
                                        max={available}
                                        value={(questionConfig as any)[key].count}
                                        onChange={e => setQuestionConfig(prev => ({
                                          ...prev,
                                          [key]: { ...(prev as any)[key], count: Math.min(parseInt(e.target.value) || 0, available) }
                                        }))}
                                        className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="0"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Marks Each</label>
                                      <input
                                        type="number"
                                        min="0.5"
                                        step="0.5"
                                        value={(questionConfig as any)[key].marks}
                                        onChange={e => setQuestionConfig(prev => ({
                                          ...prev,
                                          [key]: { ...(prev as any)[key], marks: parseFloat(e.target.value) || 0 }
                                        }))}
                                        className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="1"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-2">Difficulty Levels</label>
                                    <div className="flex flex-wrap gap-3">
                                      {['Easy', 'Medium', 'Hard'].map(difficulty => (
                                        <label key={difficulty} className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={(questionConfig as any)[key].difficulties.includes(difficulty)}
                                            onChange={e => {
                                              // Prevent deselecting all difficulties
                                              if (!e.target.checked && (questionConfig as any)[key].difficulties.length === 1) {
                                                alert('Please select at least one difficulty level');
                                                return;
                                              }
                                              
                                              const newDifficulties = e.target.checked
                                                ? [...(questionConfig as any)[key].difficulties, difficulty]
                                                : (questionConfig as any)[key].difficulties.filter((d: string) => d !== difficulty);
                                              
                                              setQuestionConfig(prev => ({
                                                ...prev,
                                                [key]: {
                                                  ...(prev as any)[key],
                                                  difficulties: newDifficulties
                                                }
                                              }));
                                            }}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                          />
                                          <span className="text-sm text-gray-700">{difficulty}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Total Questions:</span>
                  <span className="font-bold text-blue-600">
                    {Object.values(questionConfig).reduce((sum, config) => sum + config.count, 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="font-medium text-gray-700">Total Marks:</span>
                  <span className="font-bold text-blue-600">
                    {Object.values(questionConfig).reduce((sum, config) => sum + (config.count * config.marks), 0)}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              {/* Course Assignment Details - HIDDEN */}

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quiz Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Class:</span>
                    <span className="font-medium text-gray-900">{selectedGrade ? `Class ${selectedGrade}` : 'Not Selected'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subject:</span>
                    <span className="font-medium text-gray-900">{selectedSubject || 'Not Selected'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Book:</span>
                    <span className="font-medium text-gray-900 text-right">{selectedBook || 'Not Selected'}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Chapters:</span>
                      <span className="font-medium text-gray-900">{selectedChapters.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SLOs:</span>
                      <span className="font-medium text-gray-900">{selectedSLOs.length > 0 ? selectedSLOs.length : 'All'}</span>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Total Questions:</span>
                      <span className="font-bold text-blue-600">
                        {Object.values(questionConfig).reduce((sum, config) => sum + config.count, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Marks:</span>
                      <span className="font-bold text-blue-600">
                        {Object.values(questionConfig).reduce((sum, config) => sum + (config.count * config.marks), 0)}
                      </span>
                    </div>
                  </div>
                  {selectedBook && (
                    <div className="border-t pt-3 text-xs text-gray-500">
                      <div className="space-y-1">
                        {Object.entries(questionConfig).map(([type, config]) => config.count > 0 && (
                          <div key={type} className="flex justify-between">
                            <span className="capitalize">{type === 'multiple' ? 'MCQs' : type === 'truefalse' ? 'True/False' : type === 'fillblanks' ? 'Fill Blanks' : type}:</span>
                            <span>{config.count} × {config.marks}m</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleCreateQuiz}
                  disabled={!selectedBook || Object.values(questionConfig).reduce((sum, config) => sum + config.count, 0) === 0}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  <i className="ri-file-list-3-line mr-2"></i>Generate Quiz
                </button>
              </div>
            </div>
          </div>
          {showConfirmModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Confirm Quiz</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Title</label>
                    <input
                      type="text"
                      value={quizTitle}
                      onChange={e => setQuizTitle(e.target.value)}
                      maxLength={120}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Type</label>
                    <select
                      value={quizType}
                      onChange={e => setQuizType(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {quizTypes.map(type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Mode</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={isMarked}
                          onChange={() => setIsMarked(true)}
                          className="mr-2"
                        />
                        <span>Marked</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={!isMarked}
                          onChange={() => setIsMarked(false)}
                          className="mr-2"
                        />
                        <span>Unmarked</span>
                      </label>
                    </div>
                  </div>

                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmGenerateQuiz}
                    disabled={isGenerating}
                    className={`px-4 py-2 rounded-lg ${isGenerating ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white flex items-center space-x-2`}
                  >
                    {isGenerating && (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    <span>{isGenerating ? 'Generating Quiz...' : 'Confirm & Generate'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {showEditor && generatedQuiz && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">Quiz Paper Editor</h3>
                    <button
                      onClick={() => setShowEditor(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <i className="ri-close-line text-2xl"></i>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold">Total Marks: {isMarked ? editedQuestions.reduce((sum, q) => sum + q.marks, 0) : 'N/A'}</h4>
                  </div>
                  
                  {/* Paper Formatting Section */}
                  <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setShowFormatting(!showFormatting)}
                    >
                      <h4 className="text-md font-semibold text-gray-900 flex items-center">
                        <i className="ri-font-size-2 mr-2 text-purple-600"></i>
                        Paper Formatting
                      </h4>
                      <button 
                        type="button"
                        className="text-purple-600 hover:text-purple-800 transition-colors"
                      >
                        <i className={`ri-arrow-${showFormatting ? 'up' : 'down'}-s-line text-xl`}></i>
                      </button>
                    </div>
                    
                    {showFormatting && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Font Size (px)
                        </label>
                        <input
                          type="number"
                          value={paperFormat.questionFontSize}
                          onChange={e => setPaperFormat({...paperFormat, questionFontSize: parseInt(e.target.value) || 17})}
                          min="10"
                          max="30"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Font Family
                        </label>
                        <select
                          value={paperFormat.questionFontFamily}
                          onChange={e => setPaperFormat({...paperFormat, questionFontFamily: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="Cambria">Cambria</option>
                          <option value="Arial">Arial</option>
                          <option value="Times New Roman">Times New Roman</option>
                          <option value="Georgia">Georgia</option>
                          <option value="Calibri">Calibri</option>
                          <option value="Verdana">Verdana</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Option Font Size (px)
                        </label>
                        <input
                          type="number"
                          value={paperFormat.optionFontSize}
                          onChange={e => setPaperFormat({...paperFormat, optionFontSize: parseInt(e.target.value) || 16})}
                          min="10"
                          max="30"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Option Font Family
                        </label>
                        <select
                          value={paperFormat.optionFontFamily}
                          onChange={e => setPaperFormat({...paperFormat, optionFontFamily: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="Cambria">Cambria</option>
                          <option value="Arial">Arial</option>
                          <option value="Times New Roman">Times New Roman</option>
                          <option value="Georgia">Georgia</option>
                          <option value="Calibri">Calibri</option>
                          <option value="Verdana">Verdana</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Line Spacing
                        </label>
                        <input
                          type="number"
                          value={paperFormat.questionLineSpacing}
                          onChange={e => setPaperFormat({...paperFormat, questionLineSpacing: parseFloat(e.target.value) || 1.7})}
                          min="1"
                          max="3"
                          step="0.1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Answer Line Spacing (px)
                        </label>
                        <input
                          type="number"
                          value={paperFormat.answerLineSpacing}
                          onChange={e => setPaperFormat({...paperFormat, answerLineSpacing: parseInt(e.target.value) || 24})}
                          min="16"
                          max="50"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Margin Bottom (px)
                        </label>
                        <input
                          type="number"
                          value={paperFormat.questionMarginBottom}
                          onChange={e => setPaperFormat({...paperFormat, questionMarginBottom: parseInt(e.target.value) || 28})}
                          min="10"
                          max="60"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center">
                      <input
                        type="checkbox"
                        id="showCognitiveLevel"
                        checked={showCognitiveLevel}
                        onChange={(e) => setShowCognitiveLevel(e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="showCognitiveLevel" className="ml-2 text-sm font-medium text-gray-700 cursor-pointer">
                        Show Cognitive Level (Bloom Taxonomy) badges in exported papers
                      </label>
                    </div>
                    <div className="mt-3 text-xs text-gray-600">
                      <i className="ri-information-line mr-1"></i>
                      These settings will be applied to PDF and Word exports
                    </div>
                      </>
                    )}
                  </div>
                  
                  {/* Quiz Settings Section - Only for Online Quizzes */}
                  {quizFormat === 'Online' && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      <i className="ri-settings-3-line mr-2 text-blue-600"></i>
                      Quiz Settings
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Time Limit (minutes)
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="number"
                          value={timeLimit}
                          onChange={e => setTimeLimit(parseInt(e.target.value) || 1)}
                          min="1"
                          max={maxTimeLimit}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., 30"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Scheduled Start
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduledStart}
                          onChange={e => setScheduledStart(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Scheduled End <span className="text-gray-500 text-xs">(Optional)</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduledEnd}
                          onChange={e => setScheduledEnd(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Assign to Students Section - Only for Online Quizzes */}
                  {quizFormat === 'Online' && (
                  <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      <i className="ri-team-line mr-2 text-purple-600"></i>
                      Assign to Students (Optional)
                    </h4>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (assignedStudents.length === availableStudents.length) {
                              setAssignedStudents([]);
                            } else {
                              setAssignedStudents(availableStudents.map(s => s.id));
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-green-300 bg-green-50 text-green-700 rounded-lg text-sm hover:bg-green-100 transition font-medium"
                        >
                          {assignedStudents.length === availableStudents.length && availableStudents.length > 0
                            ? '✓ Assign to All'
                            : 'Assign to All'}
                        </button>
                        <button
                          onClick={() => setShowStudentSelection(!showStudentSelection)}
                          className="flex-1 px-3 py-2 border border-blue-300 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition font-medium"
                        >
                          {assignedStudents.length > 0 
                            ? `${assignedStudents.length}/${availableStudents.length} Selected` 
                            : 'Select Individually'}
                        </button>
                      </div>
                      {showStudentSelection && (
                        <div className="border rounded-lg p-3 bg-white max-h-64 overflow-y-auto">
                          {availableStudents.length === 0 ? (
                            <p className="text-sm text-gray-600">No students available in this class</p>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between pb-2 border-b mb-2">
                                <label className="text-xs font-semibold text-gray-700">Select Individual Students</label>
                                <button
                                  onClick={() => setAssignedStudents([])}
                                  className="text-xs text-red-600 hover:text-red-700"
                                >
                                  Clear All
                                </button>
                              </div>
                              {availableStudents.map(student => (
                                <label key={student.id} className="flex items-center cursor-pointer p-2 hover:bg-gray-50 rounded">
                                  <input
                                    type="checkbox"
                                    checked={assignedStudents.includes(student.id)}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setAssignedStudents([...assignedStudents, student.id]);
                                      } else {
                                        setAssignedStudents(assignedStudents.filter(id => id !== student.id));
                                      }
                                    }}
                                    className="mr-2 w-4 h-4"
                                  />
                                  <div>
                                    <div className="text-sm font-medium text-gray-700">{student.name}</div>
                                    <div className="text-xs text-gray-500">{student.email}</div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>


                  </div>
                  )}

                  {editedQuestions.map((q, index) => (
                    <div key={index} className="mb-4 p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <h5 className={`font-medium ${q.question.isRTL ? 'text-right font-noto-nastaliq' : ''}`}>
                            Question {index + 1} ({q.type})
                          </h5>
                          {q.cognitiveLevel && (q.cognitiveLevel.knowledge || q.cognitiveLevel.understanding || q.cognitiveLevel.application) && (
                            <div className="flex gap-1">
                              {q.cognitiveLevel.knowledge && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-300 rounded font-semibold">
                                  Knowledge
                                </span>
                              )}
                              {q.cognitiveLevel.understanding && (
                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 border border-green-300 rounded font-semibold">
                                  Understanding
                                </span>
                              )}
                              {q.cognitiveLevel.application && (
                                <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 border border-yellow-300 rounded font-semibold">
                                  Application
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openReplaceModal(index)}
                            className="px-3 py-1 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded disabled:bg-gray-400"
                            title="Replace this question with another of the same type"
                            disabled={replaceLoading[index]}
                          >
                            {replaceLoading[index] ? (
                              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <><i className="ri-refresh-line mr-1"></i>Replace</>
                            )}
                          </button>
                          {isMarked && (
                            <input
                              type="number"
                              value={q.marks}
                              onChange={e => handleEditQuestion(index, 'marks', parseFloat(e.target.value) || 1)}
                              min="0"
                              step="0.5"
                              className="w-20 px-2 py-1 border rounded"
                            />
                          )}
                        </div>
                      </div>
                      <MathJax dynamic>
                        {/* Text Formatting Toolbar */}
                        <div className="flex items-center gap-2 mt-2 mb-2 p-2 bg-gray-50 border border-gray-200 rounded">
                          <span className="text-xs text-gray-600 font-medium mr-2">Format:</span>
                          <button
                            type="button"
                            onClick={() => {
                              const textarea = document.querySelector(`textarea[data-question-index="${index}"]`) as HTMLTextAreaElement;
                              applyTextFormatting(index, 'bold', textarea);
                            }}
                            className="px-2 py-1 text-xs font-bold border border-gray-300 rounded hover:bg-white hover:border-gray-400 transition-colors"
                            title="Bold (select text first)"
                          >
                            <i className="ri-bold"></i> B
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const textarea = document.querySelector(`textarea[data-question-index="${index}"]`) as HTMLTextAreaElement;
                              applyTextFormatting(index, 'italic', textarea);
                            }}
                            className="px-2 py-1 text-xs italic border border-gray-300 rounded hover:bg-white hover:border-gray-400 transition-colors"
                            title="Italic (select text first)"
                          >
                            <i className="ri-italic"></i> I
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const textarea = document.querySelector(`textarea[data-question-index="${index}"]`) as HTMLTextAreaElement;
                              applyTextFormatting(index, 'highlight', textarea);
                            }}
                            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-white hover:border-yellow-400 transition-colors bg-yellow-100"
                            title="Highlight (select text first)"
                          >
                            <i className="ri-mark-pen-line"></i> H
                          </button>
                          <span className="text-xs text-gray-500 ml-2">Select text then click a format button</span>
                        </div>
                        <textarea
                          data-question-index={index}
                          value={convertFormulasToReadable(q.question.text)}
                          onChange={e => handleEditQuestion(index, 'question', { ...q.question, text: e.target.value })}
                          className={`w-full p-2 border rounded ${q.question.isRTL ? 'text-right font-noto-nastaliq' : ''}`}
                          dir={q.question.isRTL ? 'rtl' : 'ltr'}
                          rows={4}
                        />
                        {(q as any).imageUrl && (
                          <div className="mt-3 mb-3">
                            <img 
                              src={(q as any).imageUrl} 
                              alt="Question image" 
                              className="max-w-full h-auto rounded border"
                              style={{ maxHeight: '300px' }}
                            />
                          </div>
                        )}
                        {q.type === 'multiple' && q.options?.length > 0 ? (
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Options:</label>
                            {q.options.map((opt: any, i: number) => {
                              // Check if this option is marked as correct (handle both single and multiple correct answers)
                              const isCorrect = Array.isArray(q.answer.value) ? q.answer.value.includes(i) : q.answer.value === i;
                              return (
                                <div key={i} className="mb-3">
                                  <div className={`flex items-center space-x-2 mb-1 ${q.question.isRTL ? 'space-x-reverse' : ''}`}>
                                    <span className={`font-semibold ${q.question.isRTL ? 'font-noto-nastaliq' : ''} ${isCorrect ? 'text-green-600' : ''}`}>
                                      {q.question.isRTL ? optionLabels(true)[i] : String.fromCharCode(65 + i)}.
                                    </span>
                                    <input
                                      data-option-index={`${index}-${i}`}
                                      value={opt.text}
                                      onChange={e => {
                                        const newOptions = [...q.options];
                                        newOptions[i] = { ...newOptions[i], text: e.target.value };
                                        handleEditQuestion(index, 'options', newOptions);
                                      }}
                                      className={`flex-1 p-2 border rounded ${q.question.isRTL ? 'text-right font-noto-nastaliq' : ''} ${isCorrect ? 'bg-green-50 border-green-400' : ''}`}
                                      dir={q.question.isRTL ? 'rtl' : 'ltr'}
                                    />
                                    {isCorrect && (
                                      <span className="text-green-600 text-xs font-semibold whitespace-nowrap">✓ Correct</span>
                                    )}
                                  </div>
                                  {/* Formatting buttons for option */}
                                  <div className="flex items-center gap-1 ml-8 pl-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const input = document.querySelector(`input[data-option-index="${index}-${i}"]`) as HTMLInputElement;
                                        applyOptionFormatting(index, i, 'bold', input);
                                      }}
                                      className="px-1.5 py-0.5 text-xs font-bold border border-gray-300 rounded hover:bg-white hover:border-gray-400 transition-colors"
                                      title="Bold"
                                    >
                                      B
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const input = document.querySelector(`input[data-option-index="${index}-${i}"]`) as HTMLInputElement;
                                        applyOptionFormatting(index, i, 'italic', input);
                                      }}
                                      className="px-1.5 py-0.5 text-xs italic border border-gray-300 rounded hover:bg-white hover:border-gray-400 transition-colors"
                                      title="Italic"
                                    >
                                      I
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const input = document.querySelector(`input[data-option-index="${index}-${i}"]`) as HTMLInputElement;
                                        applyOptionFormatting(index, i, 'highlight', input);
                                      }}
                                      className="px-1.5 py-0.5 text-xs border border-gray-300 rounded hover:bg-white hover:border-yellow-400 transition-colors bg-yellow-100"
                                      title="Highlight"
                                    >
                                      H
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : q.type === 'truefalse' ? (
                          <div className={`mt-2 ${q.question.isRTL ? 'text-right font-noto-nastaliq' : ''}`}>
                            <div className="mb-2">
                              <span className={`inline-block px-3 py-1 rounded ${q.answer.value === true ? 'bg-green-100 text-green-800 font-semibold' : 'bg-gray-100 text-gray-600'}`}>
                                {q.question.isRTL ? 'صحیح' : 'True'}
                                {q.answer.value === true && ' ✓'}
                              </span>
                            </div>
                            <div>
                              <span className={`inline-block px-3 py-1 rounded ${q.answer.value === false ? 'bg-green-100 text-green-800 font-semibold' : 'bg-gray-100 text-gray-600'}`}>
                                {q.question.isRTL ? 'غلط' : 'False'}
                                {q.answer.value === false && ' ✓'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className={`mt-2 p-3 bg-blue-50 border border-blue-200 rounded ${q.question.isRTL ? 'text-right font-noto-nastaliq' : ''}`}>
                            <div className="text-xs font-medium text-blue-700 mb-2">
                              {q.type === 'short' ? 'Short Answer' : q.type === 'long' ? 'Long Answer' : 'Fill in the Blanks'} - Expected Answer:
                            </div>
                            <div className="text-sm text-blue-900 mb-3">
                              {q.type === 'fillblanks' 
                                ? (typeof q.answer.value === 'string' ? q.answer.value : Object.entries(q.answer.value || {}).map(([key, val]: [string, any]) => (
                                    <div key={key} className="py-1">
                                      <strong>{key}:</strong> {Array.isArray(val) ? val.join(q.question.isRTL ? ' یا ' : ' or ') : val}
                                    </div>
                                  )))
                                : q.answer.text}
                            </div>
                            {(q.type === 'short' || q.type === 'long') && (
                              <div className="flex items-center gap-2 pt-2 border-t border-blue-200">
                                <label className="text-xs font-medium text-blue-700">Answer Lines (for printable export):</label>
                                <input
                                  type="number"
                                  value={(answerLines as any)[`${index}-lines`] ?? defaultAnswerLines}
                                  onChange={e => setAnswerLines({ ...answerLines, [`${index}-lines`]: Math.max(1, parseInt(e.target.value) || 1) })}
                                  min="1"
                                  max="10"
                                  className="w-16 px-2 py-1 border border-blue-300 rounded text-center text-sm"
                                />
                              </div>
                            )}
                          </div>
                        )}
                        {q.explanation?.text && (
                          <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded">
                            <div className="text-xs font-medium text-gray-700 mb-1">Explanation:</div>
                            <div className="text-sm text-gray-600">{q.explanation.text}</div>
                          </div>
                        )}
                      </MathJax>
                    </div>
                  ))}
                  <div className="flex space-x-4">
                    <button
                      onClick={handleSaveChanges}
                      disabled={isSavingChanges}
                      className={`px-4 py-2 text-white rounded-lg font-medium transition-all ${
                        isSavingChanges 
                          ? 'bg-blue-400 cursor-not-allowed opacity-75' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isSavingChanges ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-block animate-spin">⟳</span>
                          Saving...
                        </span>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                    <button
                      onClick={downloadQuizPDF}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg"
                    >
                      Download PDF
                    </button>
                    <button
                      onClick={downloadAnswerKey}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg"
                    >
                      Download Answer Key
                    </button>
                    <button
                      onClick={downloadQuizWord}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg"
                    >
                      Download Word
                    </button>
                    <button
                      onClick={handleReshuffle}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg"
                    >
                      Reshuffle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Replace Question Modal - REMOVED */}
        </div>
      </div>
    </div>
    </MathJaxContext>
  );
};

export default QuizGeneration;