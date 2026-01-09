import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

// Consolidated endpoint to fetch all dashboard stats in one call
export async function GET() {
  try {
    // Check if Firebase is properly initialized
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    // Fetch users (limited to 500)
    const usersSnapshot = await db.collection('users').limit(500).get();
    const users = usersSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    const totalUsers = users.length;
    const schoolUsers = users.filter((u: any) => u.schoolId || u.userType === 'school').length;
    const oupUsers = users.filter((u: any) => !u.schoolId && u.userType !== 'school').length;
    
    // User roles distribution
    const studentCount = users.filter((u: any) => u.role === 'student').length;
    const teacherCount = users.filter((u: any) => u.role === 'teacher').length;
    const adminCount = users.filter((u: any) => u.role === 'school_admin').length;

    // Fetch schools (limited to 200)
    const schoolsSnapshot = await db.collection('schools').limit(200).get();
    const schools = schoolsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    const totalSchools = schools.length;
    const activeSchools = schools.filter((s: any) => s.status === 'Active').length;

    // Fetch quizzes (limited to 500)
    const quizzesSnapshot = await db.collection('quizzes').limit(500).get();
    const quizzes = quizzesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    const totalQuizzes = quizzes.length;

    // Return consolidated stats
    return NextResponse.json({
      stats: {
        totalUsers,
        schoolUsers,
        oupUsers,
        totalSchools,
        activeSchools,
        totalQuizzes,
      },
      userRoles: {
        students: studentCount,
        teachers: teacherCount,
        admins: adminCount,
      },
      users,
      quizzes,
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: error.message },
      { status: 500 }
    );
  }
}
