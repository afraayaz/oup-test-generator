import { db } from '@/firebase/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

// GET - Get all school QBs (OUP admin only)
export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role');

    if (userRole !== 'oup-admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Only OUP admin can access all question banks' },
        { status: 403 }
      );
    }

    // Get all school QBs stats
    const statsSnapshot = await getDocs(
      collection(db, 'question-bank-stats/schools')
    );

    const schoolQBs = statsSnapshot.docs.map(doc => ({
      schoolId: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      schoolQBs,
      totalSchools: schoolQBs.length
    });
  } catch (error) {
    console.error('Error fetching school QBs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch question banks' },
      { status: 500 }
    );
  }
}
