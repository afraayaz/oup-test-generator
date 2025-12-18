"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";

interface CSVQuestion {
  row: {
    chapter: string;
    difficulty: string;
    questionType: string;
    question: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    correctAnswer?: string;
    explanation?: string;
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
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<{ type: "error" | "success" | "info"; message: string } | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const { user } = useUserProfile();
  const searchParams = useSearchParams();

  // Initialize form data from query params
  useEffect(() => {
    const grade = searchParams.get("grade") || "";
    const subject = searchParams.get("subject") || "";
    const book = searchParams.get("book") || "";
    setFormData({ grade, subject, book });
  }, [searchParams]);

  // Get all unique grades from user's assigned books
  const getAvailableGrades = () => {
    if (!user?.assignedBooks || user.assignedBooks.length === 0) {
      return [];
    }
    const grades = user.assignedBooks
      .map((book) => book.grade)
      .filter((value, index, self) => self.indexOf(value) === index);
    return grades.sort();
  };

  // Get subjects from user's assigned subjects
  const allAvailableSubjects = ["Mathematics", "Science", "English", "History", "Geography"];
  const subjects = user?.subjects && user.subjects.length > 0 ? user.subjects : allAvailableSubjects;

  // Get available books for selected grade and subject
  const getAvailableBooks = () => {
    if (!user?.assignedBooks || user.assignedBooks.length === 0) {
      return [];
    }
    return user.assignedBooks.filter(
      (book) => (!formData.grade || book.grade === formData.grade) && 
                 (!formData.subject || book.subject === formData.subject)
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setToast({ type: "info", message: "Processing uploaded file..." });

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[];

        if (rawData.length < 4) {
          setToast({ type: "error", message: "The uploaded file is empty or incomplete" });
          return;
        }

        const metadataRow = rawData[0]?.[0] as string;
        if (!metadataRow || !metadataRow.toString().startsWith("#")) {
          setToast({
            type: "error",
            message: 'Invalid template format. Row 1 must contain metadata starting with "#"',
          });
          return;
        }

        const metadataStr = metadataRow.toString().replace("#", "").trim();
        const metadataParts = metadataStr.split(",").map((part: string) => part.trim());

        const metadata: { [key: string]: string } = {};
        metadataParts.forEach((part: string) => {
          const [key, value] = part.split(":").map((s: string) => s.trim());
          if (key && value) {
            metadata[key] = value;
          }
        });

        const fileGrade = metadata["Grade"];
        const fileSubject = metadata["Subject"];
        const fileBook = metadata["Book"];

        if (!fileGrade || !fileSubject || !fileBook) {
          setToast({
            type: "error",
            message: "Invalid template format. Metadata must contain Grade, Subject, and Book",
          });
          return;
        }

        if (
          fileGrade !== formData.grade ||
          fileSubject !== formData.subject ||
          fileBook !== formData.book
        ) {
          setToast({
            type: "error",
            message: `Template mismatch! Expected: ${formData.grade}, ${formData.subject}, ${formData.book}. Found: ${fileGrade}, ${fileSubject}, ${fileBook}`,
          });
          return;
        }

        const headers = rawData[2] as any[];
        const dataRows = rawData
          .slice(3)
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
            obj[header] =
              row[index] !== undefined && row[index] !== null ? row[index] : "";
          });
          return obj;
        });

        const validatedData: CSVQuestion[] = jsonData.map((row: any, index: number) => {
          const errors: string[] = [];

          if (!row.chapter) errors.push("Chapter required");
          if (!row.question) errors.push("Question text required");

          const normalizedDifficulty = row.difficulty
            ?.toString()
            .toUpperCase();
          if (!["EASY", "MEDIUM", "HARD"].includes(normalizedDifficulty)) {
            errors.push("Invalid difficulty (must be: EASY, MEDIUM, HARD)");
          }

          if (
            ![
              "MCQ",
              "TRUE_FALSE",
              "FILL_IN_THE_BLANK",
              "SHORT_ANSWER",
              "LONG_ANSWER",
            ].includes(row.questionType)
          ) {
            errors.push(
              "Invalid question type (must be: MCQ, TRUE_FALSE, FILL_IN_THE_BLANK, SHORT_ANSWER, LONG_ANSWER)"
            );
          }

          if (row.questionType === "MCQ") {
            const options = [row.optionA, row.optionB, row.optionC, row.optionD].filter(
              (val) => val !== "" && val !== null && val !== undefined
            );
            if (options.length < 2) errors.push("At least 2 options required");

            const normalizedAnswer = row.correctAnswer?.toString().toUpperCase();
            if (!["A", "B", "C", "D"].includes(normalizedAnswer)) {
              errors.push("Correct answer must be A, B, C, or D");
            }
          }

          if (row.questionType === "TRUE_FALSE") {
            const normalizedAnswer = row.correctAnswer?.toString().toUpperCase();
            if (!["TRUE", "FALSE"].includes(normalizedAnswer)) {
              errors.push("Correct answer must be TRUE or FALSE");
            }
          }

          if (
            ["SHORT_ANSWER", "LONG_ANSWER"].includes(row.questionType) &&
            !row.correctAnswer
          ) {
            errors.push("Correct answer required");
          }

          return { 
            row: {
              chapter: row.chapter || "",
              difficulty: row.difficulty || "",
              questionType: row.questionType || "",
              question: row.question || "",
              optionA: row.optionA,
              optionB: row.optionB,
              optionC: row.optionC,
              optionD: row.optionD,
              correctAnswer: row.correctAnswer,
              explanation: row.explanation,
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
      } catch (error) {
        setToast({ type: "error", message: "Error reading file" });
        console.error(error);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    if (!formData.grade || !formData.subject || !formData.book) {
      setToast({ type: "error", message: "Please select Grade, Subject and Book" });
      return;
    }

    const data = [
      [`# Grade: ${formData.grade}, Subject: ${formData.subject}, Book: ${formData.book}`, "", "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
      ["chapter", "difficulty", "questionType", "question", "optionA", "optionB", "correctAnswer"],
      ["Chapter 1", "MEDIUM", "MCQ", "What is 5 + 3?", "7", "8", "B"],
      ["Chapter 1", "EASY", "TRUE_FALSE", "10 - 4 = 6", "", "", "TRUE"],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
    XLSX.writeFile(
      workbook,
      `OUP_Questions_Template_${formData.subject}_${formData.grade}.xlsx`
    );
  };

  const uploadBulk = async () => {
    const validQuestions = csvData.filter((d) => d.errors.length === 0);

    if (validQuestions.length === 0) {
      setToast({ type: "error", message: "No valid questions to upload" });
      return;
    }

    setIsUploading(true);
    let inserted = 0;

    for (const csvQuestion of validQuestions) {
      try {
        const row = csvQuestion.row;

        let questionType = "";
        let correctAnswer = "";
        let options: string[] = [];

        if (row.questionType === "MCQ") {
          options = [row.optionA || "", row.optionB || "", row.optionC || "", row.optionD || ""];
          const answerLetter = row.correctAnswer?.toString().toUpperCase();
          const answerIndex = ["A", "B", "C", "D"].indexOf(answerLetter || "");
          correctAnswer =
            answerIndex >= 0 && options[answerIndex] ? options[answerIndex] : "";
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
        const normalizedDifficulty = difficultyMap[row.difficulty?.toString().toUpperCase() || ""] || "Medium";

        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user?.uid || "",
            "x-user-name": user?.name || "",
            "x-user-role": userRoleParam,
            "x-school-id": user?.schoolId || "",
          },
          body: JSON.stringify({
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
          }),
        });

        if (response.ok) {
          inserted++;
        }
      } catch (error) {
        console.error(error);
      }
    }

    setIsUploading(false);
    setSuccessMessage(
      `Successfully uploaded ${inserted} question${inserted > 1 ? "s" : ""}!`
    );
    setToast({
      type: "success",
      message: `Upload complete: ${inserted} questions uploaded successfully! View them in your Question Bank.`,
    });

    // Clear form after success
    setTimeout(() => {
      setCsvData([]);
      setFormData({ subject: "", grade: "", book: "" });
      setToast(null);
    }, 2000);
  };

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
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Bulk Upload Questions</h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto w-full">
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                  Upload File
                </h3>

                {toast && (
                  <div
                    className={`p-4 mb-4 rounded-lg ${
                      toast.type === "error"
                        ? "bg-red-100 text-red-700"
                        : toast.type === "success"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {toast.message}
                  </div>
                )}

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
                        {getAvailableGrades().map((grade) => (
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

                    {formData.subject && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Book *
                        </label>
                        <select
                          value={formData.book}
                          onChange={(e) =>
                            setFormData({ ...formData, book: e.target.value })
                          }
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
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
                              isUploading ||
                              csvData.length === 0 ||
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
                            {isUploading ? "Uploading..." : "Upload & Validate"}
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
