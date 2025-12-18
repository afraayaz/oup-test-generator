import { db } from '@/firebase/firebase';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ questionId: string }>;
}

// PUT - Update school question (only own questions)
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { questionId } = await params;
    const schoolId = request.headers.get('x-school-id');
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'teacher' && userRole !== 'school-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const questionRef = doc(db, `questions/schools/${schoolId}`, questionId);
    const questionSnap = await getDoc(questionRef);

    if (!questionSnap.exists()) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Teachers can only edit their own questions
    if (userRole === 'teacher' && questionSnap.data().createdBy !== userId) {
      return NextResponse.json(
        { error: 'You can only edit your own questions' },
        { status: 403 }
      );
    }

    const body = await request.json();

    await updateDoc(questionRef, {
      ...body,
      updatedAt: new Date(),
      updatedBy: userId
    });

    return NextResponse.json({
      success: true,
      message: 'Question updated successfully'
    });
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}

// DELETE - Delete school question (only own questions)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { questionId } = await params;
    const schoolId = request.headers.get('x-school-id');
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'teacher' && userRole !== 'school-admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const questionRef = doc(db, `questions/schools/${schoolId}`, questionId);
    const questionSnap = await getDoc(questionRef);

    if (!questionSnap.exists()) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Teachers can only delete their own questions
    if (userRole === 'teacher' && questionSnap.data().createdBy !== userId) {
      return NextResponse.json(
        { error: 'You can only delete your own questions' },
        { status: 403 }
      );
    }

    await deleteDoc(questionRef);

    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}
