import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quizId, studentIds, quizTitle, quizData, isMarked = false, timeLimitMinutes, schedule } = body;

    console.log('[ASSIGN-QUIZ] Assigning quiz:', { quizId, studentCount: studentIds?.length, quizTitle, isMarked, timeLimitMinutes, schedule });

    if (!quizId || !studentIds || studentIds.length === 0) {
      console.error('[ASSIGN-QUIZ] Missing required data:', { quizId: !!quizId, studentIds: !!studentIds, studentCount: studentIds?.length });
      return NextResponse.json(
        { error: 'Missing quizId or studentIds' },
        { status: 400 }
      );
    }

    // Create assignment records for each student
    const assignmentsRef = collection(db, 'quizAssignments');
    const assignmentPromises = studentIds.map((studentId: string) => {
      console.log(`[ASSIGN-QUIZ] Creating assignment for student:`, { quizId, studentId, quizTitle, isMarked, timeLimitMinutes });
      return addDoc(assignmentsRef, {
        quizId,
        studentId,
        quizTitle,
        isMarked, // Teacher decides if this quiz should be marked (no retakes allowed)
        timeLimitMinutes: timeLimitMinutes || 30,
        schedule: schedule || null,
        assignedAt: serverTimestamp(),
        status: 'assigned',
        startedAt: null,
        completedAt: null,
        score: null,
      });
    });

    const results = await Promise.all(assignmentPromises);
    console.log('[ASSIGN-QUIZ] Assignment records created successfully:', results.length);

    return NextResponse.json(
      { 
        success: true,
        message: `Quiz assigned to ${studentIds.length} student(s)`,
        assignmentCount: studentIds.length
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[ASSIGN-QUIZ] Error assigning quiz:', error);
    return NextResponse.json(
      { error: 'Failed to assign quiz to students' },
      { status: 500 }
    );
  }
}
