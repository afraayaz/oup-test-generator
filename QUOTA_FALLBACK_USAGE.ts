/**
 * QUOTA FALLBACK SYSTEM - USAGE EXAMPLES
 * 
 * Your app now has automatic fallback to secondary Firebase
 * when primary hits quota limits!
 */

// ============================================
// EXAMPLE 1: Upload a Question (WRITE)
// ============================================

import { safeWrite } from '@/lib/firebaseAdmin';

async function uploadQuestion(questionData: any) {
  // This will:
  // 1. Try to write to PRIMARY
  // 2. If primary quota exceeded → automatically switch to SECONDARY
  // 3. Write to SECONDARY instead
  // 4. All future reads/writes use SECONDARY until primary recovers
  
  return await safeWrite(async (db) => {
    const docRef = db.collection('questions').doc();
    await docRef.set(questionData);
    console.log(`Question uploaded to ${db._referencePath?.path || 'database'}`);
    return docRef.id;
  });
}

// Usage:
// const questionId = await uploadQuestion({
//   title: 'What is 2+2?',
//   answer: '4',
//   difficulty: 'easy'
// });

// ============================================
// EXAMPLE 2: Fetch Questions (READ)
// ============================================

import { safeRead } from '@/lib/firebaseAdmin';

async function getQuestions() {
  // This will:
  // 1. Try to read from PRIMARY
  // 2. If primary quota exceeded → automatically switch to SECONDARY
  // 3. Read from SECONDARY instead
  
  return await safeRead(async (db) => {
    const snapshot = await db.collection('questions').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  });
}

// ============================================
// EXAMPLE 3: Use in API Routes
// ============================================

// app/api/questions/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { safeWrite } from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const questionData = await request.json();
    
    // Automatically handles quota overflow!
    const questionId = await safeWrite(async (db) => {
      const docRef = db.collection('questions').doc();
      await docRef.set({
        ...questionData,
        createdAt: new Date(),
      });
      return docRef.id;
    });
    
    return NextResponse.json({ 
      success: true, 
      questionId,
      message: 'Question saved (may be in secondary Firebase due to quota)'
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// ============================================
// EXAMPLE 4: Batch Operations
// ============================================

async function bulkUploadQuestions(questions: any[]) {
  return await safeWrite(async (db) => {
    const batch = db.batch();
    
    for (const questionData of questions) {
      const docRef = db.collection('questions').doc();
      batch.set(docRef, questionData);
    }
    
    await batch.commit();
    console.log(`Uploaded ${questions.length} questions`);
    return questions.length;
  });
}

// ============================================
// HOW IT WORKS
// ============================================

/*
SCENARIO: You're uploading questions and primary Firebase quota is at 95%

STEP 1: User uploads question
  await safeWrite(async (db) => {
    db.collection('questions').doc().set(questionData)
  })

STEP 2: System tries PRIMARY
  ✓ First few uploads work fine
  ✗ 10th upload hits quota limit → RESOURCE_EXHAUSTED error

STEP 3: Automatic Fallback Triggered
  ⚠️ isQuotaError() detects quota error
  ⚠️ switchToSecondaryFirebase() sets flag
  ✅ Retries same operation on SECONDARY

STEP 4: All Future Operations Use Secondary
  ✅ Remaining uploads go to SECONDARY
  ✅ All reads come from SECONDARY
  ✅ App continues working seamlessly!

STEP 5: Manual Sync (Optional)
  When primary quota resets, manually run:
  $ node copy-to-secondary.js
  
  This syncs secondary back to primary so both stay in sync
*/

// ============================================
// MONITORING
// ============================================

// Check which database is currently active:
import { getDb } from '@/lib/firebaseAdmin';

async function checkStatus() {
  const db = await getDb();
  const isUsingSecondary = db._referencePath?.path.includes('secondary');
  console.log(`Currently using: ${isUsingSecondary ? 'SECONDARY' : 'PRIMARY'} Firebase`);
}

// ============================================
// RECOVERY
// ============================================

// When primary quota resets, manually reset to primary:
import { resetToPrimaryFirebase } from '@/lib/firebaseAdmin';

async function switchBackToPrimary() {
  resetToPrimaryFirebase();
  console.log('✅ Reset to primary Firebase');
  console.log('Run: node copy-to-secondary.js  to sync any new data from secondary');
}

// ============================================
// KEY POINTS
// ============================================

/*
✅ Automatic: No code changes needed, system handles it transparently
✅ Writes: Questions uploaded to secondary if primary quota exceeded
✅ Reads: Data read from secondary if primary quota exceeded  
✅ Seamless: App continues working without user knowing
✅ Sync: Manual node script keeps both databases in sync
✅ Fallback: Only happens on actual quota errors, not other errors

⚠️  Important:
- Once switched to secondary, ALL operations use secondary
- When primary quota resets, manually run: node copy-to-secondary.js
- Then manually call: resetToPrimaryFirebase() to switch back
- Only AUTH always uses primary (users stored there only)
*/
