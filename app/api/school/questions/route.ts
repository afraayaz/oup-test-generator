import { db } from '@/firebase/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch school questions
export async function GET(request: NextRequest) {
  try {
    const schoolId = request.headers.get('x-school-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    // Teachers and school admins can access their school's QB
    if (userRole !== 'teacher' && userRole !== 'school-admin' && userRole !== 'oup-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const subject = request.nextUrl.searchParams.get('subject');
    const grade = request.nextUrl.searchParams.get('grade');
    const book = request.nextUrl.searchParams.get('book');
    const chapter = request.nextUrl.searchParams.get('chapter');
    const difficulty = request.nextUrl.searchParams.get('difficulty');

    const questionsRef = collection(db, `questions/schools/${schoolId}`);
    const snapshot = await getDocs(questionsRef);

    let questions = snapshot.docs.map(doc => ({
      id: doc.id,
      source: 'school',
      ...doc.data()
    })) as any[];

    // Apply filters
    if (subject) questions = questions.filter((q: any) => q.subject === subject);
    if (grade) questions = questions.filter((q: any) => q.grade === `Grade ${grade}`);
    if (book) questions = questions.filter((q: any) => q.book === book);
    if (chapter) questions = questions.filter((q: any) => q.chapter === chapter);
    if (difficulty) questions = questions.filter((q: any) => q.difficulty === difficulty);

    return NextResponse.json({
      success: true,
      questions,
      total: questions.length
    });
  } catch (error) {
    console.error('Error fetching school questions:', error);
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

// POST - Add new school question (Teachers only for their subjects/grades)
export async function POST(request: NextRequest) {
  try {
    const schoolId = request.headers.get('x-school-id');
    const userId = request.headers.get('x-user-id');
    const userName = request.headers.get('x-user-name');
    const userRole = request.headers.get('x-user-role');
    const userSubjects = request.headers.get('x-user-subjects');
    const userGrades = request.headers.get('x-user-grades');

    if (userRole !== 'teacher' && userRole !== 'school-admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Only teachers and school admins can add questions' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Teachers can only add for their assigned subjects/grades
    if (userRole === 'teacher') {
      const subjects = userSubjects?.split(',') || [];
      const grades = userGrades?.split(',') || [];
      
      if (!subjects.includes(body.subject)) {
        return NextResponse.json(
          { error: 'You can only add questions for your assigned subjects' },
          { status: 403 }
        );
      }

      if (!grades.includes(body.grade)) {
        return NextResponse.json(
          { error: 'You can only add questions for your assigned grades' },
          { status: 403 }
        );
      }
    }

    const questionsRef = collection(db, `questions/schools/${schoolId}`);

    const newQuestion = {
      ...body,
      schoolId,
      createdBy: userId,
      createdByName: userName,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: userId
    };

    const docRef = await addDoc(questionsRef, newQuestion);

    // Update school QB stats - provide fallback empty strings for nulls
    const subject = (body.subject as string) || '';
    const grade = (body.grade as string) || '';
    const type = (body.type as string) || '';
    const difficulty = (body.difficulty as string) || '';
    await updateSchoolStats(schoolId as string, subject, grade, type, difficulty);

    return NextResponse.json({
      success: true,
      questionId: docRef.id,
      message: 'Question added to school question bank successfully'
    });
  } catch (error) {
    console.error('Error adding school question:', error);
    return NextResponse.json({ error: 'Failed to add question' }, { status: 500 });
  }
}

async function updateSchoolStats(schoolId: string, subject: string, grade: string, type: string, difficulty: string) {
  try {
    const statsRef = doc(db, `question-bank-stats/schools/${schoolId}`);
    
    const questionsRef = collection(db, `questions/schools/${schoolId}`);
    const questionsSnapshot = await getDocs(questionsRef);
    
    const stats: Record<string, any> = {
      totalQuestions: questionsSnapshot.size,
      questionsBySubject: {} as Record<string, number>,
      questionsByGrade: {} as Record<string, number>,
      questionsByDifficulty: {} as Record<string, number>,
      questionsByType: {} as Record<string, number>,
      lastUpdated: new Date()
    };

    // Calculate stats
    questionsSnapshot.docs.forEach(doc => {
      const q = doc.data() as any;
      stats.questionsBySubject[q.subject] = (stats.questionsBySubject[q.subject] || 0) + 1;
      stats.questionsByGrade[q.grade] = (stats.questionsByGrade[q.grade] || 0) + 1;
      stats.questionsByDifficulty[q.difficulty] = (stats.questionsByDifficulty[q.difficulty] || 0) + 1;
      stats.questionsByType[q.type] = (stats.questionsByType[q.type] || 0) + 1;
    });

    const statsDoc = await getDoc(statsRef);
    if (statsDoc.exists()) {
      await updateDoc(statsRef, stats);
    } else {
      await addDoc(collection(db, `question-bank-stats/schools`), {
        schoolId,
        ...stats
      });
    }
  } catch (error) {
    console.error('Error updating school stats:', error);
  }
}
