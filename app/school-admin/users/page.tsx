import UsersClient from './UsersClient';

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
}

interface FirestoreDocument {
  name: string;
  fields: Record<string, FirestoreValue>;
}

function parseFirestoreValue(value: FirestoreValue): unknown {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue, 10);
  if (value.doubleValue !== undefined) return parseFloat(String(value.doubleValue));
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.arrayValue?.values) {
    return value.arrayValue.values.map(parseFirestoreValue);
  }
  if (value.mapValue?.fields) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value.mapValue.fields)) {
      result[key] = parseFirestoreValue(val);
    }
    return result;
  }
  return null;
}

function parseFirestoreDocument(doc: FirestoreDocument): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const docId = doc.name.split('/').pop();
  result.id = docId;
  
  if (doc.fields) {
    for (const [key, value] of Object.entries(doc.fields)) {
      result[key] = parseFirestoreValue(value);
    }
  }
  return result;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'content_manager';
  schoolId?: string;
  schoolName?: string;
  campusId?: string;
  campusName?: string;
  grade?: string;
  class?: string;
  section?: string;
  rollNumber?: string;
  subjects?: string[];
  assignedClasses?: string[];
  assignedGrades?: string[];
  phone?: string;
  status?: string;
  createdAt?: string;
  createdBy?: string;
}

async function fetchUsers(schoolId?: string): Promise<{ users: UserData[], availableSchools: string[] }> {
  const projectId = 'quiz-app-ff0ab';
  
  try {
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?pageSize=500`,
      { 
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    
    if (!response.ok) {
      return { users: [], availableSchools: [] };
    }
    
    const data = await response.json();
    
    if (!data.documents || !Array.isArray(data.documents)) {
      return { users: [], availableSchools: [] };
    }
    
    const allUsers: UserData[] = data.documents.map((doc: FirestoreDocument) => {
      const parsed = parseFirestoreDocument(doc);
      return {
        id: parsed.id as string,
        name: (parsed.name as string) || (parsed.displayName as string) || 'Unknown',
        email: (parsed.email as string) || '',
        role: (parsed.role as string) || 'student',
        schoolId: parsed.schoolId as string,
        schoolName: parsed.schoolName as string,
        campusId: parsed.campusId as string,
        campusName: parsed.campusName as string,
        grade: (parsed.grade as string) || (parsed.class as string),
        class: parsed.class as string,
        section: parsed.section as string,
        rollNumber: parsed.rollNumber as string,
        subjects: parsed.subjects as string[],
        assignedClasses: parsed.assignedClasses as string[],
        assignedGrades: parsed.assignedGrades as string[],
        phone: parsed.phone as string,
        status: (parsed.status as string) || 'active',
        createdAt: parsed.createdAt as string,
        createdBy: parsed.createdBy as string,
      };
    });
    
    const availableSchools = [...new Set(allUsers.map(u => u.schoolId).filter(Boolean))] as string[];
    
    const filteredUsers = schoolId 
      ? allUsers.filter(user => user.schoolId === schoolId)
      : allUsers;
    
    return { users: filteredUsers, availableSchools };
  } catch (error) {
    return { users: [], availableSchools: [] };
  }
}

interface PageProps {
  searchParams: Promise<{ schoolId?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  // School admins should only see their own school's users
  // The schoolId is obtained from the URL or determined from the logged-in user
  const requestedSchoolId = params.schoolId;
  
  const { users, availableSchools } = await fetchUsers(requestedSchoolId);
  
  // Static data for demonstration
  const staticUsers: UserData[] = [
    {
      id: 'static-student-1',
      name: 'Ali Khan',
      email: 'ali.khan@example.com',
      role: 'student',
      schoolId: 'demo-school',
      schoolName: 'Demo School System',
      campusId: 'main-campus',
      campusName: 'Main Campus',
      grade: '10',
      class: '10',
      section: 'A',
      rollNumber: 'S-1001',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'static-student-2',
      name: 'Fatima Ahmed',
      email: 'fatima.ahmed@example.com',
      role: 'student',
      schoolId: 'demo-school',
      schoolName: 'Demo School System',
      campusId: 'main-campus',
      campusName: 'Main Campus',
      grade: '9',
      class: '9',
      section: 'B',
      rollNumber: 'S-1002',
      status: 'inactive',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'static-teacher-1',
      name: 'Mr. Kamran Akmal',
      email: 'kamran.akmal@example.com',
      role: 'teacher',
      schoolId: 'demo-school',
      schoolName: 'Demo School System',
      campusId: 'main-campus',
      campusName: 'Main Campus',
      subjects: ['Mathematics', 'Physics'],
      assignedClasses: ['10-A', '9-B'],
      assignedGrades: ['9', '10'],
      phone: '+92-300-1234567',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'static-manager-1',
      name: 'Zainab Bibi',
      email: 'zainab.bibi@example.com',
      role: 'content_manager',
      schoolId: 'demo-school',
      schoolName: 'Demo School System',
      campusId: 'main-campus',
      campusName: 'Main Campus',
      phone: '+92-333-7654321',
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: 'System',
    }
  ];

  const allUsers = [...users, ...staticUsers];

  const students = allUsers.filter(u => u.role === 'student');
  const teachers = allUsers.filter(u => u.role === 'teacher');
  const contentManagers = allUsers.filter(u => 
    u.role === 'content_manager' || 
    u.role === 'content-manager' as unknown ||
    u.role === 'contentManager' as unknown
  );
  
  return (
    <UsersClient 
      students={students} 
      teachers={teachers} 
      contentManagers={contentManagers} 
      schoolId={requestedSchoolId}
      availableSchools={availableSchools}
      isSchoolAdmin={true}
    />
  );
}
