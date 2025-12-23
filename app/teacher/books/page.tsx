import BooksClient from './BooksClient';

const PROJECT_ID = 'quiz-app-ff0ab';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/questions`;

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number | string;
  booleanValue?: boolean;
  timestampValue?: string;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
  nullValue?: null;
}

function parseFirestoreValue(value: FirestoreValue): any {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue, 10);
  if (value.doubleValue !== undefined) return typeof value.doubleValue === 'string' ? parseFloat(value.doubleValue) : value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== undefined) return null;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.arrayValue !== undefined) {
    return (value.arrayValue.values || []).map(parseFirestoreValue);
  }
  if (value.mapValue !== undefined) {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value.mapValue.fields || {})) {
      result[key] = parseFirestoreValue(val);
    }
    return result;
  }
  return null;
}

interface ChapterData {
  name: string;
  slos: Set<string>;
  questionCount: number;
}

interface BookData {
  title: string;
  subject: string;
  grade: string;
  chapters: Map<string, ChapterData>;
  totalQuestions: number;
}

async function fetchBooksData() {
  try {
    const response = await fetch(`${FIRESTORE_URL}?pageSize=1000`, { 
      cache: 'no-store',
      next: { revalidate: 0 }
    });
    
    if (!response.ok) {
      return { books: [], error: `Failed to fetch: ${response.status}` };
    }
    
    const data = await response.json();
    
    if (!data.documents) {
      return { books: [], error: null };
    }
    
    const booksMap = new Map<string, BookData>();
    
    for (const doc of data.documents) {
      const fields = doc.fields || {};
      
      let grade = parseFirestoreValue(fields.grade || fields.class || {}) || '';
      const subject = parseFirestoreValue(fields.subject || {}) || '';
      const book = parseFirestoreValue(fields.book || {}) || '';
      const chapter = parseFirestoreValue(fields.chapter || {}) || '';
      const slo = parseFirestoreValue(fields.slo || {}) || '';
      
      if (!grade || !subject || !book) continue;
      
      // Normalize grade - ensure it's just the number without "Grade " prefix
      grade = grade.toString().replace('Grade ', '').trim();
      
      const bookKey = `${grade.toLowerCase()}-${subject.toLowerCase()}-${book.toLowerCase()}`;
      
      if (!booksMap.has(bookKey)) {
        booksMap.set(bookKey, {
          title: book,
          subject: subject,
          grade: grade.toString(),
          chapters: new Map(),
          totalQuestions: 0
        });
      }
      
      const bookData = booksMap.get(bookKey)!;
      bookData.totalQuestions++;
      
      if (chapter) {
        const chapterKey = chapter.toLowerCase();
        if (!bookData.chapters.has(chapterKey)) {
          bookData.chapters.set(chapterKey, {
            name: chapter,
            slos: new Set(),
            questionCount: 0
          });
        }
        
        const chapterData = bookData.chapters.get(chapterKey)!;
        chapterData.questionCount++;
        
        if (slo) {
          chapterData.slos.add(slo);
        }
      }
    }
    
    const books = Array.from(booksMap.values()).map((book, index) => ({
      id: index + 1,
      title: book.title,
      subject: book.subject,
      grade: `Grade ${book.grade}`,
      gradeNumber: book.grade,
      totalChapters: book.chapters.size,
      totalQuestions: book.totalQuestions,
      status: 'Active',
      chapters: Array.from(book.chapters.values()).map((chapter, chapterIndex) => ({
        id: chapterIndex + 1,
        title: chapter.name,
        slosCount: chapter.slos.size,
        slos: Array.from(chapter.slos),
        questions: chapter.questionCount
      }))
    }));
    
    books.sort((a, b) => {
      const gradeCompare = parseInt(a.gradeNumber) - parseInt(b.gradeNumber);
      if (gradeCompare !== 0) return gradeCompare;
      return a.subject.localeCompare(b.subject);
    });
    
    return { books, error: null };
  } catch (error: any) {
    console.error('Error fetching books data:', error);
    return { books: [], error: error.message || 'Failed to fetch books data' };
  }
}

export default async function BooksPage() {
  const { books, error } = await fetchBooksData();
  return <BooksClient books={books} error={error} />;
}
