import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { app } from '@/firebase/firebase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string; attemptId: string }> }
) {
  try {
    const { quizId, attemptId } = await params;

    if (!quizId || !attemptId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const db = getFirestore(app);

    // Fetch the attempt
    const attemptRef = doc(db, 'quizAttempts', attemptId);
    const attemptSnap = await getDoc(attemptRef);

    if (!attemptSnap.exists()) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    const attempt = attemptSnap.data();

    if (attempt.quizId !== quizId) {
      return NextResponse.json({ error: 'Attempt does not match quiz' }, { status: 400 });
    }

    // Fetch the quiz
    const quizRef = doc(db, 'quizzes', quizId);
    const quizSnap = await getDoc(quizRef);

    if (!quizSnap.exists()) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const quiz = quizSnap.data();

    // Map questions with student answers
    const questions = attempt.questionResults?.map((result: any) => ({
      questionId: result.questionId || '',
      questionType: result.questionType || 'Multiple Choice',
      questionText: result.questionText || 'Question text not available',
      userAnswer: result.userAnswer || result.answer || '',
      correctAnswer: result.correctAnswer || result.answer || '',
      isCorrect: result.isCorrect || result.status === 'Correct',
      marks: result.marks || 0,
      manualMarks: result.manualMarks,
      status: result.status || 'Not Attempted',
      explanation: result.explanation || ''
    })) || [];

    return NextResponse.json({
      attemptId,
      quizId,
      quizTitle: quiz.title || 'Untitled Quiz',
      studentName: attempt.studentName || 'Unknown Student',
      originalScore: attempt.score || 0,
      totalMarks: attempt.totalMarks || 0,
      originalPercentage: attempt.percentage || 0,
      questions
    });
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string; attemptId: string }> }
) {
  try {
    const { quizId, attemptId } = await params;
    const body = await request.json();
    const { manualMarks, studentName } = body;

    if (!quizId || !attemptId || !manualMarks) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const db = getFirestore(app);

    // Fetch the current attempt
    const attemptRef = doc(db, 'quizAttempts', attemptId);
    const attemptSnap = await getDoc(attemptRef);

    if (!attemptSnap.exists()) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    const attempt = attemptSnap.data();
    const questions = attempt.questionResults || [];

    // Calculate new score with manual marks
    let newScore = 0;
    const updatedQuestions = questions.map((q: any, idx: number) => {
      const question = { ...q };
      if (idx in manualMarks) {
        question.manualMarks = manualMarks[idx];
        question.isCorrect = manualMarks[idx] > 0;
        newScore += manualMarks[idx];
      } else if (q.isCorrect) {
        newScore += q.marks || 0;
      }
      return question;
    });

    const totalMarks = attempt.totalMarks || 0;
    const newPercentage = totalMarks > 0 ? Math.round((newScore / totalMarks) * 100) : 0;

    // Update the attempt
    const updateData = {
      score: newScore,
      percentage: newPercentage,
      questionResults: updatedQuestions,
      hasManualGrades: true,
      lastGradedAt: new Date().toISOString(),
      gradedBy: 'teacher'
    };

    // Using updateDoc to preserve other fields
    await updateDoc(attemptRef, updateData);

    // Also update the student's quiz attempt in the assignments collection (if exists)
    try {
      const assignmentQuery = query(
        collection(db, 'quizAssignments'),
        where('quizId', '==', quizId),
        where('studentId', '==', attempt.studentId)
      );
      const assignmentSnaps = await getDocs(assignmentQuery);
      if (assignmentSnaps.size > 0) {
        const assignmentDoc = assignmentSnaps.docs[0];
        await updateDoc(assignmentDoc.ref, {
          score: newScore,
          percentage: newPercentage,
          isMarked: true
        });
      }
    } catch (e) {
      console.log('Assignment update skipped:', e);
    }

    // Map questions with updated data for response
    const updatedReviewQuestions = updatedQuestions.map((q: any) => ({
      questionId: q.questionId || '',
      questionType: q.questionType || 'Multiple Choice',
      questionText: q.questionText || 'Question text not available',
      userAnswer: q.userAnswer || q.answer || '',
      correctAnswer: q.correctAnswer || q.answer || '',
      isCorrect: q.isCorrect || q.status === 'Correct',
      marks: q.marks || 0,
      manualMarks: q.manualMarks,
      status: q.status || 'Not Attempted',
      explanation: q.explanation || ''
    }));

    return NextResponse.json({
      success: true,
      updated: {
        attemptId,
        quizId,
        quizTitle: attempt.quizTitle || 'Untitled Quiz',
        studentName: attempt.studentName || 'Unknown Student',
        originalScore: attempt.score,
        newScore,
        totalMarks,
        originalPercentage: attempt.percentage,
        newPercentage,
        questions: updatedReviewQuestions
      }
    });
  } catch (error) {
    console.error('Error updating grades:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
