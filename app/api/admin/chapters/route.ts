import { NextRequest, NextResponse } from 'next/server';
import { db, getDb, switchToSecondaryFirebase, resetToPrimaryFirebase } from '@/lib/firebaseAdmin';
import { pgPool } from '@/lib/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const book = searchParams.get('book');
    const bookId = searchParams.get('bookId');
    let subjectId = searchParams.get('subjectId') || '';

    // 1) Fast path: PostgreSQL chapters
    try {
      let pgRows: any[] = [];
      if (bookId) {
        const byId = await pgPool.query(
          `
            SELECT chapter_name
            FROM book_chapters
            WHERE book_id::text = $1
            ORDER BY chapter_number ASC, chapter_name ASC
          `,
          [bookId]
        );
        pgRows = byId.rows;
      } else if (book) {
        const byTitle = await pgPool.query(
          `
            SELECT bc.chapter_name
            FROM book_chapters bc
            JOIN books b ON b.id = bc.book_id
            LEFT JOIN subjects s ON s.id = b.subject_id
            WHERE lower(b.title) = lower($1)
              AND ($2::text IS NULL OR lower(COALESCE(s.name, '')) = lower($2))
            ORDER BY bc.chapter_number ASC, bc.chapter_name ASC
          `,
          [book, subject || null]
        );
        pgRows = byTitle.rows;
      }

      if (pgRows.length > 0) {
        return NextResponse.json({
          chapters: pgRows.map((r: any) => r.chapter_name).filter(Boolean),
          total: pgRows.length,
          source: 'postgres',
          subjectId,
          bookId
        });
      }

      // Explicit empty from PG if we know book id but no chapters exist
      if (bookId) {
        return NextResponse.json({
          chapters: [],
          total: 0,
          source: 'postgres-empty',
          subjectId,
          bookId
        });
      }
    } catch (pgError) {
      // Continue to Firebase fallback
    }

    // 2) Fallback: Firebase
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      return NextResponse.json({ chapters: [], total: 0, source: 'no-firebase-config' });
    }

    const currentDb = await getDb();

    // If bookId is provided but subjectId is missing, find subjectId from subject name
    if (bookId && !subjectId && subject) {
      try {
        const subjectsSnapshot = await currentDb
          .collection('subjects')
          .where('name', '==', subject)
          .limit(1)
          .get();
        
        if (!subjectsSnapshot.empty) {
          subjectId = subjectsSnapshot.docs[0].id;
        } else {
        }
      } catch (error) {
      }
    }

    // PRIORITY: If we have bookId and subjectId, use them directly (most accurate)
    if (bookId && subjectId) {
      try {
        const chaptersSnapshot = await currentDb
          .collection('subjects')
          .doc(subjectId)
          .collection('books')
          .doc(bookId)
          .collection('chapters')
          .get();
        
        const directChapters = new Set<string>();
        chaptersSnapshot.docs.forEach((doc: any) => {
          const chapterName = doc.data().chapterName || doc.id;
          directChapters.add(chapterName);
        });
        
        if (directChapters.size > 0) {
          const chaptersList = Array.from(directChapters).sort();
          resetToPrimaryFirebase();
          return NextResponse.json({
            chapters: chaptersList,
            total: directChapters.size,
            source: 'direct-path-with-ids',
            subjectId,
            bookId
          });
        } else {
        }
      } catch (error) {
      }
    }

    if (!subject || !book) {
      return NextResponse.json(
        { error: 'Subject and book are required' },
        { status: 400 }
      );
    }

    let chapters = new Set<string>();
    let source = 'unknown';

    // If we have bookId but not subjectId, search for the subject that contains this book
    if (bookId && !subjectId) {
      try {
        const subjectsSnapshot = await currentDb.collection('subjects').get();
        
        for (const subjectDoc of subjectsSnapshot.docs) {
          try {
            const booksSnapshot = await currentDb
              .collection('subjects')
              .doc(subjectDoc.id)
              .collection('books')
              .doc(bookId)
              .get();
            
            if (booksSnapshot.exists) {
              subjectId = subjectDoc.id;
              break;
            }
          } catch (e) {
            // Continue searching
          }
        }
      } catch (error) {
      }
    }

    // Reset chapters for fallback logic
    chapters = new Set<string>();
    source = 'unknown';

    // PRIMARY: Try to fetch chapters directly from the subjects/books/chapters path
    if (subjectId && bookId) {
      try {
        const chaptersSnapshot = await currentDb
          .collection('subjects')
          .doc(subjectId)
          .collection('books')
          .doc(bookId)
          .collection('chapters')
          .get();
        
        chaptersSnapshot.docs.forEach((doc: any) => {
          // Use chapterName field if available, otherwise use doc id
          const chapterName = doc.data().chapterName || doc.id;
          chapters.add(chapterName);
        });
        
        if (chapters.size > 0) {
          source = 'direct-path';
        } else {
        }
      } catch (error) {
      }
    }

    // FALLBACK: Extract chapters from questions if direct path didn't yield results
    if (chapters.size === 0) {
      let allQuestions: any[] = [];

      // Try with numeric IDs first
      if (subjectId && bookId) {
        
        try {
          const oupQuestionsRef = currentDb.collection('questions').doc('oup').collection('items');
          const oupSnapshot = await oupQuestionsRef
            .where('subject', '==', subjectId)
            .where('book', '==', bookId)
            .get();
          
          const oupQuestions = oupSnapshot.docs.map((doc: any) => doc.data());
          allQuestions = [...allQuestions, ...oupQuestions];
        } catch (error) {
        }

        // Get School questions using numeric IDs
        try {
          const schoolQuestionsRef = currentDb.collection('questions').doc('schools');
          const schoolsSnapshot = await schoolQuestionsRef.listCollections();
          
          for (const schoolCollection of schoolsSnapshot) {
            try {
              const schoolSnapshot = await schoolCollection
                .where('subject', '==', subjectId)
                .where('book', '==', bookId)
                .get();
              
              const schoolQuestions = schoolSnapshot.docs.map((doc: any) => doc.data());
              if (schoolQuestions.length > 0) {
                allQuestions = [...allQuestions, ...schoolQuestions];
              }
            } catch (error) {
            }
          }
        } catch (error) {
        }
      }

      // Try with display names if numeric IDs didn't work
      if (allQuestions.length === 0) {
        
        try {
          const oupQuestionsRef = currentDb.collection('questions').doc('oup').collection('items');
          const oupSnapshot = await oupQuestionsRef
            .where('subject', '==', subject)
            .where('book', '==', book)
            .get();
          
          const oupQuestions = oupSnapshot.docs.map((doc: any) => doc.data());
          allQuestions = [...allQuestions, ...oupQuestions];
        } catch (error) {
        }

        // Get School questions with display names
        try {
          const schoolQuestionsRef = currentDb.collection('questions').doc('schools');
          const schoolsSnapshot = await schoolQuestionsRef.listCollections();
          
          for (const schoolCollection of schoolsSnapshot) {
            try {
              const schoolSnapshot = await schoolCollection
                .where('subject', '==', subject)
                .where('book', '==', book)
                .get();
              
              const schoolQuestions = schoolSnapshot.docs.map((doc: any) => doc.data());
              if (schoolQuestions.length > 0) {
                allQuestions = [...allQuestions, ...schoolQuestions];
              }
            } catch (error) {
            }
          }
        } catch (error) {
        }
      }

      // Extract unique chapters from all questions
      allQuestions
        .map(q => q.chapter)
        .filter(Boolean)
        .forEach(ch => {
          if (typeof ch === 'string') {
            // Remove surrounding quotes if present
            const cleaned = ch.replace(/^["']|["']$/g, '').trim();
            if (cleaned) {
              chapters.add(cleaned);
            }
          }
        });

      if (chapters.size > 0) {
        source = 'extracted_from_questions';
      }
    }

    const chaptersList = Array.from(chapters).sort();

    if (chaptersList.length === 0) {
    }

    resetToPrimaryFirebase();
    return NextResponse.json({
      chapters: chaptersList,
      total: chaptersList.length,
      source: source,
      subjectId,
      bookId
    });
  } catch (error: any) {
    
    // Check for quota error
    if (error.message?.includes('quota') || error.code === 'RESOURCE_EXHAUSTED') {
      switchToSecondaryFirebase();
      
      try {
        // Retry with secondary Firebase
        const backupDb = await getDb();
        const fallbackParams = new URL('http://localhost?' + new URL(request.url).searchParams).searchParams;
        const fallbackSubject = fallbackParams.get('subject') || '';
        const fallbackBook = fallbackParams.get('book') || '';
        const fallbackBookId = fallbackParams.get('bookId') || '';
        let fallbackSubjectId = fallbackParams.get('subjectId') || '';
        
        // Simplified fallback - just try to get chapters
        const fallbackChapters = new Set<string>();
        
        if (fallbackSubjectId && fallbackBookId) {
          const fallbackSnapshot = await backupDb
            .collection('subjects')
            .doc(fallbackSubjectId)
            .collection('books')
            .doc(fallbackBookId)
            .collection('chapters')
            .get();
          
          fallbackSnapshot.docs.forEach((doc: any) => {
            fallbackChapters.add(doc.data().chapterName || doc.id);
          });
        }
        return NextResponse.json({
          chapters: Array.from(fallbackChapters).sort(),
          total: fallbackChapters.size,
          source: 'secondary',
          subjectId: fallbackSubjectId,
          bookId: fallbackBookId
        });
      } catch (retryError) {
        return NextResponse.json(
          { error: 'Firebase quota exceeded and backup unavailable' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch chapters', details: error.message },
      { status: 500 }
    );
  }
}

