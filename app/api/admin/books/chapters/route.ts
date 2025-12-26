import { NextRequest, NextResponse } from 'next/server';

const FIREBASE_PROJECT_ID = 'quiz-app-ff0ab';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// GET - Fetch chapters for a specific book
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const subjectId = searchParams.get('subjectId');

    if (!bookId || !subjectId) {
      return NextResponse.json(
        { error: 'Book ID and Subject ID are required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${FIRESTORE_BASE_URL}/subjects/${subjectId}/books/${bookId}/chapters`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // If chapters don't exist, return empty array
      if (response.status === 404) {
        return NextResponse.json({ chapters: [] });
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const chapters = (data.documents || []).map((doc: any) => {
      const pathParts = doc.name.split('/');
      const id = pathParts[pathParts.length - 1];
      const fields = doc.fields || {};

      return {
        id,
        chapterNo: fields.chapterNo?.integerValue || 0,
        chapterName: fields.chapterName?.stringValue || '',
        topic: fields.topic?.stringValue || '',
        description: fields.description?.stringValue || '',
        createdAt: fields.createdAt?.timestampValue,
      };
    }).sort((a: any, b: any) => a.chapterNo - b.chapterNo);

    return NextResponse.json({ chapters });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapters' },
      { status: 500 }
    );
  }
}

// POST - Create a new chapter for a book
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, subjectId, chapterNo, chapterName, topic, description } = body;

    if (!bookId || !subjectId || !chapterNo || !chapterName) {
      return NextResponse.json(
        { error: 'Book ID, Subject ID, Chapter No, and Chapter Name are required' },
        { status: 400 }
      );
    }

    const chapterId = `chapter_${chapterNo}`;
    const chapterData = {
      fields: {
        chapterNo: { integerValue: chapterNo },
        chapterName: { stringValue: chapterName },
        topic: { stringValue: topic || '' },
        description: { stringValue: description || '' },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    };

    const response = await fetch(
      `${FIRESTORE_BASE_URL}/subjects/${subjectId}/books/${bookId}/chapters/${chapterId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chapterData),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const createdChapter = {
      id: chapterId,
      chapterNo,
      chapterName,
      topic: topic || '',
      description: description || '',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ chapter: createdChapter });
  } catch (error) {
    console.error('Error creating chapter:', error);
    return NextResponse.json(
      { error: 'Failed to create chapter' },
      { status: 500 }
    );
  }
}

// PUT - Update a chapter
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookId, subjectId, chapterId, chapterNo, chapterName, topic, description } = body;

    if (!bookId || !subjectId || !chapterId || !chapterNo || !chapterName) {
      return NextResponse.json(
        { error: 'All required fields are missing' },
        { status: 400 }
      );
    }

    const chapterData = {
      fields: {
        chapterNo: { integerValue: chapterNo },
        chapterName: { stringValue: chapterName },
        topic: { stringValue: topic || '' },
        description: { stringValue: description || '' },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    };

    const response = await fetch(
      `${FIRESTORE_BASE_URL}/subjects/${subjectId}/books/${bookId}/chapters/${chapterId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chapterData),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating chapter:', error);
    return NextResponse.json(
      { error: 'Failed to update chapter' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a chapter
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    const subjectId = searchParams.get('subjectId');
    const chapterId = searchParams.get('chapterId');

    if (!bookId || !subjectId || !chapterId) {
      return NextResponse.json(
        { error: 'Book ID, Subject ID, and Chapter ID are required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${FIRESTORE_BASE_URL}/subjects/${subjectId}/books/${bookId}/chapters/${chapterId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return NextResponse.json(
      { error: 'Failed to delete chapter' },
      { status: 500 }
    );
  }
}
