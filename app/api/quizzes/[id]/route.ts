import { NextResponse } from 'next/server';

const PROJECT_ID = 'quiz-app-ff0ab';

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

function parseFirestoreValue(value: FirestoreValue): any {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  if (!id) {
    return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
  }
  
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/quizzes/${id}`;
  
  try {
    const response = await fetch(url);
    
    if (response.status === 404) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Firestore error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
    
    const doc = await response.json();
    
    const quiz: Record<string, any> = { id };
    for (const [key, value] of Object.entries(doc.fields || {})) {
      quiz[key] = parseFirestoreValue(value as FirestoreValue);
    }
    
    // Enrich quiz items with cognitive levels from questions collection
    if (quiz.items && Array.isArray(quiz.items)) {
      for (let i = 0; i < quiz.items.length; i++) {
        const item = quiz.items[i];
        if (item && item.questionId) {
          try {
            // Fetch the question document to get cognitive level
            const questionUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/questions/${item.questionId}`;
            const questionResponse = await fetch(questionUrl);
            
            if (questionResponse.ok) {
              const questionDoc = await questionResponse.json();
              const questionData: Record<string, any> = {};
              for (const [key, value] of Object.entries(questionDoc.fields || {})) {
                questionData[key] = parseFirestoreValue(value as FirestoreValue);
              }
              
              // Add cognitive level to the quiz item
              if (questionData.cognitiveLevel) {
                quiz.items[i].cognitiveLevel = questionData.cognitiveLevel;
              }
              
              console.log(`[API] Enriched item ${i} (questionId: ${item.questionId}) with cognitiveLevel:`, questionData.cognitiveLevel);
            }
          } catch (error) {
            console.log(`[API] Failed to fetch cognitive level for question ${item.questionId}:`, error);
          }
        }
      }
    }
    
    return NextResponse.json({ quiz });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz', details: error.message },
      { status: 500 }
    );
  }
}
