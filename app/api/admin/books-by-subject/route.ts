import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

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

    // First find the subject with matching name
    const subjectsSnapshot = await db.collection('subjects').where('name', '==', subjectName).get();

    if (subjectsSnapshot.empty) {
      return NextResponse.json({ books: [] });
    }

    const subjectDoc = subjectsSnapshot.docs[0];
    const subjectId = subjectDoc.id;

    // Get books for this subject
    const booksSnapshot = await db.collection('subjects').doc(subjectId).collection('books').get();

    const books = booksSnapshot.docs.map(bookDoc => ({
      id: bookDoc.id,
      ...bookDoc.data(),
      subjectId: subjectId,
      subjectName: subjectName,
    }));

    return NextResponse.json({ books });
  } catch (error) {
    console.error('Error fetching books by subject:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}