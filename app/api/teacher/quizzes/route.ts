import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Missing teacherId parameter' },
        { status: 400 }
      );
    }

    // Fetch quizzes created by this teacher
    const quizzesRef = collection(db, 'quizzes');
    const q = query(quizzesRef, where('createdBy', '==', teacherId));
    const querySnapshot = await getDocs(q);

    const quizzes = await Promise.all(
      querySnapshot.docs.map(async (doc) => {
        const quizData = doc.data();
        
        // Get student attempts for this quiz
        let studentAttempts = 0;
        try {
          const attemptsRef = collection(db, 'quizAttempts');
          const attemptsQuery = query(attemptsRef, where('quizId', '==', doc.id));
          const attemptsSnapshot = await getDocs(attemptsQuery);
          studentAttempts = attemptsSnapshot.docs.length;
        } catch (error) {
          console.log('Error fetching attempts:', error);
        }

        // Get quiz assignments count for online quizzes
        let totalAssignments = 0;
        if (quizData.quizFormat === 'Online') {
          try {
            const assignmentsRef = collection(db, 'quizAssignments');
            const assignmentsQuery = query(assignmentsRef, where('quizId', '==', doc.id));
            const assignmentsSnapshot = await getDocs(assignmentsQuery);
            totalAssignments = assignmentsSnapshot.docs.length;
          } catch (error) {
            console.log('Error fetching assignments:', error);
          }
        }

        return {
          id: doc.id,
          title: quizData.title || 'Untitled',
          quizFormat: quizData.quizFormat || 'Online',
          subject: quizData.subject || '',
          class: quizData.class || '',
          totalQuestions: quizData.totalQuestions || 0,
          totalMarks: quizData.totalMarks || 0,
          createdAt: quizData.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          studentAttempts,
          totalAssignments,
        };
      })
    );

    // Sort by creation date (newest first)
    quizzes.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ quizzes }, { status: 200 });
  } catch (error) {
    console.error('Error fetching teacher quizzes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quizzes' },
      { status: 500 }
    );
  }
}
