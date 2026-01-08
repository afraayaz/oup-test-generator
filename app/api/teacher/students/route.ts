import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolId = searchParams.get('schoolId');
    const grade = searchParams.get('grade');

    if (!schoolId || !grade) {
      return NextResponse.json(
        { error: 'Missing schoolId or grade parameter' },
        { status: 400 }
      );
    }

    // Query students collection for students in the specified school and grade
    const studentsRef = collection(db, 'users');
    const q = query(
      studentsRef,
      where('schoolId', '==', schoolId),
      where('role', '==', 'student'),
      where('class', '==', grade)
    );

    const snapshot = await getDocs(q);
    const students = snapshot.docs.map(doc => {
      const docData = doc.data();
      // Use the uid field if available (Firebase Auth UID), otherwise use doc.id
      const studentId = docData.uid || doc.id;
      return {
        id: studentId,
        name: docData.name || '',
        email: docData.email || '',
        class: docData.class || grade,
        rollNumber: docData.rollNumber || '',
      };
    });

    console.log(`[FETCH-STUDENTS] Found ${students.length} students for grade ${grade}:`, students.map(s => ({ name: s.name, id: s.id })));

    return NextResponse.json({ students }, { status: 200 });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}
