import UsersClient from './UsersClient';

const PROJECT_ID = 'quiz-app-ff0ab';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
  nullValue?: null;
}

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
}

function parseFirestoreValue(value: FirestoreValue): any {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return parseFloat(String(value.doubleValue));
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== undefined) return null;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.arrayValue !== undefined) {
    return (value.arrayValue.values || []).map(parseFirestoreValue);
  }
  if (value.mapValue !== undefined) {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value.mapValue.fields || {})) {
      result[key] = parseFirestoreValue(val);
    }
    return result;
  }
  return null;
}

function parseDocument(doc: FirestoreDocument): { id: string; data: Record<string, any> } {
  const pathParts = doc.name.split('/');
  const id = pathParts[pathParts.length - 1];
  
  const data: Record<string, any> = {};
  for (const [key, value] of Object.entries(doc.fields || {})) {
    data[key] = parseFirestoreValue(value);
  }
  
  return { id, data };
}


async function fetchUsers() {
  try {
    const response = await fetch(`${FIRESTORE_URL}/users`);
    if (!response.ok) {
      console.error("❌ Error fetching users:", response.status);
      return [];
    }
    const data = await response.json();
    return (data.documents || []).map(parseDocument).map((doc: any) => ({
      id: doc.id,
      ...doc.data
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}



async function fetchSchools() {
  try {
    const response = await fetch(`${FIRESTORE_URL}/schools`);
    if (!response.ok) {
      console.error("❌ Error fetching schools:", response.status);
      return [];
    }
    const data = await response.json();
    return (data.documents || []).map(parseDocument).map((doc: any) => ({
      id: doc.id,
      ...doc.data
    }));
  } catch (error) {
    console.error("Error fetching schools:", error);
    return [];
  }
}


async function fetchCampuses() {
  try {
    const response = await fetch(`${FIRESTORE_URL}/campuses`);
    if (!response.ok) {
      console.error("❌ Error fetching campuses:", response.status);
      return [];
    }
    const data = await response.json();
    return (data.documents || []).map(parseDocument).map((doc: any) => ({
      id: doc.id,
      ...doc.data
    }));
  } catch (error) {
    console.error("Error fetching campuses:", error);
    return [];
  }
}


export default async function UserManagement() {
  const [users, schools, campuses] = await Promise.all([
    fetchUsers(),
    fetchSchools(),
    fetchCampuses()
  ]);
  
  return (
    <UsersClient 
      initialUsers={users}
      schools={schools}
      campuses={campuses}
    />
  );
}
