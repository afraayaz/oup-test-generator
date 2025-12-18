const PROJECT_ID = 'quiz-app-ff0ab';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  arrayValue?: { values: FirestoreValue[] };
  mapValue?: { fields: Record<string, FirestoreValue> };
  nullValue?: null;
}

interface FirestoreDocument {
  name: string;
  fields: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

interface ListDocumentsResponse {
  documents?: FirestoreDocument[];
  nextPageToken?: string;
}

function parseFirestoreValue(value: FirestoreValue): any {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== undefined) return null;
  if (value.timestampValue !== undefined) {
    return {
      toDate: () => new Date(value.timestampValue!)
    };
  }
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

export async function getCollection(collectionName: string): Promise<{ id: string; data: Record<string, any> }[]> {
  const url = `${FIRESTORE_BASE_URL}/${collectionName}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firestore error: ${response.status} - ${errorText}`);
    }
    
    const data: ListDocumentsResponse = await response.json();
    
    if (!data.documents) {
      return [];
    }
    
    return data.documents.map(parseDocument);
  } catch (error) {
    console.error('Firestore REST API error:', error);
    throw error;
  }
}

export async function getCollectionWithFilter(
  collectionName: string, 
  field: string, 
  operator: string, 
  value: any
): Promise<{ id: string; data: Record<string, any> }[]> {
  const url = `${FIRESTORE_BASE_URL}:runQuery`;
  
  const firestoreOperator = operator === '==' ? 'EQUAL' : operator === '!=' ? 'NOT_EQUAL' : 'EQUAL';
  
  let fieldValue: FirestoreValue;
  if (typeof value === 'string') {
    fieldValue = { stringValue: value };
  } else if (typeof value === 'number') {
    fieldValue = Number.isInteger(value) ? { integerValue: value.toString() } : { doubleValue: value };
  } else if (typeof value === 'boolean') {
    fieldValue = { booleanValue: value };
  } else {
    fieldValue = { stringValue: String(value) };
  }
  
  const query = {
    structuredQuery: {
      from: [{ collectionId: collectionName }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: firestoreOperator,
          value: fieldValue
        }
      }
    }
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(query)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firestore query error: ${response.status} - ${errorText}`);
    }
    
    const results = await response.json();
    
    return results
      .filter((result: any) => result.document)
      .map((result: any) => parseDocument(result.document));
  } catch (error) {
    console.error('Firestore REST query error:', error);
    throw error;
  }
}

export async function getDocument(collectionName: string, docId: string): Promise<{ id: string; data: Record<string, any> } | null> {
  const url = `${FIRESTORE_BASE_URL}/${collectionName}/${docId}`;
  
  try {
    const response = await fetch(url);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firestore error: ${response.status} - ${errorText}`);
    }
    
    const doc: FirestoreDocument = await response.json();
    return parseDocument(doc);
  } catch (error) {
    console.error('Firestore REST API error:', error);
    throw error;
  }
}
