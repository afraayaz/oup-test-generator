import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/firebase";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";

// GET - Fetch teacher questions with filters
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    const schoolId = request.headers.get("x-school-id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check authorization
    const allowedRoles = ["teacher", "admin", "school_admin"];
    if (!allowedRoles.includes(userRole || "")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    if (!schoolId) {
      return NextResponse.json(
        { error: "School ID is required" },
        { status: 400 }
      );
    }

    // Fetch teacher questions from questions/schools/{schoolId}
    const questionsRef = collection(db, 'questions', 'schools', schoolId);
    const snapshot = await getDocs(questionsRef);
    
    const questions = snapshot.docs.map((doc) => ({
      id: doc.id,
      source: "teacher",
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      questions,
    });
  } catch (error) {
    console.error("Error fetching teacher questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

// POST - Create new teacher question
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userName = request.headers.get("x-user-name");
    const userRole = request.headers.get("x-user-role");
    const schoolId = request.headers.get("x-school-id");
    const schoolName = request.headers.get("x-school-name");

    console.log('📝 Teacher question POST:', { userId, userName, userRole, schoolId, schoolName });

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (
      !body.subject ||
      !body.grade ||
      !body.book ||
      !body.chapter ||
      !body.type ||
      !body.questionText
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }


    // Store teacher question in questions/schools/{schoolId}
    if (!schoolId) {
      return NextResponse.json(
        { error: "School ID is required for teacher questions" },
        { status: 400 }
      );
    }
    const questionsRef = collection(db, 'questions', 'schools', schoolId);
    const questionDoc = await addDoc(questionsRef, {
      type: body.type,
      subject: body.subject,
      grade: body.grade,
      book: body.book,
      chapter: body.chapter,
      topic: body.topic || "",
      slo: body.slo || "",
      difficulty: body.difficulty || "Medium",
      questionText: body.questionText,
      options: body.type === "multiple" ? body.options || [] : [],
      correctAnswer: body.correctAnswer || "",
      explanation: body.explanation || "",
      blanks: body.type === "fillblanks" ? body.blanks || {} : {},
      createdBy: userId,
      createdByName: userName,
      createdAt: serverTimestamp(),
      updatedBy: userId,
      updatedAt: serverTimestamp(),
    });

    // Update school stats if schoolId is provided
    if (schoolId) {
      try {
        const statsRef = doc(db, "school-stats", schoolId);
        const statsDoc = await getDocs(collection(db, 'questions', 'schools', schoolId));
        
        // Calculate updated stats
        const stats: any = {
          schoolId: schoolId,
          schoolName: schoolName || schoolId,
          totalQuestions: statsDoc.size,
          questionsBySubject: {},
          questionsByGrade: {},
          questionsByType: {},
          questionsByDifficulty: {},
          lastUpdated: serverTimestamp(),
        };

        // Aggregate stats from all questions
        statsDoc.docs.forEach((doc: any) => {
          const q = doc.data();
          stats.questionsBySubject[q.subject] = (stats.questionsBySubject[q.subject] || 0) + 1;
          stats.questionsByGrade[q.grade] = (stats.questionsByGrade[q.grade] || 0) + 1;
          stats.questionsByType[q.type] = (stats.questionsByType[q.type] || 0) + 1;
          stats.questionsByDifficulty[q.difficulty || 'Medium'] = (stats.questionsByDifficulty[q.difficulty || 'Medium'] || 0) + 1;
        });

        console.log('💾 Updating stats at:', 'question-bank-stats/schools/' + schoolId, 'Total Questions:', stats.totalQuestions);
        await setDoc(statsRef, stats, { merge: true });
        console.log('✅ Stats updated successfully');
      } catch (statsError) {
        console.error("❌ Error updating school stats:", statsError);
      }
    }

    return NextResponse.json({
      success: true,
      questionId: questionDoc.id,
      message: "Question created successfully",
    });
  } catch (error) {
    console.error("Error creating question:", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}
