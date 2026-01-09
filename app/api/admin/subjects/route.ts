import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const subjectsSnapshot = await db.collection('subjects').get();
    
    const subjects = await Promise.all(
      subjectsSnapshot.docs.map(async (doc) => {
        const booksSnapshot = await db.collection('subjects').doc(doc.id).collection('books').get();
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

    // Delete all books in this subject
    const booksSnapshot = await db.collection('subjects').doc(subjectId).collection('books').get();
    
    for (const bookDoc of booksSnapshot.docs) {
      await db.collection('subjects').doc(subjectId).collection('books').doc(bookDoc.id).delete();
    }

    // Delete the subject
    await db.collection('subjects').doc(subjectId).delete();

    return NextResponse.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    return NextResponse.json(
      { error: 'Failed to delete subject' },
      { status: 500 }
    );
  }
}