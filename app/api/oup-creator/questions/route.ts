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

    let questions: any[] = snapshot.docs.map(doc => ({
      id: doc.id,
      source: 'oup',
      ...doc.data()
    }));

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

    const questionsRef = collection(db, 'questions', 'oup', 'items');

    const newQuestion = {
      ...body,
      createdBy: userId,
      createdByName: userName,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: userId
    };

    const docRef = await addDoc(questionsRef, newQuestion);

    // Update OUP stats
    await updateOUPStats(body.subject, body.grade, body.type, body.difficulty);

    return NextResponse.json({
      success: true,
      questionId: docRef.id,
      message: 'OUP question added successfully'
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
