import { NextResponse } from 'next/server';
import { db, auth, deleteFirebaseUser, getDb, switchToSecondaryFirebase, resetToPrimaryFirebase } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Check if Firebase is properly initialized
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const campusId = searchParams.get('campusId');
    const role = searchParams.get('role');
    
    let query: any = db.collection('users');
    
    if (schoolId) {
      query = query.where('schoolId', '==', schoolId);
    }
    if (campusId) {
      query = query.where('campusId', '==', campusId);
    }
    if (role) {
      query = query.where('role', '==', role);
    }
    
    // Limit query to prevent excessive reads (max 500 users per call)
    query = query.limit(500);
    
    const snapshot = await query.get();
    const users = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Check if Firebase is properly initialized
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      email, 
      password,
      role, 
      schoolId, 
      schoolName,
      campusId,
      campusName,
      grade,
      section,
      rollNumber,
      subjects,
      assignedClasses,
      assignedGrades,
      assignedBooks,
      subjectGradePairs,
      userType
    } = body;
    
    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are required' },
        { status: 400 }
      );
    }

    if (userType === 'school' && !schoolId) {
      return NextResponse.json(
        { error: 'School is required for school users' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }
    
    const validRoles = ['school_admin', 'teacher', 'student', 'content_manager', 'content_creator', 'oup_admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: school_admin, teacher, student, content_manager, content_creator, oup_admin' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existingSnapshot = await db.collection('users').where('email', '==', email).get();
    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Create Firebase Auth account
    let uid = '';
    try {
      const userRecord = await auth.createUser({
        email,
        password,
      });
      uid = userRecord.uid;
    } catch (authError: any) {
      return NextResponse.json(
        { error: `Failed to create user account: ${authError.message}` },
        { status: 400 }
      );
    }
    
    const userData: Record<string, any> = {
      uid,
      name,
      email,
      role,
      schoolId: schoolId || '',
      schoolName: schoolName || '',
      campusId: campusId || '',
      campusName: campusName || '',
      userType: userType || 'school',
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin',
      lastActive: ''
    };
    
    if (role === 'student') {
      userData.grade = grade || '';
      userData.section = section || '';
      userData.rollNumber = rollNumber || '';
      userData.class = grade || '';
    }
    
    if (role === 'teacher') {
      userData.subjects = subjects || [];
      userData.assignedClasses = assignedClasses || [];
      userData.assignedGrades = assignedGrades || [];
      userData.assignedBooks = assignedBooks || [];
      userData.subjectGradePairs = subjectGradePairs || [];
    }
    
    if (role === 'content_manager' || role === 'content_creator') {
      userData.subjects = subjects || [];
      userData.assignedBooks = assignedBooks || [];
    }
    
    const docRef = await db.collection('users').add(userData);
    
    return NextResponse.json({ 
      success: true, 
      user: { id: docRef.id, ...userData } 
    });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to create user', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    // Check if Firebase is properly initialized
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    updateData.updatedAt = new Date().toISOString();
    
    await db.collection('users').doc(id).update(updateData);
    
    const updatedDoc = await db.collection('users').doc(id).get();
    
    return NextResponse.json({ 
      success: true, 
      user: { id: updatedDoc.id, ...updatedDoc.data() } 
    });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to update user', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // Check if Firebase is properly initialized
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch the user to get their UID and email
    const userDoc = await db.collection('users').doc(id).get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const uid = userData?.uid;
    const userEmail = userData?.email;

    // Delete Firebase Auth account
    if (uid) {
      await deleteFirebaseUser(uid);
    }

    // Delete all quiz attempts by this user
    const attemptsSnapshot = await db.collection('quizAttempts').where('userId', '==', id).get();
    for (const doc of attemptsSnapshot.docs) {
      await doc.ref.delete();
    }

    // Delete all quizzes created by this user
    const quizzesSnapshot = await db.collection('quizzes').where('createdBy', '==', id).get();
    for (const doc of quizzesSnapshot.docs) {
      await doc.ref.delete();
    }

    // Delete user document
    await db.collection('users').doc(id).delete();
    
    return NextResponse.json({ 
      success: true, 
      message: 'User account and all associated data deleted successfully',
      deletedUser: {
        uid,
        email: userEmail
      }
    });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user', details: error.message },
      { status: 500 }
    );
  }
}
