import { NextRequest, NextResponse } from 'next/server';
import { db, withQuotaFallback, isQuotaError } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check if Firebase is properly initialized
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 503 }
      );
    }

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
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    );
  }
}
