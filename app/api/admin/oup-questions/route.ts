import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');

    // Get OUP questions with limit to reduce reads
    let query = db.collection('questions').doc('oup').collection('items').limit(1000);
    
    const snapshot = await query.get();
    
    const questions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    let result = questions;

    // Filter by subject if provided
    if (subject) {
      result = questions.filter((q: any) => 
        q.subject && q.subject.toLowerCase() === subject.toLowerCase()
      );
    }

    // Group questions by book and grade
    const bookwiseBreakdown: { [key: string]: number } = {};
    const bookGradeMap: { [key: string]: string } = {};
    result.forEach((q: any) => {
      const bookName = q.book || 'Unknown Book';
      const grade = q.grade || 'Unknown Grade';
      const bookKey = bookName;
      
      bookwiseBreakdown[bookKey] = (bookwiseBreakdown[bookKey] || 0) + 1;
      bookGradeMap[bookKey] = grade; // Store grade for this book
    });

    // Convert to array and sort by book name
    const bookwiseArray = Object.entries(bookwiseBreakdown).map(([book, count]) => ({
      book,
      grade: bookGradeMap[book] || 'Unknown',
      questions: count
    })).sort((a, b) => a.book.localeCompare(b.book));

    return NextResponse.json({ 
      questions: result,
      total: result.length,
      totalOUPQuestions: questions.length,
      bookwiseBreakdown: bookwiseArray
    });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OUP questions', details: error.message },
      { status: 500 }
    );
  }
}
