import { NextRequest, NextResponse } from 'next/server';

const FIREBASE_PROJECT_ID = 'quiz-app-ff0ab';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectName = searchParams.get('subject');

    if (!subjectName) {
      return NextResponse.json(
        { error: 'Subject name is required' },
        { status: 400 }
      );
    }

    // First get all subjects to find the matching one
    const subjectsResponse = await fetch(`${FIRESTORE_BASE_URL}/subjects`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!subjectsResponse.ok) {
      throw new Error(`HTTP error! status: ${subjectsResponse.status}`);
    }

    const subjectsData = await subjectsResponse.json();
    
    if (!subjectsData.documents) {
      return NextResponse.json({ books: [] });
    }

    // Find the subject with matching name
    const targetSubject = subjectsData.documents.find((doc: any) => 
      doc.fields.name.stringValue === subjectName
    );

    if (!targetSubject) {
      return NextResponse.json({ books: [] });
    }

    const subjectId = targetSubject.name.split('/').pop();

    // Get books for this subject
    const booksResponse = await fetch(`${FIRESTORE_BASE_URL}/subjects/${subjectId}/books`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!booksResponse.ok) {
      throw new Error(`HTTP error! status: ${booksResponse.status}`);
    }

    const booksData = await booksResponse.json();
    
    const books = booksData.documents ? booksData.documents.map((bookDoc: any) => ({
      id: bookDoc.name.split('/').pop(),
      title: bookDoc.fields.title.stringValue,
      grade: bookDoc.fields.grade.stringValue,
      description: bookDoc.fields.description?.stringValue || '',
      chapters: parseInt(bookDoc.fields.chapters?.integerValue || '0'),
      subjectId: subjectId,
      subjectName: subjectName,
      createdAt: bookDoc.fields.createdAt?.timestampValue || new Date().toISOString(),
    })) : [];

    return NextResponse.json({ books });
  } catch (error) {
    console.error('Error fetching books by subject:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}