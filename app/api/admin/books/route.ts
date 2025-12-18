import { NextRequest, NextResponse } from 'next/server';

const FIREBASE_PROJECT_ID = 'quiz-app-ff0ab';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subjectId, title, grade, description, chapters } = body;

    if (!subjectId || !title || !grade) {
      return NextResponse.json(
        { error: 'Subject ID, title, and grade are required' },
        { status: 400 }
      );
    }

    const bookId = Date.now().toString();
    const bookData = {
      fields: {
        title: { stringValue: title },
        grade: { stringValue: grade },
        description: { stringValue: description || '' },
        chapters: { integerValue: chapters || 0 },
        createdAt: { timestampValue: new Date().toISOString() }
      }
    };

    const response = await fetch(`${FIRESTORE_BASE_URL}/subjects/${subjectId}/books/${bookId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const createdBook = {
      id: bookId,
      title,
      grade,
      description: description || '',
      chapters: chapters || 0,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({ book: createdBook });
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
      fields: {
        title: { stringValue: title },
        grade: { stringValue: grade },
        description: { stringValue: description || '' },
        chapters: { integerValue: chapters || 0 },
        createdAt: { timestampValue: new Date().toISOString() }
      }
    };

    const response = await fetch(`${FIRESTORE_BASE_URL}/subjects/${subjectId}/books/${bookId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const updatedBook = {
      id: bookId,
      title,
      grade,
      description: description || '',
      chapters: chapters || 0,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({ book: updatedBook });
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

    const response = await fetch(`${FIRESTORE_BASE_URL}/subjects/${subjectId}/books/${bookId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return NextResponse.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json(
      { error: 'Failed to delete book' },
      { status: 500 }
    );
  }
}