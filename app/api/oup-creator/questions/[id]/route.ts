import { db } from '@/firebase/firebase';
import { doc, updateDoc, getDoc, deleteDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

// PUT - Update OUP question
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: questionId } = await params;
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');

    // Only content creators can update their own questions
    if (userRole !== 'oup-creator' && userRole !== 'content_creator' && userRole !== 'oup-admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Only content creators can update questions' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Verify the question exists and belongs to the user (unless admin)
    const questionRef = doc(db, 'questions/oup/items', questionId);
    const questionDoc = await getDoc(questionRef);

    if (!questionDoc.exists()) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Check ownership (unless admin)
    if (userRole !== 'oup-admin' && questionDoc.data().createdBy !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only update your own questions' },
        { status: 403 }
      );
    }

    // Update the question
    const updateData = {
      ...body,
      updatedAt: new Date(),
      updatedBy: userId
    };

    await updateDoc(questionRef, updateData);

    return NextResponse.json({
      success: true,
      questionId: questionId,
      message: 'Question updated successfully'
    });
  } catch (error) {
    console.error('Error updating OUP question:', error);
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}

// DELETE - Delete OUP question
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: questionId } = await params;
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');

    if (userRole !== 'oup-creator' && userRole !== 'content_creator' && userRole !== 'oup-admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Verify ownership
    const questionRef = doc(db, 'questions', 'oup', 'items', questionId);
    const questionDoc = await getDoc(questionRef);

    if (!questionDoc.exists()) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    if (userRole !== 'oup-admin' && questionDoc.data().createdBy !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only delete your own questions' },
        { status: 403 }
      );
    }

    // Delete the question
    await deleteDoc(questionRef);

    // Recalculate and update OUP stats
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

      statsDoc.docs.forEach((doc: any) => {
        const q = doc.data();
        stats.questionsBySubject[q.subject] = (stats.questionsBySubject[q.subject] || 0) + 1;
        stats.questionsByGrade[q.grade] = (stats.questionsByGrade[q.grade] || 0) + 1;
        stats.questionsByDifficulty[q.difficulty] = (stats.questionsByDifficulty[q.difficulty] || 0) + 1;
        stats.questionsByType[q.type] = (stats.questionsByType[q.type] || 0) + 1;
      });

      await setDoc(statsRef, stats, { merge: true });
    } catch (statsError) {
      console.error("❌ Error updating OUP stats after deletion:", statsError);
    }

    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting OUP question:', error);
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}
