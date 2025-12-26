'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import { useUserProfile } from '@/hooks/useUserProfile';
import * as XLSX from 'xlsx';
import Sidebar from '@/components/Sidebar';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import dynamic from 'next/dynamic';
import 'react-simple-keyboard/build/css/index.css';

const Keyboard = dynamic(() => import('react-simple-keyboard'), { ssr: false });

const QuestionCreator = () => {
  const { user } = useUserProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mode, setMode] = useState('individual');
  const [formData, setFormData] = useState({
    type: '',
    grade: '',
    subject: '',
    book: '',
    chapter: '',
    topic: '',
    difficulty: 'Easy',
    slo: '',
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: '',
    blanks: {},
  });
  const [showMathKeyboard, setShowMathKeyboard] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [currentFormula, setCurrentFormula] = useState('');
  const [showUrduKeyboard, setShowUrduKeyboard] = useState(false);
  const [urduKeyboardField, setUrduKeyboardField] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mathFieldRef = useRef<HTMLDivElement>(null);
  const keyboardRef = useRef<any>(null);
  
  // Math symbols for easy insertion
  const mathSymbols = [
    { symbol: '\\frac{a}{b}', label: 'Fraction', desc: 'Fraction' },
    { symbol: 'x^{2}', label: 'x²', desc: 'Power' },
    { symbol: '\\sqrt{x}', label: '√', desc: 'Square root' },
    { symbol: '\\sqrt[n]{x}', label: 'ⁿ√', desc: 'Nth root' },
    { symbol: '\\int', label: '∫', desc: 'Integral' },
    { symbol: '\\sum', label: 'Σ', desc: 'Sum' },
    { symbol: '\\alpha', label: 'α', desc: 'Alpha' },
    { symbol: '\\beta', label: 'β', desc: 'Beta' },
    { symbol: '\\pi', label: 'π', desc: 'Pi' },
    { symbol: '\\theta', label: 'θ', desc: 'Theta' },
    { symbol: '\\infty', label: '∞', desc: 'Infinity' },
    { symbol: '\\leq', label: '≤', desc: 'Less than or equal' },
    { symbol: '\\geq', label: '≥', desc: 'Greater than or equal' },
    { symbol: '\\neq', label: '≠', desc: 'Not equal' },
    { symbol: '\\pm', label: '±', desc: 'Plus minus' },
    { symbol: '\\times', label: '×', desc: 'Times' },
    { symbol: '\\div', label: '÷', desc: 'Division' },
    { symbol: '\\cdot', label: '·', desc: 'Dot product' },
  ];
  
  const insertMathSymbol = (symbol: string) => {
    setFormData(prev => ({ 
      ...prev, 
      questionText: prev.questionText + symbol 
    }));
  };
  
  const openFormulaBuilder = () => {
    setCurrentFormula('');
    setShowFormulaModal(true);
  };
  
  const latexToReadable = (latex: string) => {
    let readable = latex;
    
    // Convert common LaTeX to Unicode/readable symbols
    readable = readable.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');  // fractions
    readable = readable.replace(/\^2/g, '²');  // squared
    readable = readable.replace(/\^3/g, '³');  // cubed
    readable = readable.replace(/\^([0-9])/g, (match: string, num: string) => {
      const superscripts = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
      return superscripts[num as keyof typeof superscripts] || '^' + num;
    });
    readable = readable.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');  // square root
    readable = readable.replace(/\\pi/g, 'π');
    readable = readable.replace(/\\alpha/g, 'α');
    readable = readable.replace(/\\beta/g, 'β');
    readable = readable.replace(/\\theta/g, 'θ');
    readable = readable.replace(/\\sum/g, 'Σ');
    readable = readable.replace(/\\int/g, '∫');
    readable = readable.replace(/\\infty/g, '∞');
    readable = readable.replace(/\\leq/g, '≤');
    readable = readable.replace(/\\geq/g, '≥');
    readable = readable.replace(/\\neq/g, '≠');
    readable = readable.replace(/\\pm/g, '±');
    readable = readable.replace(/\\times/g, '×');
    readable = readable.replace(/\\div/g, '÷');
    readable = readable.replace(/\\cdot/g, '·');
    
    return readable;
  };
  
  const insertFormula = () => {
    if (!currentFormula.trim()) return;
    
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.questionText;
      const before = text.substring(0, start);
      const after = text.substring(end);
      
      // Wrap LaTeX in delimiters for MathJax rendering (inline math)
      const wrappedFormula = '$' + currentFormula.trim() + '$';
      const newText = before + wrappedFormula + after;
      
      setFormData(prev => ({ ...prev, questionText: newText }));
      setShowFormulaModal(false);
      setCurrentFormula('');
      
      // Set cursor position after inserted formula
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + wrappedFormula.length;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  // Urdu keyboard layout
  const urduLayout = {
    default: [
      'ط ص ث ق ف غ ع ہ خ ح ج چ',
      'ش س ی ب ل ا ت ن م ک گ',
      'ظ ض ذ ڈ ز ر و ۃ ے د پ',
      '{space}'
    ]
  };

  // Handle Urdu keyboard input
  const onUrduKeyPress = (button) => {
    if (button === '{space}') {
      handleUrduInput(' ');
    } else {
      handleUrduInput(button);
    }
  };

  const handleUrduInput = (input) => {
    if (urduKeyboardField.startsWith('option-')) {
      const optionIndex = parseInt(urduKeyboardField.split('-')[1]);
      const newOptions = [...formData.options];
      newOptions[optionIndex] += input;
      setFormData(prev => ({ ...prev, options: newOptions }));
    } else if (urduKeyboardField === 'questionText') {
      setFormData(prev => ({ ...prev, questionText: prev.questionText + input }));
    } else if (urduKeyboardField === 'explanation') {
      setFormData(prev => ({ ...prev, explanation: prev.explanation + input }));
    } else if (urduKeyboardField === 'slo') {
      setFormData(prev => ({ ...prev, slo: prev.slo + input }));
    } else if (urduKeyboardField === 'correctAnswer') {
      setFormData(prev => ({ ...prev, correctAnswer: prev.correctAnswer + input }));
    }
  };

  const toggleUrduKeyboard = (field) => {
    if (showUrduKeyboard && urduKeyboardField === field) {
      setShowUrduKeyboard(false);
      setUrduKeyboardField('');
    } else {
      setShowUrduKeyboard(true);
      setUrduKeyboardField(field);
    }
  };
  const [csvData, setCsvData] = useState([]);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (toast && toast.type === 'success') {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Dynamic helper functions to get grades, subjects, and books from user's assigned books
  const getAvailableGrades = () => {
    const gradesSet = new Set(user?.assignedBooks?.map(b => b.grade) || []);
    return Array.from(gradesSet).sort((a, b) => {
      const numA = parseInt(a.replace('Grade ', ''));
      const numB = parseInt(b.replace('Grade ', ''));
      return numA - numB;
    });
  };

  const getAvailableSubjects = () => {
    if (!formData.grade) return [];
    const subjectsSet = new Set(
      user?.assignedBooks
        ?.filter(b => {
          const normalizedBookGrade = String(b.grade).replace('Grade ', '').trim();
          return normalizedBookGrade === String(formData.grade);
        })
        .map(b => b.subject) || []
    );
    return Array.from(subjectsSet).sort();
  };

  const getAvailableBooks = () => {
    if (!formData.grade || !formData.subject) return [];
    const booksArray = user?.assignedBooks
      ?.filter(b => {
        const normalizedBookGrade = String(b.grade).replace('Grade ', '').trim();
        return normalizedBookGrade === String(formData.grade) && b.subject === formData.subject;
      })
      .map(b => b.title) || [];
    return booksArray.sort();
  };

  const getAvailableChapters = () => {
    if (!formData.book) return [];
    const book = user?.assignedBooks?.find(b => b.title === formData.book);
    // chapters is stored as a number, not an array
    const chapterCount = book?.chapters || 0;
    if (chapterCount > 0) {
      return Array.from({ length: chapterCount }, (_, i) => `Chapter ${i + 1}`);
    }
    return [];
  };

  const topicsByChapter = {
    'Chapter 1: Basics': ['Topic 1: Introduction', 'Topic 2: Fundamentals'],
    'Chapter 2: Grammar': ['Topic 1: Nouns', 'Topic 2: Verbs'],
    'Chapter 3: Literature': ['Topic 1: Poetry', 'Topic 2: Prose'],
    'Chapter 1: Reading': ['Topic 1: Comprehension', 'Topic 2: Vocabulary'],
    'Chapter 2: Writing': ['Topic 1: Essays', 'Topic 2: Letters'],
    'Chapter 1: Numbers': ['Topic 1: Addition', 'Topic 2: Subtraction'],
    'Chapter 2: Algebra': ['Topic 1: Equations', 'Topic 2: Inequalities'],
    'Chapter 3: Geometry': ['Topic 1: Shapes', 'Topic 2: Angles'],
    'Chapter 1: Arithmetic': ['Topic 1: Multiplication', 'Topic 2: Division'],
    'Chapter 2: Equations': ['Topic 1: Linear Equations', 'Topic 2: Quadratic Equations'],
    'Chapter 1: Poetry': ['Topic 1: Nazm', 'Topic 2: Ghazal'],
    'Chapter 2: Prose': ['Topic 1: Stories', 'Topic 2: Essays'],
    'Chapter 1: Grammar': ['Topic 1: Syntax', 'Topic 2: Morphology'],
    'Chapter 2: Composition': ['Topic 1: Writing Skills', 'Topic 2: Creative Writing'],
    'Chapter 1: Physics': ['Topic 1: Motion', 'Topic 2: Forces'],
    'Chapter 2: Chemistry': ['Topic 1: Elements', 'Topic 2: Reactions'],
    'Chapter 1: Biology': ['Topic 1: Cells', 'Topic 2: Organisms'],
    'Chapter 2: Earth Science': ['Topic 1: Rocks', 'Topic 2: Weather'],
    'Chapter 1: Basics': ['Topic 1: Computer Parts', 'Topic 2: Operating Systems'],
    'Chapter 2: Programming': ['Topic 1: Python', 'Topic 2: JavaScript'],
    'Chapter 1: Hardware': ['Topic 1: CPU', 'Topic 2: Memory'],
    'Chapter 2: Software': ['Topic 1: Applications', 'Topic 2: Systems'],
  };

  useEffect(() => {
    localStorage.setItem('questionDraft', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    const draft = localStorage.getItem('questionDraft');
    if (draft) {
      setFormData(JSON.parse(draft));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value };
      if (name === 'grade') {
        return { ...newFormData, subject: '', book: '', chapter: '', topic: '', type: '', slo: '', questionText: '', options: ['', '', '', ''], correctAnswer: '', explanation: '', blanks: {} };
      }
      if (name === 'subject') {
        return { ...newFormData, book: '', chapter: '', topic: '', type: '', slo: '', questionText: '', options: ['', '', '', ''], correctAnswer: '', explanation: '', blanks: {} };
      }
      if (name === 'book') {
        return { ...newFormData, chapter: '', topic: '', type: '', slo: '', questionText: '', options: ['', '', '', ''], correctAnswer: '', explanation: '', blanks: {} };
      }
      if (name === 'chapter') {
        return { ...newFormData, topic: '', type: '', slo: '', questionText: '', options: ['', '', '', ''], correctAnswer: '', explanation: '', blanks: {} };
      }
      if (name === 'topic') {
        return { ...newFormData, type: '', slo: '', questionText: '', options: ['', '', '', ''], correctAnswer: '', explanation: '', blanks: {} };
      }
      if (name === 'type') {
        return { ...newFormData, questionText: '', options: ['', '', '', ''], correctAnswer: '', explanation: '', blanks: {} };
      }
      return newFormData;
    });
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData((prev) => ({ ...prev, options: newOptions }));
    setErrors((prev) => ({ ...prev, [`option${index}`]: '' }));
  };

  const addOption = () => {
    if (formData.options.length < 6) {
      setFormData((prev) => ({ ...prev, options: [...prev.options, ''] }));
    }
  };

  const removeOption = (index) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData((prev) => ({
        ...prev,
        options: newOptions,
        correctAnswer: newOptions.includes(prev.correctAnswer) ? prev.correctAnswer : '',
      }));
    }
  };

  const handleBlankChange = (blankId, value) => {
    setFormData((prev) => ({
      ...prev,
      blanks: { ...prev.blanks, [blankId]: value.split('|').filter(Boolean) },
    }));
    setErrors((prev) => ({ ...prev, [blankId]: '' }));
  };

  const addBlank = () => {
    const newBlankId = `blank${Object.keys(formData.blanks).length + 1}`;
    setFormData((prev) => ({
      ...prev,
      blanks: { ...prev.blanks, [newBlankId]: [] },
    }));
  };

  const removeBlank = (blankId) => {
    const newBlanks = { ...formData.blanks };
    delete newBlanks[blankId];
    setFormData((prev) => ({ ...prev, blanks: newBlanks }));
  };


  const validateForm = () => {
    const newErrors = {};
    if (!formData.grade) newErrors.grade = 'Class is required';
    if (!formData.subject) newErrors.subject = 'Subject is required';
    if (!formData.book) newErrors.book = 'Book is required';
    if (!formData.chapter) newErrors.chapter = 'Chapter is required';
    if (!formData.topic) newErrors.topic = 'Topic is required';
    if (!formData.type) newErrors.type = 'Question type is required';
    if (!formData.difficulty) newErrors.difficulty = 'Difficulty is required';
    if (!formData.slo) newErrors.slo = 'SLO is required';
    if (!formData.questionText) newErrors.questionText = 'Question text is required';
    if (formData.type === 'multiple') {
      if (formData.options.filter((opt) => opt.trim()).length < 2) {
        newErrors.options = 'At least 2 non-empty options required';
      }
      if (!formData.correctAnswer || !formData.options.includes(formData.correctAnswer)) {
        newErrors.correctAnswer = 'Valid correct answer required';
      }
    }
    if (formData.type === 'truefalse' && !['true', 'false'].includes(formData.correctAnswer)) {
      newErrors.correctAnswer = 'True or False required';
    }
    if (['short', 'long'].includes(formData.type) && !formData.correctAnswer) {
      newErrors.correctAnswer = 'Correct answer required';
    }
    if (formData.type === 'fillblanks') {
      const blanksCount = (formData.questionText.match(/{blank\d+}|___/g) || []).length;
      if (Object.keys(formData.blanks).length !== blanksCount) {
        newErrors.blanks = 'Number of answers must match blanks in question';
      }
      Object.keys(formData.blanks).forEach((blankId) => {
        if (!formData.blanks[blankId].length) {
          newErrors[blankId] = `Answers for ${blankId} required`;
        }
      });
    }
    if (formData.questionText.length > 2000) {
      newErrors.questionText = 'Question text must be ≤ 2000 characters';
    }
    if (formData.explanation.length > 4000) {
      newErrors.explanation = 'Explanation must be ≤ 4000 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setToast({ type: 'error', message: 'Please fix form errors' });
      return;
    }
    setToast({ type: 'info', message: 'Submitting question...' });
    try {
      const questionsRef = collection(db, 'questions');
      const question = {
        ...formData,
        language: formData.subject === 'Urdu' ? 'ur' : 'en',
        createdBy: 'current_user_id',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await addDoc(questionsRef, question);
      setToast({ type: 'success', message: 'Question submitted successfully!' });
      handleReset();
    } catch (error) {
      setToast({ type: 'error', message: `Failed to submit question: ${error.message}` });
    }
  };

  const handleReset = () => {
    setFormData({
      type: '',
      grade: '',
      subject: '',
      book: '',
      chapter: '',
      topic: '',
      difficulty: 'Easy',
      slo: '',
      questionText: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
      blanks: {},
    });
    setErrors({});
    setCsvData([]);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setToast({ type: 'info', message: `Processing uploaded file...` });
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      if (rawData.length < 4) {
        setToast({ type: 'error', message: 'The uploaded file is empty or incomplete' });
        return;
      }

      const metadataRow = rawData[0][0];
      
      if (!metadataRow || !metadataRow.toString().startsWith('#')) {
        setToast({ type: 'error', message: 'Invalid template format. Row 1 must contain metadata starting with "#"' });
        return;
      }

      const metadataStr = metadataRow.toString().replace('#', '').trim();
      const metadataParts = metadataStr.split(',').map(part => part.trim());
      
      const metadata = {};
      metadataParts.forEach(part => {
        const [key, value] = part.split(':').map(s => s.trim());
        if (key && value) {
          metadata[key] = value;
        }
      });

      const fileGrade = metadata['Grade'];
      const fileSubject = metadata['Subject'];
      const fileBook = metadata['Book'];

      if (!fileGrade || !fileSubject || !fileBook) {
        setToast({ type: 'error', message: 'Invalid template format. Metadata must contain Grade, Subject, and Book' });
        return;
      }

      if (fileGrade !== formData.grade || fileSubject !== formData.subject || fileBook !== formData.book) {
        setToast({ 
          type: 'error', 
          message: `Template mismatch! Expected: Class ${formData.grade}, ${formData.subject}, ${formData.book}. Found: Class ${fileGrade}, ${fileSubject}, ${fileBook}` 
        });
        return;
      }

      const headers = rawData[2];
      const dataRows = rawData.slice(3).filter(row => row && row.some(cell => cell !== '' && cell !== null && cell !== undefined));
      
      const jsonData = dataRows.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] !== undefined && row[index] !== null ? row[index] : '';
        });
        return obj;
      });

      const validatedData = jsonData.map((row, index) => {
        const errors = [];
        
        if (!row.chapterNo) errors.push('Chapter number required');
        if (!row.chapter) errors.push('Chapter name required');
        if (!row.topic) errors.push('Topic required');
        if (!row.slo) errors.push('SLO required');
        if (!row.question) errors.push('Question text required');
        
        if (!['MCQ', 'TRUE_FALSE', 'FILL_IN_THE_BLANK', 'SHORT_ANSWER', 'LONG_ANSWER'].includes(row.questionType)) {
          errors.push('Invalid question type (must be: MCQ, TRUE_FALSE, FILL_IN_THE_BLANK, SHORT_ANSWER, LONG_ANSWER)');
        }
        
        const normalizedDifficulty = row.difficulty?.toString().toUpperCase();
        if (!['EASY', 'MEDIUM', 'HARD'].includes(normalizedDifficulty)) {
          errors.push('Invalid difficulty (must be: EASY, MEDIUM, HARD)');
        }
        
        if (row.questionType === 'MCQ') {
          const options = [row.optionA, row.optionB, row.optionC, row.optionD].filter(val => val !== '' && val !== null && val !== undefined);
          if (options.length < 2) errors.push('At least 2 options required');
          
          const normalizedAnswer = row.correctAnswer?.toString().toUpperCase();
          if (!['A', 'B', 'C', 'D'].includes(normalizedAnswer)) {
            errors.push('Correct answer must be A, B, C, or D');
          }
        }
        
        if (row.questionType === 'TRUE_FALSE') {
          const normalizedAnswer = row.correctAnswer?.toString().toUpperCase();
          if (!['TRUE', 'FALSE'].includes(normalizedAnswer)) {
            errors.push('Correct answer must be TRUE or FALSE');
          }
        }
        
        if (['SHORT_ANSWER', 'LONG_ANSWER'].includes(row.questionType) && !row.correctAnswer) {
          errors.push('Correct answer required');
        }
        
        if (row.questionType === 'FILL_IN_THE_BLANK') {
          if (!row.correctAnswer) {
            errors.push('Correct answer required for fill-in-the-blank');
          }
        }
        
        if (row.knowledge && !['Y', 'N'].includes(row.knowledge?.toString().toUpperCase())) {
          errors.push('Knowledge must be Y or N');
        }
        if (row.understanding && !['Y', 'N'].includes(row.understanding?.toString().toUpperCase())) {
          errors.push('Understanding must be Y or N');
        }
        if (row.application && !['Y', 'N'].includes(row.application?.toString().toUpperCase())) {
          errors.push('Application must be Y or N');
        }
        
        return { row, errors, index, subject: fileSubject, book: fileBook };
      });
      setCsvData(validatedData);
      setToast({
        type: 'info',
        message: `Processed ${validatedData.length} rows for ${fileSubject} - ${fileBook}, ${validatedData.filter((d) => d.errors.length === 0).length} valid`,
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const uploadBulk = async () => {
    const validQuestions = csvData.filter((d) => d.errors.length === 0);
    
    if (validQuestions.length === 0) {
      setToast({ type: 'error', message: 'No valid questions to upload' });
      return;
    }
    
    setIsUploading(true);
    
    const questionsRef = collection(db, 'questions');
    let inserted = 0;
    
    const { subject, book } = validQuestions[0];
    
    for (const { row } of validQuestions) {
      let correctAnswer = '';
      let options = [];
      let questionType = '';
      let blanks = {};
      
      if (row.questionType === 'MCQ') {
        options = [row.optionA || '', row.optionB || '', row.optionC || '', row.optionD || ''];
        const answerLetter = row.correctAnswer?.toString().toUpperCase();
        const answerIndex = ['A', 'B', 'C', 'D'].indexOf(answerLetter);
        correctAnswer = answerIndex >= 0 && options[answerIndex] ? options[answerIndex] : '';
        questionType = 'multiple';
      } else if (row.questionType === 'TRUE_FALSE') {
        correctAnswer = row.correctAnswer?.toString().toLowerCase();
        questionType = 'truefalse';
      } else if (row.questionType === 'SHORT_ANSWER') {
        correctAnswer = row.correctAnswer?.toString() || '';
        questionType = 'short';
      } else if (row.questionType === 'LONG_ANSWER') {
        correctAnswer = row.correctAnswer?.toString() || '';
        questionType = 'long';
      } else if (row.questionType === 'FILL_IN_THE_BLANK') {
        const blankCount = (row.question?.match(/{blank\d+}|___/g) || []).length;
        const answerValue = row.correctAnswer?.toString() || '';
        for (let i = 1; i <= blankCount; i++) {
          blanks[`blank${i}`] = answerValue ? [answerValue] : [];
        }
        correctAnswer = answerValue;
        questionType = 'fillblanks';
      }
      
      const difficultyMap = { 'EASY': 'Easy', 'MEDIUM': 'Medium', 'HARD': 'Hard' };
      const normalizedDifficulty = difficultyMap[row.difficulty?.toString().toUpperCase()] || 'Medium';
      
      const question = {
        grade: formData.grade,
        type: questionType,
        subject: subject,
        book: book,
        chapterNo: row.chapterNo?.toString() || '',
        chapter: row.chapter || '',
        topic: row.topic || '',
        difficulty: normalizedDifficulty,
        slo: row.slo || '',
        questionText: row.question || '',
        options,
        correctAnswer,
        blanks,
        explanation: row.explanation?.toString() || '',
        cognitiveLevels: {
          knowledge: row.knowledge?.toString().toUpperCase() === 'Y',
          understanding: row.understanding?.toString().toUpperCase() === 'Y',
          application: row.application?.toString().toUpperCase() === 'Y',
        },
        language: subject === 'Urdu' ? 'ur' : 'en',
        createdBy: 'current_user_id',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      try {
        await addDoc(questionsRef, question);
        inserted++;
      } catch (error) {
        setIsUploading(false);
        setToast({ type: 'error', message: `Failed to upload question: ${error.message}` });
        return;
      }
    }
    
    setIsUploading(false);
    setSuccessMessage(`Successfully uploaded ${inserted} question${inserted > 1 ? 's' : ''} to ${subject} - ${book}!`);
    setShowSuccessPopup(true);
    
    setTimeout(() => {
      handleReset();
    }, 500);
  };

  // Normalize formulas: convert legacy {formula:...} to $...$ for MathJax
  const normalizeFormulas = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    let result = text;
    let index = 0;
    
    // Convert {formula:...} to $...$
    while (index < result.length) {
      const formulaStart = result.indexOf('{formula:', index);
      if (formulaStart === -1) break;
      
      // Find matching closing brace by counting brace balance
      let braceCount = 1;
      let searchIndex = formulaStart + '{formula:'.length;
      
      while (searchIndex < result.length && braceCount > 0) {
        if (result[searchIndex] === '{') braceCount++;
        if (result[searchIndex] === '}') braceCount--;
        searchIndex++;
      }
      
      if (braceCount === 0) {
        const formula = result.substring(formulaStart + '{formula:'.length, searchIndex - 1);
        const replacement = '$' + formula + '$';
        result = result.substring(0, formulaStart) + replacement + result.substring(searchIndex);
        index = formulaStart + replacement.length;
      } else {
        index = formulaStart + 1;
      }
    }
    
    return result;
  };

  const renderPreview = () => {
    if (!formData.questionText) return null;
    
    // Normalize formulas to support both {formula:...} and $...$ formats
    const normalizedText = normalizeFormulas(formData.questionText);
    
    return (
      <div className={`border p-4 mt-4 rounded-lg bg-gray-50 ${formData.subject === 'Urdu' ? 'text-right' : ''}`}>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
        <div className="mb-2 text-base">
          <MathJax dynamic hideUntilTypeset="first">
            {normalizedText}
          </MathJax>
        </div>
      </div>
    );
  };

  const generateExcelTemplate = () => {
    if (!formData.grade || !formData.subject || !formData.book) {
      setToast({ type: 'error', message: 'Please select Class, Subject and Book to generate template' });
      return;
    }
    
    const data = [
      [`# Grade: ${formData.grade}, Subject: ${formData.subject}, Book: ${formData.book}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', '', '', '', 'Cognitive Levels', '', ''],
      ['chapterNo', 'chapter', 'topic', 'slo', 'questionType', 'difficulty', 'question', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer', 'explanation', 'knowledge', 'understanding', 'application'],
      [
        1,
        'Introduction',
        'Basic Concepts',
        'Understand fundamental concepts',
        'MCQ',
        'MEDIUM',
        'What is 5 + 3?',
        '6',
        '7',
        '8',
        '9',
        'C',
        '5 + 3 = 8',
        'Y',
        'N',
        'N'
      ],
      [
        1,
        'Introduction',
        'Basic Facts',
        'Evaluate statements',
        'TRUE_FALSE',
        'EASY',
        '10 - 4 = 6',
        '',
        '',
        '',
        '',
        'TRUE',
        '10 minus 4 equals 6',
        'Y',
        'N',
        'N'
      ],
      [
        1,
        'Introduction',
        'Fill Blanks',
        'Complete equations',
        'FILL_IN_THE_BLANK',
        'MEDIUM',
        '___ × 2 = 10',
        '',
        '',
        '',
        '',
        5,
        '5 × 2 = 10',
        'Y',
        'N',
        'N'
      ],
      [
        2,
        'Advanced Topics',
        'Short Responses',
        'Calculate results',
        'SHORT_ANSWER',
        'MEDIUM',
        'What is 12 divided by 3?',
        '',
        '',
        '',
        '',
        4,
        '12 ÷ 3 = 4',
        'Y',
        'N',
        'N'
      ],
      [
        2,
        'Advanced Topics',
        'Detailed Explanations',
        'Explain concepts',
        'LONG_ANSWER',
        'HARD',
        'Explain how to add fractions with different denominators.',
        '',
        '',
        '',
        '',
        'Find common denominator, convert fractions, then add',
        'LCM method is used to find common denominator',
        'N',
        'Y',
        'Y'
      ],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, `Question_Template_${formData.subject}_${formData.book}.xlsx`);
    setToast({ type: 'success', message: 'Template downloaded successfully!' });
  };

  // Urdu placeholders
  const urduPlaceholders = {
    questionText: 'سوال کا متن درج کریں',
    slo: 'SLO درج کریں',
    explanation: 'وضاحت (اختیاری)',
    options: ['ا- اختیار', 'ب- اختیار', 'ج- اختیار', 'د- اختیار', 'ھ- اختیار', 'و- اختیار'],
    correctAnswer: {
      short: 'صحیح جواب',
      long: 'ماڈل جواب / مارکنگ گائیڈنس',
      truefalse: ['صحیح', 'غلط'],
    },
    blanks: (blankId) => `جوابات ${blankId} کے لیے (مثال: جواب1|جواب2)`,
  };

  const isUrdu = formData.subject === 'Urdu';
  const inputDir = isUrdu ? 'rtl' : 'ltr';
  const inputFont = isUrdu ? 'font-[Noto Nastaliq Urdu]' : '';
  const optionLabels = isUrdu ? ['ا', 'ب', 'ج', 'د', 'ھ', 'و'] : ['A', 'B', 'C', 'D', 'E', 'F'];

  const mathJaxConfig = {
    tex: { inlineMath: [['$', '$'], ['\\(', '\\)']], displayMath: [['$$', '$$'], ['\\[', '\\]']] },
    options: { renderActions: { find: [10, () => {}, () => {}] } },
  };

  return (
    <MathJaxContext config={mathJaxConfig}>
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="Teacher" currentPage="questions" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 overflow-y-auto lg:ml-64">
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
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Create Question</h1>
                <p className="text-xs sm:text-sm lg:text-base text-gray-600">Add individual questions or upload multiple questions for your classes</p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Question Creation</h3>
              <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6">
                <button
                  className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-lg font-medium text-sm ${mode === 'individual' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  onClick={() => setMode('individual')}
                >
                  Individual
                </button>
                <button
                  className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-lg font-medium text-sm ${mode === 'bulk' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  onClick={() => setMode('bulk')}
                >
                  Bulk Upload
                </button>
                <button
                  onClick={generateExcelTemplate}
                  className={`w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-lg font-medium text-sm ${formData.grade && formData.subject && formData.book ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                  disabled={!formData.grade || !formData.subject || !formData.book}
                >
                  Download Template
                </button>
              </div>

              {toast && (
                <div className={`p-4 mb-4 rounded-lg ${toast.type === 'error' ? 'bg-red-100 text-red-700' : toast.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {toast.message}
                </div>
              )}

              {mode === 'individual' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                    <select
                      name="grade"
                      value={formData.grade}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Class</option>
                      {getAvailableGrades().map((grade) => (
                        <option key={grade} value={grade.replace('Grade ', '')}>{grade}</option>
                      ))}
                    </select>
                    {errors.grade && <p className="text-red-500 text-sm mt-1">{errors.grade}</p>}
                  </div>

                  {formData.grade && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                      <select
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Subject</option>
                        {getAvailableSubjects().map((subject) => (
                          <option key={subject} value={subject}>{subject}</option>
                        ))}
                      </select>
                      {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject}</p>}
                    </div>
                  )}

                  {formData.subject && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                      <select
                        name="book"
                        value={formData.book}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Book</option>
                        {getAvailableBooks().map((book) => (
                          <option key={book} value={book}>{book}</option>
                        ))}
                      </select>
                      {errors.book && <p className="text-red-500 text-sm mt-1">{errors.book}</p>}
                    </div>
                  )}

                  {formData.book && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Chapter</label>
                      <select
                        name="chapter"
                        value={formData.chapter}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Chapter</option>
                        {getAvailableChapters().map((chapter) => (
                          <option key={chapter} value={chapter}>{chapter}</option>
                        ))}
                      </select>
                      {errors.chapter && <p className="text-red-500 text-sm mt-1">{errors.chapter}</p>}
                    </div>
                  )}

                  {formData.chapter && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
                      <select
                        name="topic"
                        value={formData.topic}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Topic</option>
                        {topicsByChapter[formData.chapter]?.map((topic) => (
                          <option key={topic} value={topic}>{topic}</option>
                        ))}
                      </select>
                      {errors.topic && <p className="text-red-500 text-sm mt-1">{errors.topic}</p>}
                    </div>
                  )}

                  {formData.topic && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                      <select
                        name="difficulty"
                        value={formData.difficulty}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                      {errors.difficulty && <p className="text-red-500 text-sm mt-1">{errors.difficulty}</p>}
                    </div>
                  )}

                  {formData.difficulty && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Question Type</option>
                        <option value="multiple">Multiple Choice Questions (MCQ)</option>
                        <option value="truefalse">True/False</option>
                        <option value="short">Short Answer</option>
                        <option value="long">Long Answer</option>
                        <option value="fillblanks">Fill in the Blanks</option>
                      </select>
                      {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
                    </div>
                  )}

                  {formData.type && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">SLO</label>
                          {isUrdu && (
                            <button
                              type="button"
                              onClick={() => toggleUrduKeyboard('slo')}
                              className={`px-3 py-1 text-xs rounded-md ${showUrduKeyboard && urduKeyboardField === 'slo' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'} hover:bg-blue-600 hover:text-white transition-colors`}
                            >
                              <i className="ri-keyboard-line mr-1"></i>
                              {showUrduKeyboard && urduKeyboardField === 'slo' ? 'Hide Keyboard' : 'Urdu Keyboard'}
                            </button>
                          )}
                        </div>
                        <input
                          name="slo"
                          value={formData.slo}
                          onChange={handleChange}
                          placeholder={isUrdu ? urduPlaceholders.slo : 'Enter SLO'}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${inputFont} ${isUrdu ? 'text-right' : ''}`}
                          dir={inputDir}
                        />
                        {errors.slo && <p className="text-red-500 text-sm mt-1">{errors.slo}</p>}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">Question Text</label>
                          <div className="flex gap-2">
                            {formData.subject === 'Math' && (
                              <button
                                type="button"
                                onClick={openFormulaBuilder}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
                              >
                                <span>➕</span> Insert Formula
                              </button>
                            )}
                            {isUrdu && (
                              <button
                                type="button"
                                onClick={() => toggleUrduKeyboard('questionText')}
                                className={`px-3 py-1 text-xs rounded-md ${showUrduKeyboard && urduKeyboardField === 'questionText' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'} hover:bg-blue-600 hover:text-white transition-colors`}
                              >
                                <i className="ri-keyboard-line mr-1"></i>
                                {showUrduKeyboard && urduKeyboardField === 'questionText' ? 'Hide Keyboard' : 'Urdu Keyboard'}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <textarea
                          ref={textareaRef}
                          name="questionText"
                          value={formData.questionText}
                          onChange={handleChange}
                          placeholder={isUrdu ? urduPlaceholders.questionText : formData.subject === 'Math' ? 'Type your question here (e.g., "Solve the equation") and click "Insert Formula" to add math' : 'Question Text (e.g., "The capital of France is {blank1}")'}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${inputFont} ${isUrdu ? 'text-right' : ''}`}
                          dir={inputDir}
                          rows={4}
                        />
                        
                        {formData.subject === 'Math' && (
                          <div className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded p-2">
                            💡 Type your question text normally, then click <strong>"Insert Formula"</strong> to add math equations visually - no coding required!
                          </div>
                        )}
                        
                        {errors.questionText && <p className="text-red-500 text-sm mt-1">{errors.questionText}</p>}
                      </div>
                      
                      {formData.questionText && renderPreview()}

                      {formData.type === 'multiple' && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">Options</label>
                          </div>
                          {formData.options.map((opt, i) => (
                            <div key={i} className="flex gap-2 mb-2 items-center">
                              <span className={`w-16 text-sm ${isUrdu ? 'text-right' : ''}`}>{isUrdu ? urduPlaceholders.options[i] : `Option ${optionLabels[i]}`}</span>
                              <input
                                value={opt}
                                onChange={(e) => handleOptionChange(i, e.target.value)}
                                placeholder={isUrdu ? urduPlaceholders.options[i] : `Option ${optionLabels[i]}`}
                                className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${inputFont} ${isUrdu ? 'text-right' : ''}`}
                                dir={inputDir}
                              />
                              {isUrdu && (
                                <button
                                  type="button"
                                  onClick={() => toggleUrduKeyboard(`option-${i}`)}
                                  className={`min-w-[44px] min-h-[44px] px-2 rounded-md ${showUrduKeyboard && urduKeyboardField === `option-${i}` ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'} hover:bg-blue-600 hover:text-white transition-colors`}
                                  title="Urdu Keyboard"
                                >
                                  <i className="ri-keyboard-line"></i>
                                </button>
                              )}
                              {formData.options.length > 2 && (
                                <button
                                  onClick={() => removeOption(i)}
                                  className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                          {formData.options.length < 6 && (
                            <button
                              onClick={addOption}
                              className="mt-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300"
                            >
                              Add Option
                            </button>
                          )}
                          {errors.options && <p className="text-red-500 text-sm mt-1">{errors.options}</p>}
                        </div>
                      )}

                      {formData.type === 'fillblanks' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Blank Answers</label>
                          {Object.keys(formData.blanks).map((blankId, i) => (
                            <div key={blankId} className="flex gap-2 mb-2 items-center">
                              <input
                                value={formData.blanks[blankId].join('|')}
                                onChange={(e) => handleBlankChange(blankId, e.target.value)}
                                placeholder={isUrdu ? urduPlaceholders.blanks(blankId) : `Answers for ${blankId} (e.g., answer1|answer2)`}
                                className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${inputFont} ${isUrdu ? 'text-right' : ''}`}
                                dir={inputDir}
                              />
                              <button
                                onClick={() => removeBlank(blankId)}
                                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={addBlank}
                            className="mt-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300"
                          >
                            Add Blank Answer
                          </button>
                          {errors.blanks && <p className="text-red-500 text-sm mt-1">{errors.blanks}</p>}
                          {Object.keys(errors)
                            .filter((key) => key.startsWith('blank'))
                            .map((key) => (
                              <p key={key} className="text-red-500 text-sm mt-1">{errors[key]}</p>
                            ))}
                        </div>
                      )}

                      {['short', 'long'].includes(formData.type) && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {formData.type === 'short' ? 'Correct Answer' : 'Model Answer / Marking Guidance'}
                          </label>
                          <textarea
                            name="correctAnswer"
                            value={formData.correctAnswer}
                            onChange={handleChange}
                            placeholder={
                              isUrdu
                                ? formData.type === 'short'
                                  ? urduPlaceholders.correctAnswer.short
                                  : urduPlaceholders.correctAnswer.long
                                : formData.type === 'short'
                                ? 'Correct Answer'
                                : 'Model Answer / Marking Guidance'
                            }
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${inputFont} ${isUrdu ? 'text-right' : ''}`}
                            dir={inputDir}
                            rows={4}
                          />
                          {errors.correctAnswer && <p className="text-red-500 text-sm mt-1">{errors.correctAnswer}</p>}
                        </div>
                      )}

                      {formData.type === 'truefalse' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
                          <select
                            name="correctAnswer"
                            value={formData.correctAnswer}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select Correct Answer</option>
                            {isUrdu ? (
                              <>
                                <option value="true">{urduPlaceholders.correctAnswer.truefalse[0]}</option>
                                <option value="false">{urduPlaceholders.correctAnswer.truefalse[1]}</option>
                              </>
                            ) : (
                              <>
                                <option value="true">True</option>
                                <option value="false">False</option>
                              </>
                            )}
                          </select>
                          {errors.correctAnswer && <p className="text-red-500 text-sm mt-1">{errors.correctAnswer}</p>}
                        </div>
                      )}

                      {formData.type === 'multiple' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
                          <select
                            name="correctAnswer"
                            value={formData.correctAnswer}
                            onChange={handleChange}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${inputFont} ${isUrdu ? 'text-right' : ''}`}
                            dir={inputDir}
                          >
                            <option value="">Select Correct Answer</option>
                            {formData.options.map((opt, i) => (
                              <option key={i} value={opt}>
                                {`${optionLabels[i]}. ${opt || (isUrdu ? urduPlaceholders.options[i] : `Option ${optionLabels[i]}`)}`}
                              </option>
                            ))}
                          </select>
                          {errors.correctAnswer && <p className="text-red-500 text-sm mt-1">{errors.correctAnswer}</p>}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">Explanation (Optional)</label>
                          {isUrdu && (
                            <button
                              type="button"
                              onClick={() => toggleUrduKeyboard('explanation')}
                              className={`px-3 py-1 text-xs rounded-md ${showUrduKeyboard && urduKeyboardField === 'explanation' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'} hover:bg-blue-600 hover:text-white transition-colors`}
                            >
                              <i className="ri-keyboard-line mr-1"></i>
                              {showUrduKeyboard && urduKeyboardField === 'explanation' ? 'Hide Keyboard' : 'Urdu Keyboard'}
                            </button>
                          )}
                        </div>
                        <textarea
                          name="explanation"
                          value={formData.explanation}
                          onChange={handleChange}
                          placeholder={isUrdu ? urduPlaceholders.explanation : 'Explanation (optional)'}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${inputFont} ${isUrdu ? 'text-right' : ''}`}
                          dir={inputDir}
                          rows={4}
                        />
                        {errors.explanation && <p className="text-red-500 text-sm mt-1">{errors.explanation}</p>}
                      </div>

                      {/* Urdu Keyboard */}
                      {isUrdu && showUrduKeyboard && (
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-700">
                              Urdu Keyboard - {urduKeyboardField === 'questionText' ? 'Question Text' : 
                                              urduKeyboardField === 'explanation' ? 'Explanation' : 
                                              urduKeyboardField === 'slo' ? 'SLO' :
                                              urduKeyboardField === 'correctAnswer' ? 'Correct Answer' :
                                              urduKeyboardField.startsWith('option-') ? `Option ${optionLabels[parseInt(urduKeyboardField.split('-')[1])]}` : ''}
                            </h4>
                            <button
                              type="button"
                              onClick={() => setShowUrduKeyboard(false)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <i className="ri-close-line text-xl"></i>
                            </button>
                          </div>
                          <Keyboard
                            ref={keyboardRef}
                            layout={urduLayout}
                            onKeyPress={onUrduKeyPress}
                            theme="hg-theme-default hg-layout-default"
                            buttonTheme={[
                              {
                                class: "hg-blue",
                                buttons: "{space}"
                              }
                            ]}
                            display={{
                              '{space}': 'Space'
                            }}
                          />
                        </div>
                      )}

                      <div className="flex gap-4">
                        <button
                          onClick={handleSubmit}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                        >
                          Submit
                        </button>
                        <button
                          onClick={handleReset}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => setToast({ type: 'info', message: 'Preview not implemented' })}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                        >
                          Preview
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                    <select
                      name="grade"
                      value={formData.grade}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                    >
                      <option value="">Select Class</option>
                      {getAvailableGrades().map((grade) => (
                        <option key={grade} value={grade.replace('Grade ', '')}>{grade}</option>
                      ))}
                    </select>
                  </div>

                  {formData.grade && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                      <select
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                      >
                        <option value="">Select Subject</option>
                        {getAvailableSubjects().map((subject) => (
                          <option key={subject} value={subject}>{subject}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.subject && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Book</label>
                      <select
                        name="book"
                        value={formData.book}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                      >
                        <option value="">Select Book</option>
                        {getAvailableBooks().map((book) => (
                          <option key={book} value={book}>{book}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Questions</h3>
                    <p className="text-sm text-gray-600 mb-4">First select Class, Subject and Book above, then download the template with embedded metadata.</p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Upload Question File</label>
                        <input
                          type="file"
                          accept=".xlsx,.csv"
                          onChange={handleFileUpload}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                          disabled={!formData.grade || !formData.subject || !formData.book}
                        />
                        <p className="text-xs text-gray-500 mt-1">Supported formats: .xlsx, .csv</p>
                      </div>

                    {csvData.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Preview</h4>
                        <div className="overflow-x-auto -mx-4 sm:mx-0">
                          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                            <table className="min-w-full border-collapse text-xs sm:text-sm">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border p-2 text-left whitespace-nowrap">Row</th>
                                  <th className="border p-2 text-left min-w-[200px]">Question</th>
                                  <th className="border p-2 text-left whitespace-nowrap">Type</th>
                                  <th className="border p-2 text-left min-w-[150px]">Errors</th>
                                </tr>
                              </thead>
                              <tbody>
                                {csvData.map(({ row, errors, index }) => (
                                  <tr key={index} className={errors.length > 0 ? 'bg-red-50' : ''}>
                                    <td className="border p-2">{index + 1}</td>
                                    <td className="border p-2">{row.question}</td>
                                    <td className="border p-2">{row.questionType}</td>
                                    <td className="border p-2 text-xs">{errors.join(', ')}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                      <button
                        onClick={uploadBulk}
                        className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium ${isUploading || csvData.length === 0 || csvData.every((d) => d.errors.length > 0) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        disabled={isUploading || csvData.length === 0 || csvData.every((d) => d.errors.length > 0)}
                      >
                        {isUploading ? 'Uploading...' : 'Upload & Validate'}
                      </button>
                      <button
                        onClick={() => {
                          setCsvData([]);
                          setFormData({
                            type: '',
                            grade: '',
                            subject: '',
                            book: '',
                            chapter: '',
                            topic: '',
                            difficulty: 'Easy',
                            slo: '',
                            questionText: '',
                            options: ['', '', '', ''],
                            correctAnswer: '',
                            explanation: '',
                            blanks: {},
                          });
                          setErrors({});
                          setToast(null);
                          const fileInput = document.querySelector('input[type="file"]');
                          if (fileInput) fileInput.value = '';
                        }}
                        className="min-h-[44px] px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Class:</span>
                  <span className="font-medium text-gray-900">{formData.grade || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Subject:</span>
                  <span className="font-medium text-gray-900">{formData.subject || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Book:</span>
                  <span className="font-medium text-gray-900">{formData.book || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Chapter:</span>
                  <span className="font-medium text-gray-900">{formData.chapter || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Topic:</span>
                  <span className="font-medium text-gray-900">{formData.topic || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Question Type:</span>
                  <span className="font-medium text-gray-900">{formData.type ? formData.type === 'multiple' ? 'Multiple Choice (MCQs)' : formData.type.replace(/([A-Z])/g, ' $1').trim() : 'None'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Formula Builder Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Build Your Formula</h3>
                <button
                  onClick={() => setShowFormulaModal(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visual Formula Builder
                  </label>
                  <div className="border-2 border-blue-200 rounded-lg p-3 bg-blue-50">
                    <textarea
                      ref={mathFieldRef}
                      value={currentFormula}
                      onChange={(e) => setCurrentFormula(e.target.value)}
                      placeholder="Click symbols below or type LaTeX directly"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono min-h-[44px]"
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 p-3 bg-gray-50 border rounded">
                  <div className="col-span-full text-xs text-gray-600 mb-1 font-medium">Click symbols to build your formula:</div>
                  {mathSymbols.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentFormula(prev => prev + item.symbol)}
                      className="min-h-[44px] px-2 py-2 text-sm bg-white border rounded hover:bg-blue-50 active:bg-blue-100 transition-colors flex flex-col items-center justify-center"
                      title={item.desc}
                    >
                      <span className="font-bold text-base sm:text-sm">{item.label}</span>
                      <span className="text-xs text-gray-500 hidden sm:block">{item.desc}</span>
                    </button>
                  ))}
                </div>
                
                {currentFormula && (
                  <div className="border p-3 rounded-lg bg-gray-50">
                    <div className="text-sm font-medium text-gray-700 mb-2">Preview:</div>
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: (() => {
                          try {
                            return katex.renderToString(currentFormula, { throwOnError: false });
                          } catch (e) {
                            return '<span class="text-red-500">Invalid formula</span>';
                          }
                        })()
                      }} 
                    />
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowFormulaModal(false)}
                    className="flex-1 min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={insertFormula}
                    className="flex-1 min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
                  >
                    Insert Formula
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 max-w-md w-full mx-4 transform transition-all">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Successful!</h3>
              <p className="text-gray-600 mb-6">{successMessage}</p>
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </MathJaxContext>
  );
};

export default QuestionCreator;