import { db } from '@/firebase/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, setDoc } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch OUP questions
export async function GET(request: NextRequest) {
  try {
    const subject = request.nextUrl.searchParams.get('subject');
    const grade = request.nextUrl.searchParams.get('grade');
    const book = request.nextUrl.searchParams.get('book');
    const chapter = request.nextUrl.searchParams.get('chapter');
    const difficulty = request.nextUrl.searchParams.get('difficulty');

    const questionsRef = collection(db, 'questions', 'oup', 'items');
    const snapshot = await getDocs(questionsRef);

    let questions: any[] = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        source: 'oup',
        ...data,
        // Ensure imageUrl is explicitly included
        imageUrl: data.imageUrl || undefined
      };
    });
    
    // Log sample question with image for debugging
    const questionsWithImages = questions.filter(q => q.imageUrl);
    if (questionsWithImages.length > 0) {
      console.log('[OUP-API] Questions with images:', questionsWithImages.length, 'Sample:', {
        id: questionsWithImages[0].id,
        imageUrl: questionsWithImages[0].imageUrl
      });
    }

    // Apply filters
    if (subject) questions = questions.filter(q => q.subject === subject);
    if (grade) questions = questions.filter(q => q.grade === `Grade ${grade}`);
    if (book) questions = questions.filter(q => q.book === book);
    if (chapter) questions = questions.filter(q => q.chapter === chapter);
    if (difficulty) questions = questions.filter(q => q.difficulty === difficulty);

    return NextResponse.json({
      success: true,
      questions,
      total: questions.length
    });
  } catch (error) {
    console.error('Error fetching OUP questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

// POST - Add new OUP question (OUP creators only)
export async function POST(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');
    const userName = request.headers.get('x-user-name');

    // Only OUP creators, content creators, and admins can add
    if (userRole !== 'oup-creator' && userRole !== 'content_creator' && userRole !== 'oup-admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Only OUP creators can add questions' },
        { status: 403 }
      );
    }

    const body = await request.json();

    console.log("[OUP-Creator] Received request body:", {
      questionText: body.questionText,
      question: body.question,
      type: body.type,
      hasOptions: !!body.options,
      optionsLength: (body.options || []).length,
      optionsContent: body.options,
      allFields: Object.keys(body),
      keys: Object.keys(body)
    });

    // Normalize grade to always have "Grade " prefix for consistent matching
    let normalizedGrade = body.grade || "";
    if (normalizedGrade && !normalizedGrade.toLowerCase().startsWith('grade ') && !normalizedGrade.toLowerCase().startsWith('class ')) {
      normalizedGrade = `Grade ${normalizedGrade}`;
    }

    // Normalize difficulty
    let normalizedDifficulty = body.difficulty || "Medium";
    if (normalizedDifficulty && !["Easy", "Medium", "Hard"].includes(normalizedDifficulty)) {
      const difficultyMap: { [key: string]: string } = {
        EASY: "Easy",
        MEDIUM: "Medium",
        HARD: "Hard",
        easy: "Easy",
        medium: "Medium",
        hard: "Hard",
      };
      normalizedDifficulty = difficultyMap[normalizedDifficulty] || "Medium";
    }

    // Normalize type to standard format
    let normalizedType = body.type || "";
    const typeMap: { [key: string]: string } = {
      MCQ: "multiple",
      mcq: "multiple",
      multiple: "multiple",
      MULTIPLE: "multiple",
      TRUE_FALSE: "truefalse",
      true_false: "truefalse",
      truefalse: "truefalse",
      TRUEFALSE: "truefalse",
      SHORT_ANSWER: "short",
      short_answer: "short",
      short: "short",
      SHORT: "short",
      LONG_ANSWER: "long",
      long_answer: "long",
      long: "long",
      LONG: "long",
      FILL_IN_THE_BLANK: "fillblanks",
      fill_in_the_blank: "fillblanks",
      fillblanks: "fillblanks",
      FILLBLANKS: "fillblanks",
    };
    normalizedType = typeMap[normalizedType] || normalizedType;

    // All questions go directly to question bank (approval queue removed)
    const targetCollection = collection(db, 'questions', 'oup', 'items');
    const questionData = {
      questionText: body.questionText || body.question || "",
      type: normalizedType,
      subject: body.subject || "",
      grade: normalizedGrade,
      book: body.book || "",
      chapter: body.chapter || "",
      topic: body.topic || "",
      slo: body.slo || "",
      difficulty: normalizedDifficulty,
      explanation: body.explanation || "",
      options: normalizedType === "multiple" ? (Array.isArray(body.options) ? body.options : []) : [],
      correctAnswer: body.correctAnswer || "",
      blanks: normalizedType === "fillblanks" ? (body.blanks || {}) : {},
      cognitiveLevel: body.cognitiveLevel || {
        knowledge: false,
        understanding: false,
        application: false
      },
      createdBy: userId || "",
      createdByName: userName || "Unknown User",
      createdAt: new Date(),
      updatedBy: userId || "",
      updatedAt: new Date(),
      ...(body.imageUrl && { imageUrl: body.imageUrl }),
      ...(body.isInteractiveQuestion && body.interactiveData && { 
        isInteractive: true,
        interactiveData: body.interactiveData 
      })
    };

    const docRef = await addDoc(targetCollection, questionData);

    // Log for debugging
    console.log(`[OUP-Creator] Question stored:`, {
      id: docRef.id,
      type: normalizedType,
      questionText: questionData.question,
      questionField: !!questionData.question,
      hasOptions: normalizedType === "multiple" && (questionData.options || []).length > 0,
      optionsLength: (questionData.options || []).length,
      storedFields: Object.keys(questionData)
    });

    // Update OUP stats
    await updateOUPStats(body.subject, body.grade, body.type, body.difficulty);

    return NextResponse.json({
      success: true,
      questionId: docRef.id,
      message: 'Question added successfully',
      needsApproval: false
    });
  } catch (error) {
    console.error('Error adding OUP question:', error);
    return NextResponse.json({ error: 'Failed to add question' }, { status: 500 });
  }
}

async function updateOUPStats(subject: string, grade: string, type: string, difficulty: string) {
  try {
    const statsRef = doc(db, 'question-bank-stats', 'oup');
    
    const statsDoc = await getDocs(collection(db, 'questions', 'oup', 'items'));
    
    const stats: any = {
      totalQuestions: statsDoc.size,
      questionsBySubject: {},
      questionsByGrade: {},
      questionsByDifficulty: {},
      questionsByType: {},
      lastUpdated: new Date()
    };

    // Calculate stats
    statsDoc.docs.forEach(doc => {
      const q: any = doc.data();
      stats.questionsBySubject[q.subject] = (stats.questionsBySubject[q.subject] || 0) + 1;
      stats.questionsByGrade[q.grade] = (stats.questionsByGrade[q.grade] || 0) + 1;
      stats.questionsByDifficulty[q.difficulty] = (stats.questionsByDifficulty[q.difficulty] || 0) + 1;
      stats.questionsByType[q.type] = (stats.questionsByType[q.type] || 0) + 1;
    });

    // Use setDoc with merge: true to create or update the document
    await setDoc(statsRef, stats, { merge: true });
  } catch (error) {
    console.error('Error updating OUP stats:', error);
  }
}
