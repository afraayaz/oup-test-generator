import { NextRequest, NextResponse } from 'next/server';

const FIREBASE_PROJECT_ID = 'quiz-app-ff0ab';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export async function GET() {
  try {
    const response = await fetch(`${FIRESTORE_BASE_URL}/subjects`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform Firestore data to our format
    const subjects = data.documents ? data.documents.map((doc: any) => ({
      id: doc.name.split('/').pop(),
      name: doc.fields.name.stringValue,
      createdAt: doc.fields.createdAt?.timestampValue || new Date().toISOString(),
      books: []
    })) : [];

    // Fetch books for each subject
    for (const subject of subjects) {
      const booksResponse = await fetch(`${FIRESTORE_BASE_URL}/subjects/${subject.id}/books`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (booksResponse.ok) {
        const booksData = await booksResponse.json();
        subject.books = booksData.documents ? booksData.documents.map((bookDoc: any) => ({
          id: bookDoc.name.split('/').pop(),
          title: bookDoc.fields.title.stringValue,
          grade: bookDoc.fields.grade.stringValue,
          description: bookDoc.fields.description?.stringValue || '',
          chapters: parseInt(bookDoc.fields.chapters?.integerValue || '0'),
          createdAt: bookDoc.fields.createdAt?.timestampValue || new Date().toISOString(),
        })) : [];
      }
    }

    return NextResponse.json({ subjects });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Subject name is required' },
        { status: 400 }
      );
    }

    const subjectId = Date.now().toString();
    const subjectData = {
      fields: {
        name: { stringValue: name },
        createdAt: { timestampValue: new Date().toISOString() }
      }
    };

    const response = await fetch(`${FIRESTORE_BASE_URL}/subjects/${subjectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subjectData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const createdSubject = {
      id: subjectId,
      name,
      createdAt: new Date().toISOString(),
      books: []
    };

    return NextResponse.json({ subject: createdSubject });
  } catch (error) {
    console.error('Error creating subject:', error);
    return NextResponse.json(
      { error: 'Failed to create subject' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: 'Subject ID and name are required' },
        { status: 400 }
      );
    }

    const subjectData = {
      fields: {
        name: { stringValue: name },
        createdAt: { timestampValue: new Date().toISOString() }
      }
    };

    const response = await fetch(`${FIRESTORE_BASE_URL}/subjects/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subjectData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const updatedSubject = {
      id,
      name,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({ subject: updatedSubject });
  } catch (error) {
    console.error('Error updating subject:', error);
    return NextResponse.json(
      { error: 'Failed to update subject' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('id');

    if (!subjectId) {
      return NextResponse.json(
        { error: 'Subject ID is required' },
        { status: 400 }
      );
    }

    // First, delete all books in this subject
    const booksResponse = await fetch(`${FIRESTORE_BASE_URL}/subjects/${subjectId}/books`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (booksResponse.ok) {
      const booksData = await booksResponse.json();
      if (booksData.documents) {
        for (const bookDoc of booksData.documents) {
          const bookId = bookDoc.name.split('/').pop();
          await fetch(`${FIRESTORE_BASE_URL}/subjects/${subjectId}/books/${bookId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }
      }
    }

    // Then delete the subject
    const response = await fetch(`${FIRESTORE_BASE_URL}/subjects/${subjectId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return NextResponse.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    return NextResponse.json(
      { error: 'Failed to delete subject' },
      { status: 500 }
    );
  }
}