import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Missing studentId parameter' },
        { status: 400 }
      );
    }

    // Query quizAssignments collection for this student
    const assignmentsRef = collection(db, 'quizAssignments');
    const q = query(assignmentsRef, where('studentId', '==', studentId));

    const snapshot = await getDocs(q);
    
    // Fetch full quiz data for each assignment
    const assignments = await Promise.all(
      snapshot.docs.map(async (assignmentDoc) => {
        const assignmentData = assignmentDoc.data();
        
        // Check if student has attempted this quiz
        let attemptCount = 0;
        try {
          const attemptsRef = collection(db, 'quizAttempts');
          const attemptsQuery = query(attemptsRef, where('quizId', '==', assignmentData.quizId), where('studentId', '==', studentId));
          const attemptsSnapshot = await getDocs(attemptsQuery);
          attemptCount = attemptsSnapshot.docs.length;
        } catch (error) {
        }
        
        // Fetch the actual quiz document by ID
        try {
          const quizDocRef = doc(db, 'quizzes', assignmentData.quizId);
          const quizDocSnapshot = await getDoc(quizDocRef);
          
          if (quizDocSnapshot.exists()) {
            const quizData = quizDocSnapshot.data();
            return {
              id: assignmentData.quizId,
              title: quizData.title || assignmentData.quizTitle,
              quizType: quizData.quizType || '',
              quizFormat: quizData.quizFormat || 'Online',
              class: quizData.class || '',
              subject: quizData.subject || '',
              book: quizData.book || '',
              chapters: quizData.chapters || [],
              isMarked: quizData.isMarked || false,
              timeLimitMinutes: quizData.timeLimitMinutes || 0,
              schedule: quizData.schedule || { startAt: null, endAt: null },
              totalQuestions: quizData.totalQuestions || 0,
              totalMarks: quizData.totalMarks || 0,
              status: quizData.status || 'draft',
              createdAt: quizData.createdAt || null,
              assignmentStatus: assignmentData.status,
              assignedAt: assignmentData.assignedAt,
              hasAttempted: attemptCount > 0,
              attemptCount,
            };
          } else {
            // Fallback to assignment data if quiz not found
            return {
              id: assignmentData.quizId,
              title: assignmentData.quizTitle,
              quizType: '',
              quizFormat: 'Online',
              class: '',
              subject: '',
              book: '',
              chapters: [],
              isMarked: false,
              timeLimitMinutes: 0,
              schedule: { startAt: null, endAt: null },
              totalQuestions: 0,
              totalMarks: 0,
              status: 'draft',
              createdAt: null,
              assignmentStatus: assignmentData.status,
              assignedAt: assignmentData.assignedAt,
              hasAttempted: attemptCount > 0,
              attemptCount,
            };
          }
        } catch (quizError) {
          return {
            id: assignmentData.quizId,
            title: assignmentData.quizTitle,
            quizType: '',
            quizFormat: 'Online',
            class: '',
            subject: '',
            book: '',
            chapters: [],
            isMarked: false,
            timeLimitMinutes: 0,
            schedule: { startAt: null, endAt: null },
            totalQuestions: 0,
            totalMarks: 0,
            status: 'draft',
            createdAt: null,
            assignmentStatus: assignmentData.status,
            assignedAt: assignmentData.assignedAt,
            hasAttempted: attemptCount > 0,
            attemptCount,
          };
        }
      })
    );

    return NextResponse.json({ assignments }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch assigned quizzes' },
      { status: 500 }
    );
  }
}
