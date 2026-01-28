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
          console.log('User data for GET method:', {
            userId,
            userData: userData,
            assignedBooks: userData?.assignedBooks
          });
          
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
          
          console.log('Extracted subjects for filtering:', userSubjects);
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
        console.error('Error fetching user data:', error);
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
    console.error('Error fetching approval queue:', error);
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
      console.log('Checking authorization for userId:', userId);
      
      // First try to get user by document ID
      let userDoc = await adminDb.collection('users').doc(userId).get();
      let userData = null;
      
      if (!userDoc.exists) {
        console.log('User not found by document ID, trying to query by uid field');
        // Try to query by uid field instead
        const userQuery = await adminDb.collection('users').where('uid', '==', userId).limit(1).get();
        if (!userQuery.empty) {
          userDoc = userQuery.docs[0];
          userData = userDoc.data();
          console.log('Found user by uid field');
        } else {
          // Try to query by other possible fields
          const emailQuery = await adminDb.collection('users').where('email', '==', userName).limit(1).get();
          if (!emailQuery.empty) {
            userDoc = emailQuery.docs[0];
            userData = userDoc.data();
            console.log('Found user by email field');
          }
        }
      } else {
        userData = userDoc.data();
        console.log('Found user by document ID');
      }
      
      let userSubjects: string[] = [];
      
      if (userData) {
        console.log('User data for authorization check:', {
          userId,
          userData: userData,
          assignedBooks: userData?.assignedBooks,
          questionSubject: questionData.subject
        });
        
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
        
        console.log('Extracted subjects:', userSubjects);
      } else {
        console.log('User document does not exist for userId:', userId, 'and userName:', userName);
      }

      if (!userSubjects.includes(questionData.subject)) {
        return NextResponse.json(
          { error: `Unauthorized: You can only manage questions for your assigned subjects. Your subjects: ${userSubjects.join(', ') || 'None assigned'}. Question subject: ${questionData.subject}. Please contact admin to assign subjects.` },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error('Error fetching user data for authorization:', error);
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
          console.log('[Approval] Successfully moved question to main bank');
        } catch (error: any) {
          retryCount++;
          console.error(`[Approval] Attempt ${retryCount} failed:`, error?.message || error);
          
          if (retryCount < maxRetries) {
            // Wait before retrying (exponential backoff)
            const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
            console.log(`[Approval] Retrying in ${delay}ms...`);
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
        console.error('[Approval] Failed to update stats (non-critical):', error);
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
          console.log('[Approval] Successfully updated question status to rejected');
        } catch (error: any) {
          retryCount++;
          console.error(`[Approval] Rejection attempt ${retryCount} failed:`, error?.message || error);
          
          if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
            console.log(`[Approval] Retrying rejection in ${delay}ms...`);
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
          console.log('[Approval] Successfully removed question from approval queue');
        } catch (error: any) {
          retryCount++;
          console.error(`[Approval] Delete attempt ${retryCount} failed:`, error?.message || error);
          
          if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000;
            console.log(`[Approval] Retrying delete in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            console.error(`Failed to remove from approval queue after ${maxRetries} attempts, but question was approved successfully`);
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
    console.error('Error processing question approval:', error);
    return NextResponse.json({ error: 'Failed to process approval' }, { status: 500 });
  }
}

// Helper function to update OUP stats
async function updateOUPStats(subject: string, grade: string, type: string, difficulty: string) {
  try {
    // This should match the implementation in the main questions route
    // You may need to implement this based on your existing stats structure
    console.log('Updating OUP stats for approved question:', { subject, grade, type, difficulty });
  } catch (error) {
    console.error('Error updating OUP stats:', error);
  }
}