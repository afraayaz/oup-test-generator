import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

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
    const subject = searchParams.get('subject');
    const book = searchParams.get('book');
    const bookId = searchParams.get('bookId');
    let subjectId = searchParams.get('subjectId') || '';

    if (!subject || !book) {
      return NextResponse.json(
        { error: 'Subject and book are required' },
        { status: 400 }
      );
    }

    console.log('📚 Fetching chapters for:', { subject, book, subjectId, bookId });

    // If we have bookId but not subjectId, search for the subject that contains this book
    if (bookId && !subjectId) {
      console.log(`🔍 Finding subject that contains book ID "${bookId}"...`);
      try {
        const subjectsSnapshot = await db.collection('subjects').get();
        
        for (const subjectDoc of subjectsSnapshot.docs) {
          try {
            const booksSnapshot = await db
              .collection('subjects')
              .doc(subjectDoc.id)
              .collection('books')
              .doc(bookId)
              .get();
            
            if (booksSnapshot.exists) {
              subjectId = subjectDoc.id;
              console.log(`✅ Found subject ID: "${subjectId}" contains book ID "${bookId}"`);
              break;
            }
          } catch (e) {
            // Continue searching
          }
        }
      } catch (error) {
        console.log('Note: Could not search subjects for book ID');
      }
    }

    const chapters = new Set<string>();
    let source = 'unknown';

    // PRIMARY: Try to fetch chapters directly from the subjects/books/chapters path
    if (subjectId && bookId) {
      console.log(`📖 Fetching chapters directly from subjects/${subjectId}/books/${bookId}/chapters...`);
      try {
        const chaptersSnapshot = await db
          .collection('subjects')
          .doc(subjectId)
          .collection('books')
          .doc(bookId)
          .collection('chapters')
          .get();
        
        chaptersSnapshot.docs.forEach(doc => {
          // Use chapterName field if available, otherwise use doc id
          const chapterName = doc.data().chapterName || doc.id;
          chapters.add(chapterName);
        });
        
        if (chapters.size > 0) {
          console.log(`✅ Found ${chapters.size} chapters from direct path:`, Array.from(chapters));
          source = 'direct-path';
        } else {
          console.log(`⚠️ Chapters collection exists but is empty`);
        }
      } catch (error) {
        console.log('Note: Could not fetch from chapters direct path:', error);
      }
    }

    // FALLBACK: Extract chapters from questions if direct path didn't yield results
    if (chapters.size === 0) {
      console.log('📖 Fallback: Extracting chapters from questions...');
      let allQuestions: any[] = [];

      // Try with numeric IDs first
      if (subjectId && bookId) {
        console.log(`🔍 Trying numeric IDs: subjectId="${subjectId}", bookId="${bookId}"`);
        
        try {
          const oupQuestionsRef = db.collection('questions').doc('oup').collection('items');
          const oupSnapshot = await oupQuestionsRef
            .where('subject', '==', subjectId)
            .where('book', '==', bookId)
            .get();
          
          const oupQuestions = oupSnapshot.docs.map(doc => doc.data());
          console.log(`✅ Found ${oupQuestions.length} OUP questions using numeric IDs`);
          allQuestions = [...allQuestions, ...oupQuestions];
        } catch (error) {
          console.log('Note: Could not fetch OUP questions with numeric IDs');
        }

        // Get School questions using numeric IDs
        try {
          const schoolQuestionsRef = db.collection('questions').doc('schools');
          const schoolsSnapshot = await schoolQuestionsRef.listCollections();
          
          for (const schoolCollection of schoolsSnapshot) {
            try {
              const schoolSnapshot = await schoolCollection
                .where('subject', '==', subjectId)
                .where('book', '==', bookId)
                .get();
              
              const schoolQuestions = schoolSnapshot.docs.map(doc => doc.data());
              if (schoolQuestions.length > 0) {
                console.log(`✅ Found ${schoolQuestions.length} school questions using numeric IDs`);
                allQuestions = [...allQuestions, ...schoolQuestions];
              }
            } catch (error) {
              console.log(`Note: Could not fetch school questions with numeric IDs`);
            }
          }
        } catch (error) {
          console.log('Note: Could not fetch school questions structure');
        }
      }

      // Try with display names if numeric IDs didn't work
      if (allQuestions.length === 0) {
        console.log(`⚠️ No results with numeric IDs, trying display names...`);
        
        try {
          const oupQuestionsRef = db.collection('questions').doc('oup').collection('items');
          const oupSnapshot = await oupQuestionsRef
            .where('subject', '==', subject)
            .where('book', '==', book)
            .get();
          
          const oupQuestions = oupSnapshot.docs.map(doc => doc.data());
          console.log(`✅ Found ${oupQuestions.length} OUP questions with display names`);
          allQuestions = [...allQuestions, ...oupQuestions];
        } catch (error) {
          console.log('Note: Could not fetch OUP questions with display names');
        }

        // Get School questions with display names
        try {
          const schoolQuestionsRef = db.collection('questions').doc('schools');
          const schoolsSnapshot = await schoolQuestionsRef.listCollections();
          
          for (const schoolCollection of schoolsSnapshot) {
            try {
              const schoolSnapshot = await schoolCollection
                .where('subject', '==', subject)
                .where('book', '==', book)
                .get();
              
              const schoolQuestions = schoolSnapshot.docs.map(doc => doc.data());
              if (schoolQuestions.length > 0) {
                console.log(`✅ Found ${schoolQuestions.length} school questions with display names`);
                allQuestions = [...allQuestions, ...schoolQuestions];
              }
            } catch (error) {
              console.log(`Note: Could not fetch school questions with display names`);
            }
          }
        } catch (error) {
          console.log('Note: Could not fetch school questions structure');
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

    console.log(`✅ Final result: ${chaptersList.length} unique chapters (source: ${source}):`, chaptersList);

    if (chaptersList.length === 0) {
      console.log(`⚠️ No chapters found for subject="${subject}", book="${book}"`);
    }

    return NextResponse.json({
      chapters: chaptersList,
      total: chaptersList.length,
      source: source,
      subjectId,
      bookId
    });
  } catch (error: any) {
    console.error('❌ Error fetching chapters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapters', details: error.message },
      { status: 500 }
    );
  }
}

