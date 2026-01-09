import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await db.collection('schools').get();
    const schools = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    return NextResponse.json({ schools });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schools', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, address, city, contactEmail, contactPhone } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'School name is required' },
        { status: 400 }
      );
    }
    
    const schoolData = {
      name,
      address: address || '',
      city: city || '',
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalUsers: 0,
      totalStudents: 0,
      totalTeachers: 0,
      totalSchoolAdmins: 0,
      totalContentManagers: 0
    };
    
    const docRef = await db.collection('schools').add(schoolData);
    
    return NextResponse.json({ 
      success: true, 
      school: { id: docRef.id, ...schoolData } 
    });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to create school', details: error.message },
      { status: 500 }
    );
  }
}
