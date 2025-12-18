"use client";
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/firebase/firebase';
import { collection, getDocs, addDoc, serverTimestamp, Timestamp, query, where } from 'firebase/firestore';
import Sidebar from '@/components/Sidebar';
import { useUserProfile } from '@/hooks/useUserProfile';
import { v4 as uuidv4 } from 'uuid';
import { MathJax, MathJaxContext } from 'better-react-mathjax';

// Dynamic imports will be handled directly in the function

const shuffle = (array, seed) => {
  const seededRandom = seed 
    ? (index) => {
        const x = Math.sin(index + parseInt(seed.replace(/\D/g, ''))) * 10000;
        return x - Math.floor(x);
      }
    : Math.random;
  return [...array].sort(() => seededRandom(array.length) - 0.5);
};

const toUrduNumber = (num) => {
  const urduNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().split('').map(digit => urduNumerals[parseInt(digit)] || digit).join('');
};

const latexToReadable = (latex) => {
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
  readable = readable.replace(/\^\{([^{}]+)\}/g, (match, content) => {
    // Convert single digits to Unicode superscripts
    if (/^[0-9]$/.test(content)) {
      const superscripts = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
      return superscripts[content] || '^' + content;
    }
    return '^(' + content + ')';
  });
  
  // Handle bare superscripts
  readable = readable.replace(/\^([0-9])/g, (match, num) => {
    const superscripts = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    return superscripts[num] || '^' + num;
  });
  
  // Handle subscripts with braces _{...}
  readable = readable.replace(/_\{([^{}]+)\}/g, (match, content) => {
    // Convert single digits to Unicode subscripts
    if (/^[0-9]$/.test(content)) {
      const subscripts = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
      return subscripts[content] || '_' + content;
    }
    return '_(' + content + ')';
  });
  
  // Handle bare subscripts
  readable = readable.replace(/_([0-9a-zA-Z])/g, (match, char) => {
    if (/[0-9]/.test(char)) {
      const subscripts = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
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

const extractLatexFromFormulas = (text) => {
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

const convertFormulasToReadable = (text) => {
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
  result = result.replace(/\$\$([^$]+)\$\$/g, (match, latex) => {
    return latexToReadable(latex);
  });
  
  // Handle inline math $...$ format
  result = result.replace(/\$([^$]+)\$/g, (match, latex) => {
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
  const [selectedChapters, setSelectedChapters] = useState([]);
  const [selectedSLOs, setSelectedSLOs] = useState([]);
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
    { key: 'dragdrop', label: 'Drag & Drop', icon: 'ri-drag-move-line', isInteractive: true },
    { key: 'diagramlabeling', label: 'Diagram Labeling', icon: 'ri-image-edit-line', isInteractive: true },
    { key: 'matching', label: 'Textual Matching', icon: 'ri-links-line', isInteractive: true },
    { key: 'categorization', label: 'Column Sorting', icon: 'ri-layout-column-line', isInteractive: true },
    { key: 'ordering', label: 'Sequence Ordering', icon: 'ri-list-ordered', isInteractive: true }
  ];
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [timeLimit, setTimeLimit] = useState(30);
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizType, setQuizType] = useState('Weekly');
  const [isMarked, setIsMarked] = useState(true);
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editedQuestions, setEditedQuestions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [hasQuestionType, setHasQuestionType] = useState(false);
  const [randomSeed, setRandomSeed] = useState(uuidv4());
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableChapters, setAvailableChapters] = useState<string[]>([]);
  const [availableSLOs, setAvailableSLOs] = useState<string[]>([]);

  // Dynamic data from user profile
  const grades = user?.assignedGrades || [];
  const subjects = user?.subjects || [];
  const assignedBooks = user?.assignedBooks || [];
  
  // Extract unique subjects and grades directly from assignedBooks for accuracy
  let uniqueSubjects = [...new Set(assignedBooks.map(b => b.subject))];
  let uniqueGrades = [...new Set(assignedBooks.map(b => String(b.grade)))];
  
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
  
  // Build books object from assignedBooks and OUP questions
  const books: { [grade: string]: { [subject: string]: string[] } } = {};
  
  // Add school books
  uniqueGrades.forEach(grade => {
    books[String(grade)] = {};
    uniqueSubjects.forEach(subject => {
      books[String(grade)][subject] = assignedBooks
        .filter(book => String(book.grade) === String(grade) && book.subject === subject)
        .map(book => book.title);
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
  const optionLabels = (isRTL) => isRTL ? ['ا', 'ب', 'ج', 'د', 'ھ', 'و'] : ['A', 'B', 'C', 'D', 'E', 'F'];

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        if (!user?.schoolId) return;
        
        console.log(`🔄 Fetching questions for QB: ${selectedQB}`);
        let allQuestions = [];
        
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
        alert('Failed to fetch questions: ' + error.message);
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
  useEffect(() => {
    const fetchChaptersAndSLOs = () => {
      if (!selectedGrade || !selectedSubject || !selectedBook || questions.length === 0) {
        setAvailableChapters([]);
        setAvailableSLOs([]);
        return;
      }

      // Filter questions by grade, subject, and book to get unique chapters and SLOs
      const filtered = questions.filter(q => {
        const qGrade = (q.grade || q.class || '').toString().toLowerCase();
        const qSubject = (q.subject || '').toLowerCase();
        const qBook = (q.book || '').toLowerCase();
        
        return qGrade === selectedGrade.toLowerCase() &&
               qSubject === selectedSubject.toLowerCase() &&
               qBook === selectedBook.toLowerCase();
      });

      // Extract unique chapters and SLOs
      const chapters = [...new Set(filtered.map(q => q.chapter).filter(Boolean))] as string[];
      const slos = [...new Set(filtered.map(q => q.slo).filter(Boolean))] as string[];

      setAvailableChapters(chapters.sort());
      setAvailableSLOs(slos.sort());
      
      // Reset selected chapters and SLOs when filters change
      setSelectedChapters([]);
      setSelectedSLOs([]);
    };

    fetchChaptersAndSLOs();
  }, [selectedGrade, selectedSubject, selectedBook, questions]);

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
    
    // Filter questions by selected chapters to get SLOs
    const slos = new Set();
    questions.forEach(q => {
      const qGrade = (q.grade || q.class || '').toString().toLowerCase();
      const qSubject = (q.subject || '').toLowerCase();
      const qBook = (q.book || '').toLowerCase();
      const qChapter = q.chapter || '';
      const qSLO = q.slo || '';
      if (qGrade === selectedGrade.toLowerCase() && 
          qSubject === selectedSubject.toLowerCase() && 
          qBook === selectedBook.toLowerCase() && 
          selectedChapters.includes(qChapter) && 
          qSLO) {
        slos.add(qSLO);
      }
    });
    return Array.from(slos).sort();
  }, [questions, selectedGrade, selectedSubject, selectedBook, selectedChapters]);

  const getQuestionCountByType = useCallback((type) => {
    if (!selectedGrade || !selectedSubject || !selectedBook) return 0;
    const selectedDifficulties = questionConfig[type]?.difficulties || [];
    return questions.filter(q => {
      const qGrade = (q.grade || q.class || '').toString().toLowerCase();
      const qSubject = (q.subject || '').toLowerCase();
      const qBook = (q.book || '').toLowerCase();
      const qChapter = q.chapter || '';
      const qSLO = q.slo || '';
      const qType = (q.type || q.questionType || '').toLowerCase();
      const qDifficulty = q.difficulty || 'Medium';
      const normalizedType = qType === 'mcqs' ? 'multiple' : qType.replace('_', '');
      
      const basicMatch = qGrade === selectedGrade.toLowerCase() && 
                        qSubject === selectedSubject.toLowerCase() && 
                        qBook === selectedBook.toLowerCase() &&
                        normalizedType === type;
      
      if (!basicMatch) return false;
      if (selectedChapters.length > 0 && !selectedChapters.includes(qChapter)) return false;
      if (selectedSLOs.length > 0 && !selectedSLOs.includes(qSLO)) return false;
      if (selectedDifficulties.length > 0 && !selectedDifficulties.includes(qDifficulty)) return false;
      
      return true;
    }).length;
  }, [questions, selectedGrade, selectedSubject, selectedBook, selectedChapters, selectedSLOs, questionConfig]);

  const getTotalConfiguredQuestions = useCallback(() => {
    return Object.values(questionConfig).reduce((sum, config) => sum + config.count, 0);
  }, [questionConfig]);

  const generateQuestions = useCallback((overrideSeed = null) => {
    const seedToUse = overrideSeed || randomSeed;
    
    // Build questions based on questionConfig
    let allQuestions = [];
    let questionCounter = 1;

    Object.entries(questionConfig).forEach(([type, config]) => {
      if (config.count === 0) return;

      // Filter questions for this type with selected difficulties
      const typeQuestions = questions.filter(q => {
        const qGrade = (q.grade || q.class || '').toString().toLowerCase();
        const qSubject = (q.subject || '').toLowerCase();
        const qBook = (q.book || '').toLowerCase();
        const qChapter = q.chapter || '';
        const qSLO = q.slo || '';
        const qType = (q.type || q.questionType || '').toLowerCase();
        const qDifficulty = q.difficulty || 'Medium';
        const normalizedType = qType === 'mcqs' ? 'multiple' : qType.replace('_', '');

        return qGrade === selectedGrade.toLowerCase() &&
               qSubject === selectedSubject.toLowerCase() &&
               qBook === selectedBook.toLowerCase() &&
               (selectedChapters.length === 0 || selectedChapters.includes(qChapter)) &&
               (selectedSLOs.length === 0 || selectedSLOs.includes(qSLO)) &&
               normalizedType === type &&
               (config.difficulties.length === 0 || config.difficulties.includes(qDifficulty));
      });

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
          options = shuffle(q.options.map((opt, idx) => ({
            text: opt || `Option ${idx + 1}`,
            format: q.subject === 'Math' ? 'math' : 'text',
          })), seedToUse);
          answer = { value: options.findIndex(opt => opt.text === q.correctAnswer), text: q.correctAnswer };
          if (answer.value === -1 || !q.correctAnswer) return;
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
            answer = { value: Object.fromEntries(Object.entries(q.blanks || {}).map(([k, v]) => [k, v || []])), text: q.correctAnswer || '' };
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
          marks: isMarked ? config.marks : 0,
          question: { text: questionText, format: q.subject === 'Math' ? 'math' : 'text', isRTL: q.subject === 'Urdu' },
          options,
          answer,
          explanation: { text: q.explanation || '', format: 'text', isRTL: false },
          isInteractive: isInteractiveType && q.isInteractive,
          interactiveData: interactiveData,
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

    const sanitizeObject = (obj) => {
      const sanitized = {};
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
      })),
      totalMarks: isMarked ? questions.reduce((sum, q) => sum + q.marks, 0) : null,
      randomization: { seed: newSeed, shuffledOrder: true, shuffleOptions: questions.some(q => q.type === 'multiple') },
      rendering: { respectRTL: selectedSubject === 'Urdu', renderMath: selectedSubject === 'Math' },
      status: 'draft',
      createdBy: 'current_user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: 1,
      notes: null,
    });

      await addDoc(collection(db, 'quizzes'), quiz);
      setGeneratedQuiz(quiz);
      setEditedQuestions(questions);
      setShowEditor(true);
      setShowConfirmModal(false);
      alert(`Quiz '${quizTitle}' created with ${questions.length} questions.`);
    } catch (error) {
      console.error('Error saving quiz:', error);
      alert('Error saving quiz: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditQuestion = (index, field, value) => setEditedQuestions(prev => {
    const newQuestions = [...prev];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    return newQuestions;
  });

  const handleSaveChanges = async () => {
    if (!generatedQuiz) return;
    
    // Validate quiz settings
    const errors = [];
    if (timeLimit < 1 || timeLimit > maxTimeLimit) {
      errors.push(`Time limit must be between 1 and ${maxTimeLimit} minutes`);
    }
    if (!scheduledStart || new Date(scheduledStart) < new Date()) {
      errors.push('Scheduled start must be in the future');
    }
    if (scheduledEnd && new Date(scheduledEnd) <= new Date(scheduledStart)) {
      errors.push('Scheduled end must be after scheduled start');
    }
    
    if (errors.length > 0) {
      alert('Please fix the following errors:\n\n' + errors.join('\n'));
      return;
    }
    
    try {
      const sanitizedQuiz = {
        ...generatedQuiz,
        items: editedQuestions,
        totalMarks: isMarked ? editedQuestions.reduce((sum, q) => sum + q.marks, 0) : null,
        timeLimitMinutes: timeLimit,
        schedule: { 
          startAt: Timestamp.fromDate(new Date(scheduledStart)), 
          endAt: scheduledEnd ? Timestamp.fromDate(new Date(scheduledEnd)) : null 
        },
        updatedAt: serverTimestamp(),
      };
      setGeneratedQuiz(sanitizedQuiz);
      alert('Quiz updated successfully!');
    } catch (error) {
      alert('Error saving changes: ' + error.message);
    }
  };

  const handleReshuffle = () => {
    if (confirm('Reshuffling will change question selection, order, and MCQ option order. Continue?')) {
      const newSeed = uuidv4();
      setRandomSeed(newSeed);
      const newQuestions = generateQuestions(newSeed);
      setEditedQuestions(newQuestions);
    }
  };

  const downloadQuizPDF = () => {
    if (!generatedQuiz) return;
    
    // Helper function to replace {blank#} placeholders with underscores
    const replaceBlanks = (text) => {
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
      options: q.options?.map(opt => ({
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
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; direction: ltr; }
          .header { border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 28px; font-weight: bold; color: #1f2937; text-align: center; margin-bottom: 15px; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 2px solid #000; }
          .header-table td { padding: 8px 12px; font-size: 14px; color: #000; vertical-align: middle; border: 1px solid #000; }
          .header-table .label { font-weight: bold; width: 25%; background-color: #f8f9fa; }
          .header-table .value { width: 25%; }
          .name-field { min-height: 20px; }
          .question { margin-bottom: 25px; page-break-inside: avoid; }
          .question-number { margin-bottom: 8px; overflow: hidden; display: flex; justify-content: space-between; align-items: center; }
          .question-number-urdu { font-family: 'Noto Nastaliq Urdu', sans-serif; direction: rtl; text-align: right; font-weight: bold; font-size: 18px; }
          .question-number-marks { font-family: Arial, sans-serif; direction: ltr; text-align: right; font-weight: bold; }
          .question-number-marks-urdu { font-family: Arial, sans-serif; direction: ltr; text-align: left; font-weight: bold; }
          .question-number-english { font-family: Arial, sans-serif; direction: ltr; text-align: left; font-weight: bold; font-size: 18px; }
          .question-text { font-size: 16px; margin-bottom: 12px; font-weight: 500; }
          .options { margin-bottom: 10px; }
          .option { margin-bottom: 5px; font-size: 14px; }
          .urdu { font-family: 'Noto Nastaliq Urdu', sans-serif; direction: rtl; text-align: right; margin-right: 20px; }
          .page-break { page-break-before: always; }
          @media print { body { margin: 20px; } .page-break { page-break-before: always; } }
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
                <div class="question-text ${q.question.isRTL ? 'urdu' : ''}">${extractLatexFromFormulas(q.question.text)}</div>
                ${
                  q.type === 'multiple' && q.options?.length
                    ? `<div class="options ${q.question.isRTL ? 'urdu' : ''}">${q.options
                        .map(
                          (opt, j) =>
                            `<div class="option">${q.question.isRTL ? optionLabels(true)[j] : String.fromCharCode(65 + j)}. ${opt.format === 'math' ? '\\(' + opt.text + '\\)' : opt.text}</div>`
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
        if (newWindow.MathJax && newWindow.MathJax.typesetPromise) {
          clearInterval(checkMathJax);
          newWindow.MathJax.typesetPromise().then(() => {
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
    const replaceBlanks = (text) => {
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
      options: q.options?.map(opt => ({
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
                <div class="answer-text ${q.question.isRTL ? 'urdu' : ''}">${extractLatexFromFormulas(q.question.text)}</div>
                <div class="answer-text"><strong>Answer:</strong> ${
                  q.type === 'multiple' && q.options?.length
                    ? `${q.question.isRTL ? optionLabels(true)[q.answer.value] : String.fromCharCode(65 + q.answer.value)}. ${q.options[q.answer.value]?.text || q.answer.text}`
                    : q.type === 'truefalse'
                    ? q.question.isRTL
                      ? q.answer.value
                        ? 'صحیح'
                        : 'غلط'
                      : q.answer.value
                      ? 'True'
                      : 'False'
                    : q.type === 'fillblanks'
                    ? Object.entries(q.answer.value)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(q.question.isRTL ? ' یا ' : ' or ') : v}`)
                        .join(', ')
                    : q.answer.text || q.answer.value
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
        if (newWindow.MathJax && newWindow.MathJax.typesetPromise) {
          clearInterval(checkMathJax);
          newWindow.MathJax.typesetPromise().then(() => {
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
      const { Document, Packer, Paragraph, TextRun, Header, Footer, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = docxModule;
      
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
                  children: [new TextRun({ text: generatedQuiz.title, size: 32, font: 'Arial', bold: true })],
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
                  children: [new TextRun({ text: `Generated: ${new Date().toLocaleString()}`, size: 20, font: 'Arial' })],
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
                      children: [new Paragraph({ children: [new TextRun({ text: 'Student Name:', bold: true, size: 20 })] })],
                      width: { size: 25, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '____________________', size: 20 })] })],
                      width: { size: 25, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Student ID:', bold: true, size: 20 })] })],
                      width: { size: 25, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '____________________', size: 20 })] })],
                      width: { size: 25, type: WidthType.PERCENTAGE },
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Class:', bold: true, size: 20 })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: generatedQuiz.class, size: 20 })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Subject:', bold: true, size: 20 })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: generatedQuiz.subject, size: 20 })] })],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Series:', bold: true, size: 20 })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '____________________', size: 20 })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Test Type:', bold: true, size: 20 })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: generatedQuiz.quizType || 'Quiz', size: 20 })] })],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Total Marks:', bold: true, size: 20 })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: isMarked ? generatedQuiz.totalMarks.toString() : 'N/A', size: 20 })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Total Time:', bold: true, size: 20 })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: `${generatedQuiz.timeLimitMinutes} minutes`, size: 20 })] })],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Obtained Marks:', bold: true, size: 20 })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: '____________________', size: 20 })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: 'Date:', bold: true, size: 20 })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: new Date().toLocaleDateString(), size: 20 })] })],
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
                                  size: 24, 
                                  font: 'Arial',
                                  bold: true 
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
                                  font: 'Arial',
                                  bold: true 
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
                      size: 24, 
                      font: q.question.isRTL ? 'Noto Nastaliq Urdu' : 'Arial',
                      bold: true 
                    })
                  ],
                  heading: 'Heading2',
                  alignment: q.question.isRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
                  spacing: { before: 200, after: 100 },
                }),
              ]),
              new Paragraph({
                children: [new TextRun({ 
                  text: q.type === 'fillblanks' 
                    ? convertFormulasToReadable(q.question.text.replace(/\{blank\d+\}/g, '________'))
                    : convertFormulasToReadable(q.question.text), 
                  size: 24, 
                  font: q.question.isRTL ? 'Noto Nastaliq Urdu' : 'Arial' 
                })],
                alignment: q.question.isRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
                spacing: { after: 100 },
              }),
              ...(q.type === 'multiple' && q.options?.length
                ? q.options.map((opt, j) => 
                      new Paragraph({
                        children: [new TextRun({ 
                          text: `${q.question.isRTL ? optionLabels(true)[j] : String.fromCharCode(65 + j)}. ${convertFormulasToReadable(opt.text)}`, 
                          size: 24, 
                          font: q.question.isRTL ? 'Noto Nastaliq Urdu' : 'Arial' 
                        })],
                        alignment: q.question.isRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
                        spacing: { after: 50 },
                      })
                  )
                : q.type === 'truefalse' && q.options?.length
                ? q.options.map((opt, j) => 
                      new Paragraph({
                        children: [new TextRun({ 
                          text: `${q.question.isRTL ? optionLabels(true)[j] : String.fromCharCode(65 + j)}. ${q.question.isRTL ? (opt.text === 'True' ? 'صحیح' : 'غلط') : opt.text}`, 
                          size: 24, 
                          font: q.question.isRTL ? 'Noto Nastaliq Urdu' : 'Arial' 
                        })],
                        alignment: q.question.isRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
                        spacing: { after: 50 },
                      })
                  )
                : q.type === 'fillblanks'
                ? []
                : [
                    new Paragraph({
                      children: [new TextRun({ 
                        text: q.question.isRTL ? 'نیچے اپنا جواب لکھیں۔' : 'Write your answer below.', 
                        size: 24, 
                        font: q.question.isRTL ? 'Noto Nastaliq Urdu' : 'Arial' 
                      })],
                      alignment: q.question.isRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
                      spacing: { after: 50 },
                    }),
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
      alert('Error generating Word document: ' + error.message);
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
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
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
                        {assignedBooks
                          .filter(b => String(b.grade) === String(selectedGrade))
                          .map(b => b.subject)
                          .filter((v, i, a) => a.indexOf(v) === i)
                          .map(subject => (
                            <option key={subject} value={subject}>{subject}</option>
                          ))}
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
                          const filteredBooks = assignedBooks.filter(b => String(b.grade) === String(selectedGrade) && b.subject === selectedSubject);
                          console.log('📖 Book Selection Debug:', {
                            selectedGrade,
                            selectedSubject,
                            assignedBooksLength: assignedBooks.length,
                            filteredBooksLength: filteredBooks.length,
                            filteredBooks
                          });
                          return filteredBooks.map(book => (
                            <option key={book.id} value={book.title}>{book.title}</option>
                          ));
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
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm mr-2">2</span>
                      Select Chapters
                    </h3>
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
                  ) : (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">No chapters found for this book</p>
                      <p className="text-xs text-gray-500 mt-1">Please add questions with chapters for &quot;{selectedBook}&quot; first</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: SLO Selection */}
              {quizFormat && selectedChapters.length > 0 && getAvailableSLOs().length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm mr-2">3</span>
                      Select Learning Outcomes (SLOs)
                    </h3>
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
                  <div className="space-y-4">
                    {/* Filter question types based on format: Offline = basic only, Online = all types */}
                    {questionTypes
                      .filter(qt => quizFormat === 'Online' || !qt.isInteractive)
                      .map(({ key, label, icon, isInteractive }) => {
                      const available = getQuestionCountByType(key);
                      return (
                        <div key={key} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <i className={`${icon} ${isInteractive ? 'text-purple-600' : 'text-blue-600'}`}></i>
                              <span className="font-medium text-gray-900">{label}</span>
                              {isInteractive && (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Interactive</span>
                              )}
                              <span className="text-xs text-gray-500">({available} available)</span>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                                <input
                                  type="number"
                                  min="0"
                                  max={available}
                                  value={questionConfig[key].count}
                                  onChange={e => setQuestionConfig(prev => ({
                                    ...prev,
                                    [key]: { ...prev[key], count: Math.min(parseInt(e.target.value) || 0, available) }
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
                                  value={questionConfig[key].marks}
                                  onChange={e => setQuestionConfig(prev => ({
                                    ...prev,
                                    [key]: { ...prev[key], marks: parseFloat(e.target.value) || 0 }
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
                                      checked={questionConfig[key].difficulties.includes(difficulty)}
                                      onChange={e => {
                                        // Prevent deselecting all difficulties
                                        if (!e.target.checked && questionConfig[key].difficulties.length === 1) {
                                          alert('Please select at least one difficulty level');
                                          return;
                                        }
                                        
                                        const newDifficulties = e.target.checked
                                          ? [...questionConfig[key].difficulties, difficulty]
                                          : questionConfig[key].difficulties.filter(d => d !== difficulty);
                                        
                                        setQuestionConfig(prev => ({
                                          ...prev,
                                          [key]: {
                                            ...prev[key],
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
                        </div>
                      );
                    })}
                  </div>
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
              )}
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
                  
                  {/* Quiz Settings Section */}
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

                  {editedQuestions.map((q, index) => (
                    <div key={index} className="mb-4 p-4 border rounded-lg">
                      <div className="flex justify-between">
                        <h5 className={`font-medium ${q.question.isRTL ? 'text-right font-noto-nastaliq' : ''}`}>
                          Question {index + 1} ({q.type})
                        </h5>
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
                      <MathJax dynamic>
                        <textarea
                          value={convertFormulasToReadable(q.question.text)}
                          onChange={e => handleEditQuestion(index, 'question', { ...q.question, text: e.target.value })}
                          className={`w-full p-2 border rounded mt-2 ${q.question.isRTL ? 'text-right font-noto-nastaliq' : ''}`}
                          dir={q.question.isRTL ? 'rtl' : 'ltr'}
                        />
                        {q.type === 'multiple' && q.options?.length > 0 ? (
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Options:</label>
                            {q.options.map((opt, i) => (
                              <div key={i} className={`flex items-center space-x-2 mb-2 ${q.question.isRTL ? 'space-x-reverse' : ''}`}>
                                <span className={`font-semibold ${q.question.isRTL ? 'font-noto-nastaliq' : ''} ${q.answer.value === i ? 'text-green-600' : ''}`}>
                                  {q.question.isRTL ? optionLabels(true)[i] : String.fromCharCode(65 + i)}.
                                </span>
                                <input
                                  value={opt.text}
                                  onChange={e => {
                                    const newOptions = [...q.options];
                                    newOptions[i] = { ...newOptions[i], text: e.target.value };
                                    handleEditQuestion(index, 'options', newOptions);
                                  }}
                                  className={`flex-1 p-2 border rounded ${q.question.isRTL ? 'text-right font-noto-nastaliq' : ''} ${q.answer.value === i ? 'bg-green-50 border-green-400' : ''}`}
                                  dir={q.question.isRTL ? 'rtl' : 'ltr'}
                                />
                                {q.answer.value === i && (
                                  <span className="text-green-600 text-xs font-semibold whitespace-nowrap">✓ Correct</span>
                                )}
                              </div>
                            ))}
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
                            <div className="text-xs font-medium text-blue-700 mb-1">
                              {q.type === 'short' ? 'Short Answer' : q.type === 'long' ? 'Long Answer' : 'Fill in the Blanks'} - Expected Answer:
                            </div>
                            <div className="text-sm text-blue-900">
                              {q.type === 'fillblanks' ? JSON.stringify(q.answer.value, null, 2) : q.answer.text}
                            </div>
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
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                    >
                      Save Changes
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
        </div>
      </div>
    </div>
    </MathJaxContext>
  );
};

export default QuizGeneration;