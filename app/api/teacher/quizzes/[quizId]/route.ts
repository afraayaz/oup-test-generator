import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/firebase';
import { doc, getDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;

    // Fetch quiz details
    const quizRef = doc(db, 'quizzes', quizId);
    const quizDoc = await getDoc(quizRef);

    if (!quizDoc.exists()) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    const quizData = quizDoc.data();

    // Fetch all attempts for this quiz
    const attemptsRef = collection(db, 'quizAttempts');
    const q = query(attemptsRef, where('quizId', '==', quizId));
    const attemptsSnapshot = await getDocs(q);

    const attempts = await Promise.all(
      attemptsSnapshot.docs.map(async (docSnap) => {
        let studentName = docSnap.data().studentName || 'Unknown';
        
        // If studentName is still 'Unknown' or missing, try to fetch from users collection
        if (studentName === 'Unknown' && docSnap.data().studentId) {
          try {
            const userRef = doc(db, 'users', docSnap.data().studentId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              studentName = userData?.displayName || userData?.name || 'Unknown';
            }
          } catch (error) {
            console.log('Error fetching student from users collection:', error);
          }
        }

        return {
          id: docSnap.id,
          studentId: docSnap.data().studentId || '',
          studentName: studentName,
          score: docSnap.data().score || 0,
          totalMarks: docSnap.data().totalMarks || 0,
          percentage: docSnap.data().percentage || 0,
          completedAt: docSnap.data().completedAt || null,
          isMarked: docSnap.data().isMarked || false,
          hasManualGrades: docSnap.data().hasManualGrades || false,
        };
      })
    );

    return NextResponse.json(
      {
        quiz: {
          id: quizId,
          title: quizData.title || 'Untitled',
          quizFormat: quizData.quizFormat || 'Online',
          subject: quizData.subject || '',
          class: quizData.class || '',
          totalQuestions: quizData.totalQuestions || 0,
          totalMarks: quizData.totalMarks || 0,
          createdAt: quizData.createdAt || null,
          items: quizData.items || [],
        },
        attempts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching quiz details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz details' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;

    if (!quizId) {
      return NextResponse.json({ error: 'Missing quiz ID' }, { status: 400 });
    }

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
