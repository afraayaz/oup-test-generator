import { db } from '@/lib/firebaseAdmin';
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
    const statsSnapshot = await db.collection('question-bank-stats').doc('schools').get();
    
    if (!statsSnapshot.exists) {
      return NextResponse.json({
        success: true,
        schoolQBs: [],
        totalSchools: 0
      });
    }

    const data = statsSnapshot.data() || {};
    const schoolQBs = Object.entries(data).map(([schoolId, stats]: [string, any]) => ({
      schoolId,
      ...stats
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
