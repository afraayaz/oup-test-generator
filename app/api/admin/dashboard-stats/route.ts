import { NextResponse } from 'next/server';
import { db, getDb, switchToSecondaryFirebase, resetToPrimaryFirebase } from '@/lib/firebaseAdmin';

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

    const currentDb = await getDb();

    // Fetch users (limited to 500)
    const usersSnapshot = await currentDb.collection('users').limit(500).get();
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
    const schoolsSnapshot = await currentDb.collection('schools').limit(200).get();
    const schools = schoolsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    const totalSchools = schools.length;
    const activeSchools = schools.filter((s: any) => s.status === 'Active').length;

    // Fetch quizzes (limited to 500)
    const quizzesSnapshot = await currentDb.collection('quizzes').limit(500).get();
    const quizzes = quizzesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    const totalQuizzes = quizzes.length;

    // Reset to primary if it was switched
    resetToPrimaryFirebase();

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
    
    // Check for quota error
    if (error.message?.includes('quota') || error.code === 'RESOURCE_EXHAUSTED') {
      console.warn('⚠️ Primary Firebase quota exceeded, switching to secondary');
      switchToSecondaryFirebase();
      
      try {
        // Retry with secondary Firebase
        const backupDb = await getDb();
        
        const usersSnapshot = await backupDb.collection('users').limit(500).get();
        const users = usersSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        
        const schoolsSnapshot = await backupDb.collection('schools').limit(200).get();
        const schools = schoolsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        
        const quizzesSnapshot = await backupDb.collection('quizzes').limit(500).get();
        const quizzes = quizzesSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        
        const totalUsers = users.length;
        const totalSchools = schools.length;
        const totalQuizzes = quizzes.length;
        const schoolUsers = users.filter((u: any) => u.schoolId || u.userType === 'school').length;
        const oupUsers = users.filter((u: any) => !u.schoolId && u.userType !== 'school').length;
        const studentCount = users.filter((u: any) => u.role === 'student').length;
        const teacherCount = users.filter((u: any) => u.role === 'teacher').length;
        const adminCount = users.filter((u: any) => u.role === 'school_admin').length;
        const activeSchools = schools.filter((s: any) => s.status === 'Active').length;
        
        console.log('✅ Successfully fetched from secondary Firebase');
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
      } catch (retryError) {
        console.error('❌ Secondary Firebase also failed:', retryError);
        return NextResponse.json(
          { error: 'Firebase quota exceeded and backup unavailable' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: error.message },
      { status: 500 }
    );
  }
}
