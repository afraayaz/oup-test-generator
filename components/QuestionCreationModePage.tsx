"use client";

import { useState, useEffect } from "react";
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
  const [formData, setFormData] = useState({
    subject: "",
    grade: "",
    book: "",
  });
  const [systemBooks, setSystemBooks] = useState<any[]>([]); // Store all system books for content creators
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [chapters, setChapters] = useState<any[]>([]); // Store chapters for selected book
  const [subjectId, setSubjectId] = useState(""); // Track subject ID for chapter API
  const { user: hookUser } = useUserProfile();
  const user = propUser || hookUser; // Use prop if provided, otherwise use hook
  const router = useRouter();

  // Fetch all books from system (for content creators to see all books of their assigned subject)
  useEffect(() => {
    const fetchSystemBooks = async () => {
      try {
        const booksResponse = await fetch(
          'https://firestore.googleapis.com/v1/projects/quiz-app-ff0ab/databases/(default)/documents/books'
        );
        
        if (booksResponse.ok) {
          const booksData = await booksResponse.json();
          const books = (booksData.documents || []).map((doc: any) => {
            return {
              id: doc.fields?.id?.stringValue || '',
              title: doc.fields?.title?.stringValue || '',
              subject: doc.fields?.subject?.stringValue || '',
              grade: doc.fields?.grade?.stringValue || '',
              chapters: parseInt(doc.fields?.chapters?.integerValue || '0')
            };
          }).filter((book: any) => book.id && book.title);
          
          setSystemBooks(books);
        }
      } catch (error) {
        console.error('Error fetching system books:', error);
      }
    };

    fetchSystemBooks();
  }, []);

  // Fetch chapters when book is selected
  const fetchChaptersForBook = async (bookId: string, subject: string) => {
    try {
      // First, find the subject ID for this book
      const subjectsResponse = await fetch(
        'https://firestore.googleapis.com/v1/projects/quiz-app-ff0ab/databases/(default)/documents/subjects'
      );
      
      if (!subjectsResponse.ok) return;
      
      const subjectsData = await subjectsResponse.json();
      const subjects = subjectsData.documents || [];
      
      let foundSubjectId = '';
      for (const subjectDoc of subjects) {
        const subjectName = subjectDoc.fields?.name?.stringValue || '';
        if (subjectName.toLowerCase() === subject.toLowerCase()) {
          foundSubjectId = subjectDoc.name.split('/').pop();
          break;
        }
      }
      
      if (!foundSubjectId) return;
      
      setSubjectId(foundSubjectId);
      
      // Now fetch chapters for this book
      const chaptersResponse = await fetch(
        `/api/admin/books/chapters?bookId=${bookId}&subjectId=${foundSubjectId}`
      );
      
      if (chaptersResponse.ok) {
        const data = await chaptersResponse.json();
        setChapters(data.chapters || []);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
      setChapters([]);
    }
  };

  // Pre-populate subject for content creators
  useEffect(() => {
    if (userRole === "Content Creator" && user?.subjects && user.subjects.length > 0) {
      // Auto-select the first assigned subject for content creators
      setFormData(prev => ({
        ...prev,
        subject: user.subjects[0],
        book: "" // Reset book when subject changes
      }));
    }
  }, [user?.subjects, userRole]);

  // Get all unique grades from user's subjectGradePairs or assignedBooks
  const getAvailableGrades = () => {
    // If subjectGradePairs exists (Teachers), use it
    if (user?.subjectGradePairs && user.subjectGradePairs.length > 0) {
      const grades = user.subjectGradePairs
        .map((pair: any) => pair.grade)
        .filter((value: any, index: number, self: any) => self.indexOf(value) === index);
      return grades.sort();
    }
    
    // For Content Creators: show grades 1-8 based on available books in system
    if (userRole === "Content Creator" && systemBooks.length > 0) {
      const grades = systemBooks
        .map((book: any) => book.grade.replace(/^Grade\s+/i, '').trim())
        .filter((value: any, index: number, self: any) => self.indexOf(value) === index)
        .sort((a: string, b: string) => {
          const numA = parseInt(a) || 0;
          const numB = parseInt(b) || 0;
          return numA - numB;
        });
      return grades;
    }
    
    // Fallback: use assignedGrades if available
    if (user?.assignedGrades && user.assignedGrades.length > 0) {
      return [...user.assignedGrades].sort();
    }
    
    return [];
  };

  // Helper function to display grade with "Class" prefix
  const displayGrade = (grade: string): string => {
    const gradeNum = grade.replace(/^(Grade|Class)\s+/i, '').trim();
    return `Class ${gradeNum}`;
  };

  // Get subjects from user's subjectGradePairs or assignedBooks
  const getAvailableSubjects = () => {
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

  // Get available books for selected grade and subject
  const getAvailableBooks = () => {
    let books: any[] = [];
    
    // Helper function to normalize grades for comparison
    const normalizeGrade = (grade: string): string => {
      // Extract just the number: "Grade 1" -> "1", "Class 1" -> "1", "1" -> "1"
      return grade.replace(/^(Grade|Class)\s+/i, '').trim();
    };
    
    // If subjectGradePairs exists (Teachers), use it
    if (user?.subjectGradePairs && user.subjectGradePairs.length > 0) {
      // Normalize grade for comparison
      const selectedGradeNormalized = normalizeGrade(formData.grade);
      
      // Find the matching subject-grade pair
      const matchingPair = user.subjectGradePairs.find(
        (pair: any) => pair.subject === formData.subject && normalizeGrade(pair.grade) === selectedGradeNormalized
      );
      
      if (matchingPair && matchingPair.assignedBooks) {
        books = matchingPair.assignedBooks;
      }
    } 
    // For Content Creators: filter system books by grade AND pre-selected subject
    else if (user?.assignedBooks && user.assignedBooks.length > 0 && systemBooks.length > 0) {
      // Filter system books by BOTH selected grade AND pre-selected subject
      books = systemBooks.filter(book => {
        // Normalize both grades for comparison
        const bookGrade = normalizeGrade(book.grade.toString());
        const selectedGrade = normalizeGrade(formData.grade.toString());
        
        // Normalize subject comparison (case-insensitive)
        const bookSubject = book.subject.toString().trim().toLowerCase();
        const selectedSubject = formData.subject.toString().trim().toLowerCase();
        
        // Filter by BOTH grade AND subject
        return bookGrade === selectedGrade && bookSubject === selectedSubject;
      });
    }
    
    return books.sort((a, b) => a.title.localeCompare(b.title));
  };

  const handleGradeChange = (grade: string) => {
    setFormData({ ...formData, grade, book: "" });
  };

  const handleSubjectChange = (subject: string) => {
    setFormData({ ...formData, subject, book: "" });
  };

  const handleBookChange = (book: string) => {
    setFormData({ ...formData, book });
    // Fetch chapters for the selected book
    if (book && formData.subject) {
      const selectedBook = systemBooks.find(b => b.title === book);
      if (selectedBook) {
        fetchChaptersForBook(selectedBook.id, formData.subject);
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
              message = `🎉 Success!\n\n✅ Successfully uploaded all ${questions.length} questions to ${formData.book} (Grade ${formData.grade}, ${formData.subject})!`;
            }
            setUploadMessage(message);
            if (successCount === questions.length) {
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

            {/* Debug Info */}
            <div className="mb-4 p-3 bg-gray-100 rounded text-xs font-mono border border-gray-300">
              <p>👤 User: {user?.name || 'N/A'}</p>
              <p>🔐 Role: {user?.role || 'N/A'}</p>
              <p>📚 subjectGradePairs: {user?.subjectGradePairs ? JSON.stringify(user.subjectGradePairs.length) : 'undefined'}</p>
              <p>✅ Grades available: {getAvailableGrades().length}</p>
            </div>

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
                    {/* For Content Creators: Show Subject first (pre-selected, disabled) */}
                    {userRole === "Content Creator" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subject *
                        </label>
                        <input
                          type="text"
                          value={formData.subject}
                          disabled
                          className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>
                    )}

                    {/* Grade Selection */}
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

                    {/* For Teachers: Subject Selection (conditional on grade) */}
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

                    {/* Book Selection - shown for both CC and Teachers when they have grade + subject */}
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
                    onClick={() =>
                      router.push(`${baseRoute}/individual${buildRouteParams()}`)
                    }
                    className="w-full min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                  >
                    Proceed to Create Question
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4 mt-6">
                {!formData.book && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <p className="text-gray-700">
                      Select a Grade, Subject, and Book above to upload questions.
                    </p>
                  </div>
                )}

                {formData.book && (
                  <>
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
                        onClick={() =>
                          router.push(`${baseRoute}/individual${buildRouteParams()}`)
                        }
                        className="w-full min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                      >
                        Proceed to Create Question
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
    </div>
  );
}
