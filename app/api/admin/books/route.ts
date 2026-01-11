import { NextRequest, NextResponse } from 'next/server';
import { db, withQuotaFallback, isQuotaError } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check if Firebase is properly initialized
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { subjectId, title, grade, description, chapters } = body;

    if (!subjectId || !title || !grade) {
      return NextResponse.json(
        { error: 'Subject ID, title, and grade are required' },
        { status: 400 }
      );
    }

    const bookData = {
      title,
      grade,
      description: description || '',
      chapters: chapters || 0,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('subjects').doc(subjectId).collection('books').add(bookData);

    return NextResponse.json({ book: { id: docRef.id, ...bookData } });
  } catch (error) {
    console.error('Error creating book:', error);
    return NextResponse.json(
      { error: 'Failed to create book' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { subjectId, bookId, title, grade, description, chapters } = body;

    if (!subjectId || !bookId || !title || !grade) {
      return NextResponse.json(
        { error: 'Subject ID, book ID, title, and grade are required' },
        { status: 400 }
      );
    }

    const bookData = {
      title,
      grade,
      description: description || '',
      chapters: chapters || 0,
      updatedAt: new Date().toISOString()
    };

    await db.collection('subjects').doc(subjectId).collection('books').doc(bookId).update(bookData);

    return NextResponse.json({ book: { id: bookId, ...bookData } });
  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json(
      { error: 'Failed to update book' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const bookId = searchParams.get('bookId');

    if (!subjectId || !bookId) {
      return NextResponse.json(
        { error: 'Subject ID and Book ID are required' },
        { status: 400 }
      );
    }

    await db.collection('subjects').doc(subjectId).collection('books').doc(bookId).delete();

    return NextResponse.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json(
      { error: 'Failed to delete book' },
      { status: 500 }
    );
  }
}