import { db, withQuotaFallback, isQuotaError } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET - Get all school QBs (OUP admin only)
export async function GET(request: NextRequest) {
  try {
    // Check if Firebase is properly initialized
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 503 }
      );
    }

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
    return NextResponse.json(
      { error: 'Failed to fetch question banks' },
      { status: 500 }
    );
  }
}
