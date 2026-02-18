import { NextRequest, NextResponse } from 'next/server';
import { db, getDb, switchToSecondaryFirebase, resetToPrimaryFirebase } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check if Firebase is properly initialized
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const currentDb = await getDb();
    const subjectsSnapshot = await currentDb.collection('subjects').get();
    
    const subjects = await Promise.all(
      subjectsSnapshot.docs.map(async (doc) => {
        const booksSnapshot = await currentDb.collection('subjects').doc(doc.id).collection('books').get();
        const books = booksSnapshot.docs.map(bookDoc => ({
          id: bookDoc.id,
          ...bookDoc.data(),
        }));

        return {
          id: doc.id,
          ...doc.data(),
          books,
        };
      })
    );

    // Reset to primary if it was switched
    resetToPrimaryFirebase();

    return NextResponse.json({ subjects });
  } catch (error: any) {
    
    // Check for quota error
    if (error.message?.includes('quota') || error.code === 'RESOURCE_EXHAUSTED' || error.message?.includes('quota')) {
      switchToSecondaryFirebase();
      
      try {
        // Retry with secondary Firebase
        const backupDb = await getDb();
        const subjectsSnapshot = await backupDb.collection('subjects').get();
        
        const subjects = await Promise.all(
          subjectsSnapshot.docs.map(async (doc) => {
            const booksSnapshot = await backupDb.collection('subjects').doc(doc.id).collection('books').get();
            const books = booksSnapshot.docs.map(bookDoc => ({
              id: bookDoc.id,
              ...bookDoc.data(),
            }));

            return {
              id: doc.id,
              ...doc.data(),
              books,
            };
          })
        );
        return NextResponse.json({ subjects });
      } catch (retryError) {
        return NextResponse.json(
          { error: 'Firebase quota exceeded and backup unavailable' },
          { status: 503 }
        );
      }
    }

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

    const subjectRef = await db.collection('subjects').add({
      name,
      createdAt: new Date().toISOString(),
    });

    const createdSubject = {
      id: subjectRef.id,
      name,
      createdAt: new Date().toISOString(),
      books: []
    };

    return NextResponse.json({ subject: createdSubject });
  } catch (error) {
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

    await db.collection('subjects').doc(id).update({
      name,
      updatedAt: new Date().toISOString(),
    });

    const updatedSubject = {
      id,
      name,
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({ subject: updatedSubject });
  } catch (error) {
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

    // Delete all books in this subject
    const booksSnapshot = await db.collection('subjects').doc(subjectId).collection('books').get();
    
    for (const bookDoc of booksSnapshot.docs) {
      await db.collection('subjects').doc(subjectId).collection('books').doc(bookDoc.id).delete();
    }

    // Delete the subject
    await db.collection('subjects').doc(subjectId).delete();

    return NextResponse.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete subject' },
      { status: 500 }
    );
  }
}
