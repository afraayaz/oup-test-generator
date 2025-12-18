import { db } from '@/firebase/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const { schoolId } = await params;
    const userRole = request.headers.get('x-user-role');
    const userSchoolId = request.headers.get('x-school-id');

    // OUP admin can view any school, teachers/admins can only view their own
    if (userRole === 'oup-admin') {
      // Allow access
    } else if (userRole === 'school-admin' || userRole === 'teacher') {
      if (userSchoolId !== schoolId) {
        return NextResponse.json(
          { error: 'Unauthorized: Can only view your own school QB' },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const subject = request.nextUrl.searchParams.get('subject');
    const grade = request.nextUrl.searchParams.get('grade');
    const difficulty = request.nextUrl.searchParams.get('difficulty');
    const type = request.nextUrl.searchParams.get('type');

    const questionsRef = collection(db, `questions/schools/${schoolId}`);
    const snapshot = await getDocs(questionsRef);

    let questions: any[] = snapshot.docs.map(doc => ({
      id: doc.id,
      source: 'school',
      ...doc.data()
    }));

    // Apply filters
    if (subject && subject !== 'all') questions = questions.filter(q => q.subject === subject);
    if (grade && grade !== 'all') questions = questions.filter(q => q.grade === `Grade ${grade}`);
    if (difficulty && difficulty !== 'all') questions = questions.filter(q => q.difficulty === difficulty);
    if (type && type !== 'all') questions = questions.filter(q => q.type === type);

    return NextResponse.json({
      success: true,
      schoolId: schoolId,
      questions,
      total: questions.length
    });
  } catch (error) {
    console.error('Error fetching school questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}
