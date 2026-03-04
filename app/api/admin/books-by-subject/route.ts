import { NextRequest, NextResponse } from 'next/server';
import { getDb, withQuotaFallback, resetToPrimaryFirebase } from '@/lib/firebaseAdmin';
import { pgPool } from '@/lib/postgres';

export const dynamic = 'force-dynamic';

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

    // 1) Fast path: PostgreSQL (preferred during Firebase quota issues)
    try {
      const pgResult = await pgPool.query(
        `
          SELECT
            b.id::text AS id,
            b.title,
            b.grade,
            COALESCE(s.name, $1) AS subject,
            b.description,
            COALESCE(b.chapters, 0) AS chapters
          FROM books b
          LEFT JOIN subjects s ON s.id = b.subject_id
          WHERE lower(COALESCE(s.name, '')) = lower($1)
          ORDER BY b.title ASC
        `,
        [subjectName]
      );

      if (pgResult.rows.length > 0) {
        const books = pgResult.rows.map((row) => ({
          id: row.id,
          title: row.title,
          grade: row.grade,
          subject: row.subject,
          description: row.description,
          chapters: Number(row.chapters || 0),
          subjectName,
        }));
        return NextResponse.json({ books, source: 'postgres' });
      }
    } catch (pgError) {
      // Continue to Firebase fallback
    }

    // 2) Fallback: Firebase with quota fallback wrapper
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      return NextResponse.json({ books: [] });
    }

    const books = await withQuotaFallback(async (activeDb) => {
      const subjectsSnapshot = await activeDb.collection('subjects').where('name', '==', subjectName).get();
      if (subjectsSnapshot.empty) return [];

      const subjectDoc = subjectsSnapshot.docs[0];
      const subjectId = subjectDoc.id;
      const booksSnapshot = await activeDb.collection('subjects').doc(subjectId).collection('books').get();

      return booksSnapshot.docs.map((bookDoc: any) => ({
        id: bookDoc.id,
        ...bookDoc.data(),
        subjectId,
        subjectName,
      }));
    });

    resetToPrimaryFirebase();

    return NextResponse.json({ books, source: 'firebase' });
  } catch (error) {
    resetToPrimaryFirebase();
    return NextResponse.json(
      { books: [], error: 'Failed to fetch books' },
      { status: 200 }
    );
  }
}
