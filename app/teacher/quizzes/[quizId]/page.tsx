'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';

// Helper functions
const toUrduNumber = (num: number | string): string => {
  const urduNumerals = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num.toString().split('').map((digit: string) => urduNumerals[parseInt(digit)] || digit).join('');
};

const extractLatexFromFormulas = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  let result = text;
  let index = 0;
  
  while (index < result.length) {
    const formulaStart = result.indexOf('{formula:', index);
    if (formulaStart === -1) break;
    
    let braceCount = 1;
    let pos = formulaStart + 9;
    
    while (pos < result.length && braceCount > 0) {
      if (result[pos] === '{') braceCount++;
      else if (result[pos] === '}') braceCount--;
      pos++;
    }
    
    if (braceCount === 0) {
      const latex = result.substring(formulaStart + 9, pos - 1);
      result = result.substring(0, formulaStart) + '$' + latex + '$' + result.substring(pos);
      index = formulaStart + latex.length + 2;
    } else {
      index = formulaStart + 9;
    }
  }
  
  return result;
};

const convertNewlinesToHtml = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\n/g, '<br>');
};

const optionLabels = (isRTL: boolean): string[] => isRTL ? ['ا', 'ب', 'ج', 'د', 'ھ', 'و'] : ['A', 'B', 'C', 'D', 'E', 'F'];

interface StudentAttempt {
  id: string;
  studentId: string;
  studentName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  completedAt: string;
  isMarked: boolean;
  hasManualGrades: boolean;
}

export default function QuizDetailsPage() {
  const params = useParams();
  const quizId = params.quizId as string;
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quiz, setQuiz] = useState<any>(null);
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!quizId) return;

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/teacher/quizzes/${quizId}`);
        if (response.ok) {
          const data = await response.json();
          setQuiz(data.quiz);
          setAttempts(data.attempts || []);
        }
      } catch (error) {
        console.error('Error fetching quiz details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [quizId]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100 text-green-800';
    if (percentage >= 60) return 'bg-blue-100 text-blue-800';
    if (percentage >= 40) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  // Download Question Paper as PDF
  const downloadQuestionPaperPDF = () => {
    if (!quiz || !quiz.items) return;
    
    const pdfContent = `
      <!DOCTYPE html>
      <html dir="ltr">
      <head>
        <title>${quiz.title}</title>
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
          body { font-family: 'Cambria', Georgia, serif; margin: 40px; line-height: 1.8; color: #2c3e50; direction: ltr; font-size: 16px; }
          .header { border-bottom: 1px solid #2c3e50; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-family: 'Calibri', 'Arial', sans-serif; font-size: 26px; font-weight: bold; color: #1a1a1a; text-align: center; margin-bottom: 12px; letter-spacing: 0.5px; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border: 1px solid #1a1a1a; font-family: 'Calibri', 'Arial', sans-serif; }
          .header-table td { padding: 6px 8px; font-size: 12px; color: #1a1a1a; vertical-align: middle; border: 0.5px solid #999999; }
          .header-table .label { font-weight: 600; width: 25%; background-color: #ecf0f1; font-family: 'Calibri', 'Arial', sans-serif; }
          .header-table .value { width: 25%; font-family: 'Cambria', Georgia, serif; }
          .name-field { min-height: 12px; }
          .question { margin-bottom: 30px; page-break-inside: avoid; }
          .question-number { font-family: 'Calibri', 'Arial', sans-serif; direction: ltr; text-align: left; font-weight: 600; font-size: 19px; margin-bottom: 10px; }
          .question-text { font-family: 'Cambria', Georgia, serif; font-size: 16px; margin-bottom: 14px; font-weight: 500; color: #1a1a1a; line-height: 1.8; }
          .options { margin-bottom: 12px; }
          .option { margin-bottom: 6px; font-size: 15px; font-family: 'Cambria', Georgia, serif; color: #2c3e50; line-height: 1.6; }
          .answer-lines { margin-top: 12px; }
          .answer-line { border-bottom: 1px solid #333; height: 30px; margin-bottom: 8px; }
          mark { background-color: #fef08a; padding: 2px 4px; border-radius: 2px; }
          b, strong { font-weight: bold; }
          i, em { font-style: italic; }
          .page-break { page-break-before: always; }
          @media print { body { margin: 20px; } .page-break { page-break-before: always; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${quiz.title}</div>
          <table class="header-table">
            <tr>
              <td class="label">Student Name:</td>
              <td class="value name-field"></td>
              <td class="label">Student ID:</td>
              <td class="value name-field"></td>
            </tr>
            <tr>
              <td class="label">Class:</td>
              <td class="value">${quiz.class || quiz.grade || 'N/A'}</td>
              <td class="label">Subject:</td>
              <td class="value">${quiz.subject || 'N/A'}</td>
            </tr>
            <tr>
              <td class="label">Total Marks:</td>
              <td class="value">${quiz.totalMarks}</td>
              <td class="label">Total Time:</td>
              <td class="value">${quiz.timeLimitMinutes || 'N/A'} minutes</td>
            </tr>
            <tr>
              <td class="label">Obtained Marks:</td>
              <td class="value name-field"></td>
              <td class="label">Date:</td>
              <td class="value">${new Date().toLocaleDateString()}</td>
            </tr>
          </table>
        </div>
        ${quiz.items.map((item: any, i: number) => `
          <div class="question">
            <div class="question-number">
              Question ${i + 1} ${item.marks ? `(${item.marks} marks)` : ''}
            </div>
            <div class="question-text">
              ${convertNewlinesToHtml(extractLatexFromFormulas(typeof item.question === 'object' ? item.question?.text : item.question))}
            </div>
            ${(item.questionType === 'multiple' || item.questionType === 'mcqs') && item.options?.length
              ? `<div class="options">${item.options.map((opt: any, j: number) =>
                  `<div class="option">${String.fromCharCode(65 + j)}. ${convertNewlinesToHtml(opt.text || opt)}</div>`
                ).join('')}</div>`
              : item.questionType === 'truefalse'
              ? `<div class="options">
                  <div class="option">A. True</div>
                  <div class="option">B. False</div>
                </div>`
              : item.questionType === 'fillblanks'
              ? ''
              : `<div class="options"><div class="option">Write your answer below.</div></div>`
            }
            ${(item.questionType === 'short' || item.questionType === 'long')
              ? `<div class="answer-lines">
                  ${Array.from({ length: item.questionType === 'long' ? 10 : 5 }).map(() => 
                    `<div class="answer-line"></div>`
                  ).join('')}
                </div>`
              : ''
            }
          </div>
          ${(i + 1) % 5 === 0 && i < quiz.items.length - 1 ? '<div class="page-break"></div>' : ''}
        `).join('')}
      </body>
      </html>
    `;
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(pdfContent);
      newWindow.document.close();
      
      const checkMathJax = setInterval(() => {
        if ((newWindow as any).MathJax && (newWindow as any).MathJax.typesetPromise) {
          clearInterval(checkMathJax);
          (newWindow as any).MathJax.typesetPromise().then(() => {
            setTimeout(() => {
              newWindow.print();
              alert('Question Paper PDF ready! Use print dialog to save as PDF.');
            }, 500);
          });
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkMathJax);
        newWindow.print();
        alert('Question Paper PDF ready! Use print dialog to save as PDF.');
      }, 5000);
    }
  };

  // Download Answer Key as PDF
  const downloadAnswerKeyPDF = () => {
    if (!quiz || !quiz.items) return;
    
    const answerKeyContent = `
      <!DOCTYPE html>
      <html dir="ltr">
      <head>
        <title>${quiz.title} - Answer Key</title>
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
          .answer { margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; }
          .answer-number { font-family: Arial, sans-serif; font-weight: bold; font-size: 18px; margin-bottom: 8px; }
          .answer-text { font-size: 16px; margin-bottom: 12px; }
          .explanation-text { font-size: 15px; margin-top: 10px; padding: 12px; background-color: #f0fdf4; border-left: 3px solid #10b981; color: #065f46; border-radius: 4px; }
          mark { background-color: #fef08a; padding: 2px 4px; border-radius: 2px; }
          b, strong { font-weight: bold; }
          i, em { font-style: italic; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${quiz.title} - Answer Key</div>
          <div class="info"><strong>Grade:</strong> ${quiz.class || quiz.grade || 'N/A'}</div>
          <div class="info"><strong>Subject:</strong> ${quiz.subject || 'N/A'}</div>
          <div class="info"><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
          <div class="info"><strong>Total Questions:</strong> ${quiz.totalQuestions}</div>
        </div>
        ${quiz.items.map((item: any, i: number) => `
          <div class="answer">
            <div class="answer-number">
              Question ${i + 1} ${item.marks ? `(${item.marks} marks)` : ''}
            </div>
            <div class="answer-text">${convertNewlinesToHtml(extractLatexFromFormulas(typeof item.question === 'object' ? item.question?.text : item.question))}</div>
            <div class="answer-text"><strong>Answer:</strong> ${
              (item.questionType === 'multiple' || item.questionType === 'mcqs') && item.options?.length
                ? `${String.fromCharCode(65 + (item.answer?.value || 0))}. ${convertNewlinesToHtml(item.options[item.answer?.value]?.text || item.options[item.answer?.value] || item.answer?.value)}`
                : item.questionType === 'truefalse'
                ? item.answer?.value ? 'True' : 'False'
                : item.questionType === 'fillblanks'
                ? typeof item.answer?.value === 'string'
                  ? convertNewlinesToHtml(item.answer?.value)
                  : typeof item.answer?.value === 'object'
                  ? Object.entries(item.answer?.value || {})
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' or ') : v}`)
                    .join(', ')
                  : convertNewlinesToHtml(item.answer?.text || 'N/A')
                : convertNewlinesToHtml(item.answer?.text || item.answer?.value || 'N/A')
            }</div>
            ${item.explanation && (typeof item.explanation === 'object' ? item.explanation?.text : item.explanation) ? `
            <div class="explanation-text"><strong>Explanation:</strong> ${convertNewlinesToHtml(extractLatexFromFormulas(typeof item.explanation === 'object' ? item.explanation?.text : item.explanation))}</div>
            ` : ''}
          </div>
        `).join('')}
      </body>
      </html>
    `;
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(answerKeyContent);
      newWindow.document.close();
      
      const checkMathJax = setInterval(() => {
        if ((newWindow as any).MathJax && (newWindow as any).MathJax.typesetPromise) {
          clearInterval(checkMathJax);
          (newWindow as any).MathJax.typesetPromise().then(() => {
            setTimeout(() => {
              newWindow.print();
              alert('Answer Key PDF ready! Use print dialog to save as PDF.');
            }, 500);
          });
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkMathJax);
        newWindow.print();
        alert('Answer Key PDF ready! Use print dialog to save as PDF.');
      }, 5000);
    }
  };

  // Download Question Paper as Word
  const downloadQuestionPaperWord = async () => {
    if (!quiz || !quiz.items) return;
    try {
      const docxModule = await import('docx');
      const { Document, Packer, Paragraph, TextRun, Header, Footer, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = docxModule;
      
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
                  children: [new TextRun({ text: quiz.title, size: 40, font: 'Calibri', bold: true, color: '1a1a1a' })],
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
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
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
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Student Name:', bold: true, size: 24, font: 'Calibri' })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '____________________', size: 24, font: 'Cambria' })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Student ID:', bold: true, size: 24, font: 'Calibri' })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '____________________', size: 24, font: 'Cambria' })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Class:', bold: true, size: 24, font: 'Calibri' })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: quiz.class || quiz.grade || 'N/A', size: 24, font: 'Cambria' })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Subject:', bold: true, size: 24, font: 'Calibri' })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: quiz.subject || 'N/A', size: 24, font: 'Cambria' })] })] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total Marks:', bold: true, size: 24, font: 'Calibri' })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: quiz.totalMarks.toString(), size: 24, font: 'Cambria' })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total Time:', bold: true, size: 24, font: 'Calibri' })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${quiz.timeLimitMinutes || 'N/A'} minutes`, size: 24, font: 'Cambria' })] })] }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Obtained Marks:', bold: true, size: 24, font: 'Calibri' })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '____________________', size: 24, font: 'Cambria' })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Date:', bold: true, size: 24, font: 'Calibri' })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: new Date().toLocaleDateString(), size: 24, font: 'Cambria' })] })] }),
                  ],
                }),
              ],
            }),
            new Paragraph({ children: [new TextRun({ text: '', size: 20 })], spacing: { after: 400 } }),
            ...quiz.items.flatMap((item: any, i: number) => [
              new Paragraph({
                children: [new TextRun({ text: `Question ${i + 1}:${item.marks ? ` (${item.marks} marks)` : ''}`, size: 28, font: 'Calibri', bold: true, color: '1a1a1a' })],
                heading: 'Heading2' as any,
                alignment: AlignmentType.LEFT,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun({ text: typeof item.question === 'object' ? item.question?.text : item.question, size: 28, font: 'Cambria', color: '2c3e50' })],
                alignment: AlignmentType.LEFT,
                spacing: { after: 100 },
              }),
              ...((item.questionType === 'multiple' || item.questionType === 'mcqs') && item.options?.length
                ? item.options.map((opt: any, j: number) =>
                    new Paragraph({
                      children: [new TextRun({ text: `${String.fromCharCode(65 + j)}. ${opt.text || opt}`, size: 26, font: 'Cambria', color: '2c3e50' })],
                      alignment: AlignmentType.LEFT,
                      spacing: { after: 60 },
                    })
                  )
                : item.questionType === 'truefalse'
                ? [
                    new Paragraph({ children: [new TextRun({ text: 'A. True', size: 26, font: 'Cambria', color: '2c3e50' })], alignment: AlignmentType.LEFT, spacing: { after: 60 } }),
                    new Paragraph({ children: [new TextRun({ text: 'B. False', size: 26, font: 'Cambria', color: '2c3e50' })], alignment: AlignmentType.LEFT, spacing: { after: 60 } }),
                  ]
                : item.questionType === 'fillblanks'
                ? []
                : [
                    new Paragraph({ children: [new TextRun({ text: 'Write your answer below.', size: 26, font: 'Cambria', color: '2c3e50' })], alignment: AlignmentType.LEFT, spacing: { after: 50 } }),
                    ...Array.from({ length: item.questionType === 'long' ? 10 : 5 }).map(() =>
                      new Paragraph({
                        children: [new TextRun({ text: '_______________________________________________________', size: 20, font: 'Calibri', color: '999999' })],
                        alignment: AlignmentType.LEFT,
                        spacing: { after: 120, before: 50 },
                      })
                    ),
                  ]),
              ...((i + 1) % 5 === 0 && i < quiz.items.length - 1 ? [new Paragraph({ pageBreakBefore: true })] : []),
            ]).flat(),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, `${quiz.title}.docx`);
      alert('Question Paper Word document downloaded!');
    } catch (error) {
      alert('Error generating Word document: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Download Answer Key as Word
  const downloadAnswerKeyWord = async () => {
    if (!quiz || !quiz.items) return;
    try {
      const docxModule = await import('docx');
      const { Document, Packer, Paragraph, TextRun, Header, Footer, AlignmentType, TableCell, ShadingType } = docxModule;
      
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
                  children: [new TextRun({ text: `${quiz.title} - Answer Key`, size: 40, font: 'Calibri', bold: true, color: '1a1a1a' })],
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
            new Paragraph({ children: [new TextRun({ text: `Grade: ${quiz.class || quiz.grade || 'N/A'}`, size: 24, font: 'Calibri' })], spacing: { after: 100 } }),
            new Paragraph({ children: [new TextRun({ text: `Subject: ${quiz.subject || 'N/A'}`, size: 24, font: 'Calibri' })], spacing: { after: 100 } }),
            new Paragraph({ children: [new TextRun({ text: `Total Questions: ${quiz.totalQuestions}`, size: 24, font: 'Calibri' })], spacing: { after: 400 } }),
            ...quiz.items.flatMap((item: any, i: number) => [
              new Paragraph({
                children: [new TextRun({ text: `Question ${i + 1}${item.marks ? ` (${item.marks} marks)` : ''}`, size: 28, font: 'Calibri', bold: true, color: '1a1a1a' })],
                heading: 'Heading2' as any,
                alignment: AlignmentType.LEFT,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                children: [new TextRun({ text: typeof item.question === 'object' ? item.question?.text : item.question, size: 26, font: 'Calibri', color: '2c3e50' })],
                alignment: AlignmentType.LEFT,
                spacing: { after: 100 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Answer: ', size: 26, font: 'Calibri', bold: true, color: '065f46' }),
                  new TextRun({ 
                    text: (item.questionType === 'multiple' || item.questionType === 'mcqs') && item.options?.length
                      ? `${String.fromCharCode(65 + (item.answer?.value || 0))}. ${item.options[item.answer?.value]?.text || item.options[item.answer?.value] || item.answer?.value}`
                      : item.questionType === 'truefalse'
                      ? item.answer?.value ? 'True' : 'False'
                      : item.questionType === 'fillblanks'
                      ? typeof item.answer?.value === 'string'
                        ? item.answer?.value
                        : typeof item.answer?.value === 'object'
                        ? Object.entries(item.answer?.value || {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' or ') : v}`).join(', ')
                        : item.answer?.text || 'N/A'
                      : item.answer?.text || item.answer?.value || 'N/A',
                    size: 26,
                    font: 'Calibri',
                    color: '065f46'
                  })
                ],
                alignment: AlignmentType.LEFT,
                spacing: { after: 100 },
                shading: { fill: 'f0fdf4', type: ShadingType.SOLID }
              }),
              ...(item.explanation && (typeof item.explanation === 'object' ? item.explanation?.text : item.explanation) ? [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Explanation: ', size: 24, font: 'Calibri', bold: true, color: '1e40af' }),
                    new TextRun({ text: typeof item.explanation === 'object' ? item.explanation?.text : item.explanation, size: 24, font: 'Calibri', color: '1e40af' })
                  ],
                  alignment: AlignmentType.LEFT,
                  spacing: { after: 200 },
                  shading: { fill: 'dbeafe', type: ShadingType.SOLID }
                })
              ] : []),
            ]).flat(),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, `${quiz.title}_AnswerKey.docx`);
      alert('Answer Key Word document downloaded!');
    } catch (error) {
      alert('Error generating Word document: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleDeleteQuiz = async () => {
    if (!confirm(`Are you sure you want to delete this quiz? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/teacher/quizzes/${quizId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Quiz deleted successfully');
        router.push('/teacher/quizzes');
      } else {
        const errorData = await response.json();
        alert(`Error deleting quiz: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert('Error deleting quiz');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole="Teacher" currentPage="Quizzes" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userRole="Teacher" currentPage="Quizzes" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 lg:ml-64 p-4 sm:p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quiz Not Found</h3>
            <p className="text-gray-500 mb-4">The quiz you're looking for doesn't exist.</p>
            <Link href="/teacher/quizzes">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Back to Quizzes
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="Teacher" currentPage="Quizzes" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex-1">
                <Link href="/teacher/quizzes">
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-1">← Back to Quizzes</button>
                </Link>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{quiz.title}</h1>
              </div>
            </div>
            <span className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
              quiz.quizFormat === 'Online'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {quiz.quizFormat === 'Online' ? 'Online' : 'Printable'}
            </span>
            <button
              onClick={handleDeleteQuiz}
              disabled={deleting}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                deleting
                  ? 'bg-red-300 text-red-700 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          {/* Quiz Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 shadow-md">
              <div className="text-sm text-purple-100 font-medium">Questions</div>
              <div className="text-2xl font-bold text-white">{quiz.totalQuestions}</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 shadow-md">
              <div className="text-sm text-blue-100 font-medium">Total Marks</div>
              <div className="text-2xl font-bold text-white">{quiz.totalMarks}</div>
            </div>
            {quiz.quizFormat === 'Online' && (
              <>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 shadow-md">
                  <div className="text-sm text-green-100 font-medium">Attempts</div>
                  <div className="text-2xl font-bold text-white">{attempts.length}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 shadow-md">
                  <div className="text-sm text-orange-100 font-medium">Avg Score</div>
                  <div className="text-2xl font-bold text-white">
                    {attempts.length > 0 
                      ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
                      : 0}%
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Show different content based on quiz format */}
          {quiz.quizFormat === 'Offline' ? (
            // Offline Quiz: Show Questions with Answer Keys
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Quiz Questions & Answer Key</h2>
                  
                  {/* Download Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={downloadQuestionPaperPDF}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Question PDF
                    </button>
                    <button
                      onClick={downloadQuestionPaperWord}
                      className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Question Word
                    </button>
                    <button
                      onClick={downloadAnswerKeyPDF}
                      className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Answer PDF
                    </button>
                    <button
                      onClick={downloadAnswerKeyWord}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Answer Word
                    </button>
                  </div>
                </div>
                <div className="space-y-6">
                  {quiz.items?.map((item: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 flex-1">
                          Question {index + 1} <span className="text-sm text-gray-500 ml-2">({item.marks || 1} marks)</span>
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ml-2 ${
                          item.questionType === 'multiple' || item.questionType === 'mcqs'
                            ? 'bg-blue-100 text-blue-700'
                            : item.questionType === 'truefalse'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {item.questionType === 'multiple' || item.questionType === 'mcqs' ? 'MCQ' :
                           item.questionType === 'truefalse' ? 'True/False' :
                           item.questionType === 'fill' || item.questionType === 'fillblanks' ? 'Fill Blanks' : 'Other'}
                        </span>
                      </div>

                      <div className="mb-4">
                        <p className="text-gray-700">
                          {typeof item.question === 'object' ? item.question?.text : item.question}
                        </p>
                      </div>

                      {/* Show options for MCQ/True-False */}
                      {(item.questionType === 'multiple' || item.questionType === 'mcqs' || item.questionType === 'truefalse') && item.options && (
                        <div className="mb-4 pl-4 border-l-4 border-gray-300">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Options:</p>
                          <div className="space-y-1">
                            {item.options.map((option: any, optIdx: number) => (
                              <p key={optIdx} className="text-sm text-gray-600">
                                {String.fromCharCode(65 + optIdx)}. {option.text || option}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Answer Key */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <p className="text-sm font-semibold text-green-900 mb-2">✓ Answer Key:</p>
                        <p className="text-gray-700">
                          {item.questionType === 'multiple' || item.questionType === 'mcqs'
                            ? `${String.fromCharCode(65 + (item.answer?.value || 0))}. ${item.options?.[item.answer?.value]?.text || item.answer?.value}`
                            : item.questionType === 'truefalse'
                            ? item.answer?.value ? 'True' : 'False'
                            : typeof item.answer?.value === 'object'
                            ? Object.values(item.answer.value).join(', ')
                            : item.answer?.value || 'N/A'
                          }
                        </p>
                      </div>

                      {/* Explanation */}
                      {item.explanation && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm font-semibold text-blue-900 mb-2">💡 Explanation:</p>
                          <p className="text-gray-700">
                            {typeof item.explanation === 'object' ? item.explanation?.text : item.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Online Quiz: Show Student Attempts
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Student Attempts</h2>
              </div>

              {attempts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="font-medium">No students have attempted this quiz yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700">Student Name</th>
                        <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700">Score</th>
                        <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700">Percentage</th>
                        <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700">Date</th>
                        <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                        <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {attempts.map((attempt) => (
                        <tr key={attempt.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 sm:px-6 py-3 font-medium text-gray-900">{attempt.studentName}</td>
                          <td className="px-4 sm:px-6 py-3 text-gray-600">{attempt.score}/{attempt.totalMarks}</td>
                          <td className="px-4 sm:px-6 py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getScoreColor(attempt.percentage)}`}>
                              {attempt.percentage}%
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-gray-600 text-xs">{formatDate(attempt.completedAt)}</td>
                          <td className="px-4 sm:px-6 py-3">
                            {attempt.isMarked ? (
                              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Marked</span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Pending</span>
                            )}
                          </td>
                          <td className="px-4 sm:px-6 py-3">
                            <Link href={`/teacher/quizzes/${quizId}/review/${attempt.id}`}>
                              <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                                Review
                              </button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
