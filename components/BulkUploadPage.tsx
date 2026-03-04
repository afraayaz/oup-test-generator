"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";

interface CSVQuestion {
  row: {
    chapterno?: string;
    chapter: string;
    topic?: string;
    slo?: string;
    difficulty: string;
    questionType: string;
    question: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    correctAnswer?: string;
    explanation?: string;
    knowledge?: string;
    understanding?: string;
    application?: string;
  };
  errors: string[];
  index: number;
}

interface BulkUploadPageProps {
  userRole: "Teacher" | "Content Creator";
  apiEndpoint: string;
  userRoleParam?: string; // e.g., "teacher", "content_creator"
}

export default function BulkUploadPage({
  userRole,
  apiEndpoint,
  userRoleParam = userRole === "Teacher" ? "teacher" : "content_creator",
}: BulkUploadPageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    grade: "",
    book: "",
  });
  const [csvData, setCsvData] = useState<CSVQuestion[]>([]);
  const [systemBooks, setSystemBooks] = useState<any[]>([]); // for content creators
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toast, setToast] = useState<{ type: "error" | "success" | "info"; message: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [systemChapters, setSystemChapters] = useState<string[]>([]);
  const hasInvalidRows = csvData.some((d) => d.errors.length > 0);

  // Auto-dismiss non-error toasts after 4 seconds
  useEffect(() => {
    if (!toast || toast.type === "error") return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  const { user } = useUserProfile();
  const searchParams = useSearchParams();

  // fetch system books for content creators similar to QuestionCreationModePage
  // extracted so it can be reused by ensureChaptersLoaded when called early
  const fetchSystemBooks = async () => {
    if (!user) return;
    try {
      const uniqueSubjects = new Set<string>();
      if (user.assignedBooks && Array.isArray(user.assignedBooks)) {
        user.assignedBooks.forEach((b: any) => {
          if (b.subject) uniqueSubjects.add(b.subject);
        });
      }
      if (user.subjectGradePairs && Array.isArray(user.subjectGradePairs)) {
        user.subjectGradePairs.forEach((p: any) => {
          if (p.subject) uniqueSubjects.add(p.subject);
        });
      }
      const subjects = Array.from(uniqueSubjects);
      const all: any[] = [];
      for (const subj of subjects) {
        try {
          const res = await fetch(`/api/admin/books-by-subject?subject=${encodeURIComponent(subj)}`);
          if (res.ok) {
            const data = await res.json();
            const books = data.books || [];
            const withSubject = books.map((b: any) => ({ ...b, subject: b.subject || subj }));
            all.push(...withSubject);
          }
        } catch {}
      }
      setSystemBooks(all);
    } catch {}
  };

  useEffect(() => {
    if (user?.role === 'content_creator') fetchSystemBooks();
  }, [user]);

  // Initialize form data from query params
  useEffect(() => {
    const grade = searchParams.get("grade") || "";
    const subject = searchParams.get("subject") || "";
    const book = searchParams.get("book") || "";
    setFormData({ grade, subject, book });
  }, [searchParams]);

  // Fetch system chapters when book is selected
  // helper to make sure chapters list is available
  const ensureChaptersLoaded = async () => {
    // always refresh chapters for current selection; clear stale data
    setSystemChapters([]);
    // make sure system books are available for content creators
    if (user?.role === 'content_creator' && systemBooks.length === 0) {
      await fetchSystemBooks();
    }
    // reuse fetching logic; choose correct book list per role
    if (!formData.book || !formData.subject) {
      setSystemChapters([]);
      return;
    }
    const booksSource =
      user?.role === 'content_creator' && systemBooks.length > 0
        ? systemBooks
        : (user?.assignedBooks || []);
    if (booksSource.length === 0) {
      setSystemChapters([]);
      return;
    }
    const normalizedFormGrade = formData.grade.replace(/^(Grade|Class)\s*/i, "").trim();
    const selectedBook = booksSource.find((b: any) => {
      const normalizedBookGrade = (b.grade || "").toString().replace(/^(Grade|Class)\s*/i, "").trim();
      return (
        b.title === formData.book &&
        (!b.subject || b.subject === formData.subject) &&
        (!normalizedBookGrade || normalizedBookGrade === normalizedFormGrade)
      );
    });
    if (!selectedBook?.id) {
      setSystemChapters([]);
      return;
    }
    try {
      const url = `/api/admin/chapters?subject=${encodeURIComponent(formData.subject)}&book=${encodeURIComponent(formData.book)}&bookId=${encodeURIComponent(selectedBook.id)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const chapters: string[] = (data.chapters || data || []).map((c: any) =>
          typeof c === "string" ? c : (c.name || c.chapterName || c.title || "")
        ).filter(Boolean);
        setSystemChapters(chapters);
      } else {
        setSystemChapters([]);
      }
    } catch {
      setSystemChapters([]);
    }
  };

  useEffect(() => {
    // whenever grade/book/subject change fetch chapters proactively
    ensureChaptersLoaded();
  }, [formData.grade, formData.book, formData.subject, user?.assignedBooks, systemBooks]);
  const getAvailableGrades = () => {
    const source = user?.role === 'content_creator' && systemBooks.length > 0
      ? systemBooks
      : (user?.assignedBooks || []);
    if (!source || source.length === 0) return [];
    const grades = source.map((book: any) => book.grade)
      .filter((v: any, i: any, self: any) => self.indexOf(v) === i);
    return grades.sort();
  };

  // Get subjects from user's assigned books
  const getAvailableSubjects = () => {
    const source = user?.role === 'content_creator' && systemBooks.length > 0
      ? systemBooks
      : (user?.assignedBooks || []);
    if (!source || source.length === 0) return [];
    const uniqueSubjects = new Set<string>();
    source.forEach((book: any) => {
      if (book.subject) uniqueSubjects.add(book.subject);
    });
    return Array.from(uniqueSubjects);
  };
  const subjects = getAvailableSubjects();

  // Get available books for selected grade and subject
  const getAvailableBooks = () => {
    const source = user?.role === 'content_creator' && systemBooks.length > 0
      ? systemBooks
      : (user?.assignedBooks || []);
    if (!source || source.length === 0) return [];
    return source.filter(
      (book: any) => (!formData.grade || book.grade === formData.grade) &&
                    (!formData.subject || book.subject === formData.subject)
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setToast({ type: "info", message: "Processing uploaded file..." });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        await ensureChaptersLoaded();
        if (formData.book && systemChapters.length === 0) {
          setToast({
            type: "error",
            message: "Unable to load chapters for selected book. Please check your Grade/Subject/Book selection."
          });
          return;
        }
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[];

        if (rawData.length < 4) {
          setToast({ type: "error", message: "The uploaded file is empty or incomplete" });
          return;
        }

        let fileGrade = "";
        let fileSubject = "";
        let fileBook = "";

        const metadataRow = rawData[0]?.[0] as string;
        if (
          metadataRow &&
          metadataRow.toLowerCase().includes("grade") &&
          metadataRow.toLowerCase().includes("subject")
        ) {
          // old single-row metadata format (hash optional)
          const metadataStr = metadataRow.toString().replace("#", "").trim();
          const metadataParts = metadataStr.split(",").map((part: string) => part.trim());

          const metadata: { [key: string]: string } = {};
          metadataParts.forEach((part: string) => {
            const [key, value] = part.split(":").map((s: string) => s.trim());
            if (key && value) {
              metadata[key] = value;
            }
          });

          fileGrade = metadata["Grade"];
          fileSubject = metadata["Subject"];
          fileBook = metadata["Book"];
        } else if (
          rawData[0]?.[0]?.toString().toLowerCase().includes("grade") &&
          rawData[1]?.[0]?.toString().toLowerCase().includes("subject") &&
          rawData[2]?.[0]?.toString().toLowerCase().includes("book")
        ) {
          // new multi-row metadata layout: value is in second column
          fileGrade = rawData[0][1]?.toString() || "";
          fileSubject = rawData[1][1]?.toString() || "";
          fileBook = rawData[2][1]?.toString() || "";
        }

        if (!fileGrade || !fileSubject || !fileBook) {
          setToast({
            type: "error",
            message: "Invalid template format. Metadata must contain Grade, Subject, and Book",
          });
          return;
        }

        if (!fileGrade || !fileSubject || !fileBook) {
          setToast({
            type: "error",
            message: "Invalid template format. Metadata must contain Grade, Subject, and Book",
          });
          return;
        }

        // normalize grade strings for comparison
        const normalizedFormGrade = formData.grade.replace(/^Grade\s*/i, "");
        if (
          fileGrade !== normalizedFormGrade ||
          fileSubject !== formData.subject ||
          fileBook !== formData.book
        ) {
          setToast({
            type: "error",
            message: `Template mismatch! Expected: Class ${formData.grade}, ${formData.subject}, ${formData.book}. Found: Class ${fileGrade}, ${fileSubject}, ${fileBook}`,
          });
          return;
        }

        // determine where header row and data start depending on metadata format
        let headerRowIndex = 2;
        let firstDataRowIndex = 3;
        if (
          rawData[0]?.[0]?.toString().toLowerCase().includes("grade") &&
          rawData[1]?.[0]?.toString().toLowerCase().includes("subject") &&
          rawData[2]?.[0]?.toString().toLowerCase().includes("book")
        ) {
          // new multi-row layout: metadata occupies rows 0-2, blank row at 3
          headerRowIndex = 4;
          firstDataRowIndex = 5;
        }
        const headers = rawData[headerRowIndex] as any[];
        const dataRows = rawData
          .slice(firstDataRowIndex)
          .filter(
            (row: any) =>
              row &&
              row.some(
                (cell: any) =>
                  cell !== "" && cell !== null && cell !== undefined
              )
          );

        const jsonData = dataRows.map((row: any) => {
          const obj: { [key: string]: any } = {};
          headers.forEach((header: any, index: number) => {
            // Normalize header to lowercase for consistency
            const normalizedHeader = header?.toLowerCase() || "";
            obj[normalizedHeader] =
              row[index] !== undefined && row[index] !== null ? row[index] : "";
          });
          return obj;
        });

        const normalizeChapterName = (value: string) => {
          if (!value) return "";
          const punctuationRegex = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~،؛؟]/g;
          const zeroWidthRegex = /[\u200B-\u200D\uFEFF]/g;
          return value
            .toString()
            .normalize("NFC")
            .replace(zeroWidthRegex, "")
            .trim()
            .replace(/^["']|["']$/g, "")
            .replace(punctuationRegex, " ")
            .replace(/\s+/g, " ")
            .toLowerCase();
        };

        const normalizedSystemChapters = systemChapters.map((chapter) => normalizeChapterName(chapter));

        const validatedData: CSVQuestion[] = jsonData.map((row: any, index: number) => {
          const errors: string[] = [];

          // additional required fields matching teacher template
          // topic/chapterno/SLO are all optional now

          if (!row.chapter) {
            errors.push("Chapter required");
          } else if (systemChapters.length > 0) {
            // Validate chapter against system chapters
            const chapterName = (row.chapter || "").toString().trim().replace(/^["']|["']$/g, "");
            const normalizedRowChapter = normalizeChapterName(chapterName);
            const match = normalizedSystemChapters.some((sc) => sc === normalizedRowChapter);
            if (!match) {
              errors.push(
                `Chapter "${chapterName}" not found in system. Available chapters: ${systemChapters.join(", ")}`
              );
            }
          }
          if (!row.question) errors.push("Question text required");

          const normalizedDifficulty = row.difficulty
            ?.toString()
            .trim()
            .toUpperCase();
          if (!["EASY", "MEDIUM", "HARD"].includes(normalizedDifficulty)) {
            errors.push("Invalid difficulty (must be: EASY, MEDIUM, HARD)");
          }

          // Support both 'type' and 'questiontype' column names (case-insensitive)
          const questionTypeValue = row.type || row.questiontype || "";
          const normalizedQuestionType = questionTypeValue?.toString().trim().toUpperCase();
          const validTypes = ["MCQ", "TRUE_FALSE", "FILL_IN_THE_BLANK", "SHORT_ANSWER", "LONG_ANSWER"];
          if (!validTypes.includes(normalizedQuestionType)) {
            errors.push(
              "Invalid question type (must be: MCQ, TRUE_FALSE, FILL_IN_THE_BLANK, SHORT_ANSWER, LONG_ANSWER)"
            );
          }

          if (normalizedQuestionType === "MCQ") {
            const options = [row.optiona, row.optionb, row.optionc, row.optiond].filter(
              (val) => val !== "" && val !== null && val !== undefined
            );
            if (options.length < 2) errors.push("At least 2 options required");

            if (!row.correctanswer) {
              errors.push("Correct answer required");
            }
          }

          if (normalizedQuestionType === "TRUE_FALSE") {
            const normalizedAnswer = row.correctanswer?.toString().toUpperCase();
            if (!["TRUE", "FALSE"].includes(normalizedAnswer)) {
              errors.push("Correct answer must be TRUE or FALSE");
            }
          }

          if (
            normalizedQuestionType === "FILL_IN_THE_BLANK" &&
            !row.correctanswer
          ) {
            errors.push("Correct answer required");
          }

          if (
            ["SHORT_ANSWER", "LONG_ANSWER"].includes(normalizedQuestionType) &&
            row.correctanswer &&
            typeof row.correctanswer === "string" &&
            row.correctanswer.trim() === ""
          ) {
            row.correctanswer = "";
          }

          return { 
            row: {
              chapterNo: row.chapterno,
              chapter: (row.chapter || "").trim().replace(/^['"]|['"]$/g, ""),
              topic: row.topic,
              slo: row.slo || "",
              difficulty: row.difficulty || "",
              questionType: normalizedQuestionType,
              question: row.question || "",
              optionA: row.optiona,
              optionB: row.optionb,
              optionC: row.optionc,
              optionD: row.optiond,
              correctAnswer: row.correctanswer,
              explanation: row.explanation,
              knowledge: row.knowledge,
              understanding: row.understanding,
              application: row.application,
            },
            errors, 
            index: index + 1 
          };
        });

        setCsvData(validatedData);
        setToast({
          type: "info",
          message: `Processed ${validatedData.length} rows, ${
            validatedData.filter((d) => d.errors.length === 0).length
          } valid`,
        });
      } catch (error: any) {
        console.error("BulkUploadPage file read error", error);
        const msg =
          error?.message ||
          (typeof error === "string" ? error : "Error reading file");
        setToast({ type: "error", message: msg });
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    if (!formData.grade || !formData.subject || !formData.book) {
      setToast({ type: "error", message: "Please select Grade, Subject and Book" });
      return;
    }

    const gradeVal = formData.grade.replace(/^Grade\s*/i, "");
    const data = [
      ["Grade", gradeVal],
      ["Subject", formData.subject],
      ["Book", formData.book],
      ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
      [
        "ChapterNo",
        "Chapter",
        "Topic",
        "SLO",
        "QuestionType",
        "Difficulty",
        "Question",
        "OptionA",
        "OptionB",
        "OptionC",
        "OptionD",
        "CorrectAnswer",
        "Explanation",
        "Knowledge",
        "Understanding",
        "Application",
      ],
      [
        "1",
        "Introduction",
        "Basics",
        "SLO 1",
        "MCQ",
        "Medium",
        "What is 1+1?",
        "1",
        "2",
        "",
        "",
        "B",
        "",
        "Y",
        "N",
        "N",
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
    XLSX.writeFile(
      workbook,
      `OUP_Questions_Template_${formData.subject}_${gradeVal}.xlsx`
    );
  };

  const downloadInvalidRows = () => {
    const invalidRows = csvData.filter((d) => d.errors.length > 0);

    if (invalidRows.length === 0) {
      setToast({ type: "info", message: "No invalid rows to download" });
      return;
    }

    const headers = [
      "Row",
      "ChapterNo",
      "Chapter",
      "Topic",
      "SLO",
      "QuestionType",
      "Difficulty",
      "Question",
      "OptionA",
      "OptionB",
      "OptionC",
      "OptionD",
      "CorrectAnswer",
      "Explanation",
      "Knowledge",
      "Understanding",
      "Application",
      "Errors",
    ];

    const rows = invalidRows.map(({ row, errors, index }) => [
      index,
      (row as any).chapterNo || (row as any).chapterno || "",
      row.chapter,
      row.topic || "",
      row.slo || "",
      row.questionType,
      row.difficulty,
      row.question,
      row.optionA || "",
      row.optionB || "",
      row.optionC || "",
      row.optionD || "",
      row.correctAnswer || "",
      row.explanation || "",
      row.knowledge || "",
      row.understanding || "",
      row.application || "",
      errors.join("; "),
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invalid Rows");

    const safeSubject = (formData.subject || "Subject").replace(/[^a-z0-9]+/gi, "_");
    const safeGrade = (formData.grade || "Grade").replace(/[^a-z0-9]+/gi, "_");
    XLSX.writeFile(
      workbook,
      `Invalid_Rows_${safeSubject}_${safeGrade}_${invalidRows.length}.xlsx`
    );
  };

  const uploadBulk = async () => {
    const validQuestions = csvData.filter((d) => d.errors.length === 0);
    const invalidQuestions = csvData.filter((d) => d.errors.length > 0);

    if (validQuestions.length === 0) {
      setToast({ type: "error", message: "No valid questions to upload" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    let inserted = 0;
    const total = validQuestions.length;

    for (let i = 0; i < total; i++) {
      const csvQuestion = validQuestions[i];
      try {
        const row = csvQuestion.row;

        let questionType = "";
        let correctAnswer = "";
        let options: string[] = [];

        if (row.questionType === "MCQ") {
          options = [row.optionA || "", row.optionB || "", row.optionC || "", row.optionD || ""];
          
          // Handle correctAnswer that can be:
          // 1. Single letter (A, B, C, D) - map to option text
          // 2. Multiple options comma-separated (sparrow, egg) - use as-is
          const answerStr = row.correctAnswer?.toString().trim() || "";
          const answerLetter = answerStr.toUpperCase();
          
          // Check if it's a letter (A, B, C, D)
          if (["A", "B", "C", "D"].includes(answerLetter)) {
            const answerIndex = ["A", "B", "C", "D"].indexOf(answerLetter);
            correctAnswer = answerIndex >= 0 && options[answerIndex] ? options[answerIndex] : "";
          } else {
            // It's already the option text (possibly multiple comma-separated)
            correctAnswer = answerStr;
          }
          
          questionType = "multiple";
        } else if (row.questionType === "TRUE_FALSE") {
          correctAnswer = row.correctAnswer?.toString().toLowerCase() || "";
          questionType = "truefalse";
        } else if (row.questionType === "SHORT_ANSWER") {
          correctAnswer = row.correctAnswer?.toString() || "";
          questionType = "short";
        } else if (row.questionType === "LONG_ANSWER") {
          correctAnswer = row.correctAnswer?.toString() || "";
          questionType = "long";
        } else if (row.questionType === "FILL_IN_THE_BLANK") {
          correctAnswer = row.correctAnswer?.toString() || "";
          questionType = "fillblanks";
        }

        const difficultyMap: { [key: string]: string } = {
          EASY: "Easy",
          MEDIUM: "Medium",
          HARD: "Hard",
        };
        const normalizedDifficultyKey = row.difficulty?.toString().trim().toUpperCase() || "";
        const normalizedDifficulty = difficultyMap[normalizedDifficultyKey] || "Medium";

        const requestBody = {
          type: questionType,
          subject: formData.subject,
          grade: formData.grade,
          book: formData.book,
          chapter: row.chapter,
          difficulty: normalizedDifficulty,
          questionText: row.question,
          options,
          correctAnswer,
          explanation: row.explanation || "",
          slo: row.slo || "",
          cognitiveLevel: {
            knowledge: (row.knowledge || "").toString().toUpperCase() === "Y",
            understanding: (row.understanding || "").toString().toUpperCase() === "Y",
            application: (row.application || "").toString().toUpperCase() === "Y",
          },
        };

        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user?.uid || "",
            "x-user-name": user?.name || "",
            "x-user-role": userRoleParam,
            "x-school-id": user?.schoolId || "",
          },
          body: JSON.stringify(requestBody),
        });

        // Wait for response to be processed
        const responseData = await response.json();
        
        if (response.ok && responseData.success) {
          inserted++;
        }
        
        // Update progress after response is received
        setUploadProgress(((i + 1) / total) * 100);
      } catch (error) {
        // Still update progress even on error
        setUploadProgress(((i + 1) / total) * 100);
      }
    }

    setIsUploading(false);
    const invalidCount = invalidQuestions.length;
    setSuccessMessage(
      invalidCount > 0
        ? `Uploaded ${inserted} question${inserted === 1 ? "" : "s"}. ${invalidCount} invalid row${invalidCount === 1 ? "" : "s"} still need attention.`
        : `Successfully uploaded ${inserted} question${inserted > 1 ? "s" : ""}!`
    );
    setToast({
      type: "success",
      message:
        invalidCount > 0
          ? `Upload complete: ${inserted} question${inserted === 1 ? "" : "s"} uploaded. ${invalidCount} invalid row${invalidCount === 1 ? " remains" : "s remain"} highlighted in the preview.`
          : `Upload complete: ${inserted} questions uploaded successfully! View them in your Question Bank.`,
    });

    // Keep invalid rows in preview so users can fix them; clear everything if all rows were valid
    setCsvData(invalidCount > 0 ? invalidQuestions : []);
    // Clear the file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
    // Do not clear the grade/subject/book dropdowns
    // setTimeout(() => {
    //   setFormData({ subject: "", grade: "", book: "" });
    //   setToast(null);
    // }, 2000);
  };

  return (
    <div className="h-screen bg-gray-50 w-screen overflow-hidden">
      <Sidebar
        userRole={userRole}
        currentPage="create"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Fixed floating toast popup */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-md px-4">
          <div
            className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border ${
              toast.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : toast.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            <span className="flex-shrink-0 mt-0.5 text-lg">
              {toast.type === "error" ? "❌" : toast.type === "success" ? "✅" : "ℹ️"}
            </span>
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="flex-shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity text-lg leading-none"
            >
              &times;
            </button>
          </div>
        </div>
      )}

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
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 font-gibson-semibold">Bulk Upload Questions</h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto w-full">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                  Upload File
                </h3>

                <div className="border-t pt-4">
                  <h4 className="text-base font-semibold text-gray-900 mb-2">
                    Upload Questions File
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Select Grade, Subject and Book below, then download the template or upload your own file.
                  </p>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Grade *
                      </label>
                      <select
                        value={formData.grade}
                        onChange={(e) =>
                          setFormData({ ...formData, grade: e.target.value, book: "" })
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                      >
                        <option value="">Select Grade</option>
                        {getAvailableGrades().map((grade: any) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.grade && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subject *
                        </label>
                        <select
                          value={formData.subject}
                          onChange={(e) =>
                            setFormData({ ...formData, subject: e.target.value, book: "" })
                          }
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                        >
                          <option value="">Select Subject</option>
                          {subjects.map((subject) => (
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
                        {getAvailableBooks().length === 0 ? (
                          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800">
                            <svg className="w-4 h-4 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                            No book assigned for this grade and subject.
                          </div>
                        ) : (
                          <select
                            value={formData.book}
                            onChange={(e) =>
                              setFormData({ ...formData, book: e.target.value })
                            }
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                          >
                            <option value="">Select Book</option>
                            {getAvailableBooks().map((book: any) => (
                              <option key={book.id} value={book.title}>
                                {book.title}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {formData.book && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select File
                          </label>
                          <input
                            type="file"
                            accept=".xlsx,.csv"
                            onChange={handleFileUpload}
                            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Supported formats: .xlsx, .csv
                          </p>
                        </div>

                        {csvData.length > 0 && (
                          <div className="mt-6">
                            <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
                              Preview
                            </h4>
                            <div className="overflow-x-auto -mx-4 sm:mx-0">
                              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                                <table className="min-w-full border-collapse text-xs sm:text-sm">
                                  <thead>
                                    <tr className="bg-gray-100">
                                      <th className="border p-2 text-left whitespace-nowrap">
                                        Row
                                      </th>
                                      <th className="border p-2 text-left min-w-[200px]">
                                        Question
                                      </th>
                                      <th className="border p-2 text-left whitespace-nowrap">
                                        Type
                                      </th>
                                      <th className="border p-2 text-left min-w-[150px]">
                                        Errors
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {csvData.map(({ row, errors, index }) => (
                                      <tr
                                        key={index}
                                        className={
                                          errors.length > 0 ? "bg-red-50" : ""
                                        }
                                      >
                                        <td className="border p-2">{index}</td>
                                        <td className="border p-2 truncate">
                                          {row.question}
                                        </td>
                                        <td className="border p-2">
                                          {row.questionType}
                                        </td>
                                        <td className="border p-2 text-xs">
                                          {errors.length > 0 ? (
                                            <span className="text-red-600 font-medium">
                                              {errors.join(", ")}
                                            </span>
                                          ) : (
                                            <span className="text-green-600">✓</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}

                        {isUploading && (
                          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 my-4">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                          <button
                            onClick={downloadTemplate}
                            className="min-h-[44px] px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors"
                          >
                            Download Template
                          </button>
                          <button
                            onClick={uploadBulk}
                            className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium ${
                              isUploading
                                ? "bg-indigo-500 text-white cursor-wait"
                                : csvData.length === 0 ||
                                  csvData.every((d) => d.errors.length > 0)
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                            disabled={
                              isUploading ||
                              csvData.length === 0 ||
                              csvData.every((d) => d.errors.length > 0)
                            }
                          >
                            {isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : "Upload & Validate"}
                          </button>
                          <button
                            onClick={downloadInvalidRows}
                            className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium ${
                              hasInvalidRows
                                ? "bg-amber-500 text-white hover:bg-amber-600"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                            disabled={!hasInvalidRows}
                          >
                            Download Invalid Rows
                          </button>
                          <button
                            onClick={() => {
                              setCsvData([]);
                              setToast(null);
                            }}
                            className="min-h-[44px] px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* File Format Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 sm:mt-6">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <i className="ri-information-line text-blue-600"></i>
                  File Format
                </h4>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>• Supported formats: CSV, Excel</li>
                  <li>• Download template for format</li>
                  <li>• Row 1: Metadata (#)</li>
                  <li>• Row 3: Headers</li>
                  <li>• Row 4+: Questions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
