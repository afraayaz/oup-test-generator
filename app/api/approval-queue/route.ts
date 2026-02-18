import { db } from '@/firebase/firebase';
import { collection, getDocs, updateDoc, deleteDoc, doc, query, where, addDoc } from 'firebase/firestore';
import { db as adminDb } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch questions pending approval (for content managers) or user's questions (for content creators)
export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');
    const userName = request.headers.get('x-user-name');

    // Content managers and content creators can access this endpoint
    if (userRole !== 'content_manager' && userRole !== 'content_creator') {
      return NextResponse.json(
        { error: 'Unauthorized: Only content managers and content creators can access this endpoint' },
        { status: 403 }
      );
    }

    const subject = request.nextUrl.searchParams.get('subject');
    const status = request.nextUrl.searchParams.get('status') || 'pending';
    const createdBy = request.nextUrl.searchParams.get('createdBy');

    const approvalQueueRef = collection(db, 'questions', 'approval_queue', 'items');
    let approvalQuery = query(approvalQueueRef);

    // If status filter is provided, apply it
    if (status) {
      approvalQuery = query(approvalQueueRef, where('status', '==', status));
    }

    const snapshot = await getDocs(approvalQuery);
    let questions: any[] = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    if (userRole === 'content_manager') {
      // Get user's assigned subjects directly from Firestore
      try {
        const userDoc = await adminDb.collection('users').doc(userId).get();
        let userSubjects: string[] = [];
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          
          // Try multiple possible data structures
          if (userData?.assignedBooks && Array.isArray(userData.assignedBooks)) {
            userSubjects = userData.assignedBooks.map((book: any) => book.subject || book.Subject).filter(Boolean);
          } else if (userData?.assignedSubjects && Array.isArray(userData.assignedSubjects)) {
            userSubjects = userData.assignedSubjects;
          } else if (userData?.subjects && Array.isArray(userData.subjects)) {
            userSubjects = userData.subjects;
          } else if (userData?.subject) {
            userSubjects = [userData.subject];
          }
        }

        // Filter by content manager's assigned subjects
        if (userSubjects.length > 0) {
          questions = questions.filter(q => userSubjects.includes(q.subject));
        }

        // Apply additional subject filter if provided
        if (subject) {
          questions = questions.filter(q => q.subject === subject);
        }

        return NextResponse.json({
          success: true,
          questions,
          total: questions.length,
          userSubjects
        });
      } catch (error) {
        return NextResponse.json({
          success: true,
          questions: [], // Return empty if can't fetch user data
          total: 0,
          userSubjects: []
        });
      }
    } else if (userRole === 'content_creator') {
      // Filter by content creator's own questions
      questions = questions.filter(q => q.createdBy === userName || q.createdById === userId);

      // Apply additional subject filter if provided
      if (subject) {
        questions = questions.filter(q => q.subject === subject);
      }

      return NextResponse.json({
        success: true,
        questions,
        total: questions.length
      });
    }

  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch approval queue' }, { status: 500 });
  }
}

// POST - Approve or reject a question
export async function POST(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');
    const userName = request.headers.get('x-user-name');

    // Only content managers can approve/reject questions
    if (userRole !== 'content_manager') {
      return NextResponse.json(
        { error: 'Unauthorized: Only content managers can approve/reject questions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { questionId, action, feedback } = body; // action: 'approve' or 'reject'

    if (!questionId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request. questionId and action (approve/reject) are required.' },
        { status: 400 }
      );
    }

    // Get the question from approval queue
    const approvalQueueRef = collection(db, 'questions', 'approval_queue', 'items');
    const snapshot = await getDocs(query(approvalQueueRef, where('__name__', '==', questionId)));
    
    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'Question not found in approval queue' },
        { status: 404 }
      );
    }

    const questionDoc = snapshot.docs[0];
    const questionData = questionDoc.data();

    // Check if content manager has access to this subject
    try {
      
      // First try to get user by document ID
      let userDoc = await adminDb.collection('users').doc(userId).get();
      let userData = null;
      
      if (!userDoc.exists) {
        // Try to query by uid field instead
        const userQuery = await adminDb.collection('users').where('uid', '==', userId).limit(1).get();
        if (!userQuery.empty) {
          userDoc = userQuery.docs[0];
          userData = userDoc.data();
        } else {
          // Try to query by other possible fields
          const emailQuery = await adminDb.collection('users').where('email', '==', userName).limit(1).get();
          if (!emailQuery.empty) {
            userDoc = emailQuery.docs[0];
            userData = userDoc.data();
          }
        }
      } else {
        userData = userDoc.data();
      }
      
      let userSubjects: string[] = [];
      
      if (userData) {
        
        // Try multiple possible data structures
        if (userData?.assignedBooks && Array.isArray(userData.assignedBooks)) {
          userSubjects = userData.assignedBooks.map((book: any) => book.subject || book.Subject).filter(Boolean);
        } else if (userData?.assignedSubjects && Array.isArray(userData.assignedSubjects)) {
          userSubjects = userData.assignedSubjects;
        } else if (userData?.subjects && Array.isArray(userData.subjects)) {
          userSubjects = userData.subjects;
        } else if (userData?.subject) {
          userSubjects = [userData.subject];
        }
      } else {
      }

      if (!userSubjects.includes(questionData.subject)) {
        return NextResponse.json(
          { error: `Unauthorized: You can only manage questions for your assigned subjects. Your subjects: ${userSubjects.join(', ') || 'None assigned'}. Question subject: ${questionData.subject}. Please contact admin to assign subjects.` },
          { status: 403 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to verify user permissions' },
        { status: 500 }
      );
    }

    if (action === 'approve') {
      // Move question to main question bank with retry logic
      const questionBankRef = collection(db, 'questions', 'oup', 'items');
      const approvedQuestion = {
        ...questionData,
        status: 'approved',
        approvedBy: userName || userId,
        approvedById: userId,
        approvedAt: new Date().toISOString(),
        feedback: feedback || ''
      };
      
      // Retry logic for Firebase operations
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;
      
      while (retryCount < maxRetries && !success) {
        try {
          await addDoc(questionBankRef, approvedQuestion);
          success = true;
        } catch (error: any) {
          retryCount++;
          
          if (retryCount < maxRetries) {
            // Wait before retrying (exponential backoff)
            const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw new Error(`Failed to approve question after ${maxRetries} attempts: ${error?.message || error}`);
          }
        }
      }
      
      // Update stats for approved question
      try {
        await updateOUPStats(questionData.subject, questionData.grade, questionData.type, questionData.difficulty);
      } catch (error) {
      }
    } else {
      // Update question status to rejected with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;
      
      while (retryCount < maxRetries && !success) {
        try {
          await updateDoc(doc(db, 'questions', 'approval_queue', 'items', questionId), {
            status: 'rejected',
            rejectedBy: userName || userId,
            rejectedById: userId,
            rejectedAt: new Date().toISOString(),
            feedback: feedback || ''
          });
          success = true;
        } catch (error: any) {
          retryCount++;
          
          if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw new Error(`Failed to reject question after ${maxRetries} attempts: ${error?.message || error}`);
          }
        }
      }
    }

    // Remove from approval queue if approved with retry logic
    if (action === 'approve') {
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;
      
      while (retryCount < maxRetries && !success) {
        try {
          await deleteDoc(doc(db, 'questions', 'approval_queue', 'items', questionId));
          success = true;
        } catch (error: any) {
          retryCount++;
          
          if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Don't throw error here as the approval was successful
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Question ${action}d successfully`,
      action
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 });
  }
}

// Helper function to update OUP stats
async function updateOUPStats(subject: string, grade: string, type: string, difficulty: string) {
  try {
    // This should match the implementation in the main questions route
    // You may need to implement this based on your existing stats structure
  } catch (error) {
  }
}
