import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, doc, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '@/firebase/firebase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;

    if (!quizId) {
      return NextResponse.json({ error: 'Missing quiz ID' }, { status: 400 });
    }

    const db = getFirestore(app);

    // Fetch the quiz to verify it exists
    const quizRef = doc(db, 'quizzes', quizId);
    const quizSnap = await getDoc(quizRef);

    if (!quizSnap.exists()) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Delete all quiz attempts related to this quiz
    try {
      const attemptsQuery = query(
        collection(db, 'quizAttempts'),
        where('quizId', '==', quizId)
      );
      const attemptsSnap = await getDocs(attemptsQuery);
      
      for (const attemptDoc of attemptsSnap.docs) {
        await deleteDoc(attemptDoc.ref);
      }
    } catch (error) {
      console.log('Error deleting quiz attempts:', error);
    }

    // Delete all quiz assignments related to this quiz
    try {
      const assignmentsQuery = query(
        collection(db, 'quizAssignments'),
        where('quizId', '==', quizId)
      );
      const assignmentsSnap = await getDocs(assignmentsQuery);
      
      for (const assignmentDoc of assignmentsSnap.docs) {
        await deleteDoc(assignmentDoc.ref);
      }
    } catch (error) {
      console.log('Error deleting quiz assignments:', error);
    }

    // Delete the quiz itself
    await deleteDoc(quizRef);

    return NextResponse.json({
      success: true,
      message: 'Quiz deleted successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
