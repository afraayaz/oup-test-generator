import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/firebase";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp, limit } from "firebase/firestore";

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

    const { searchParams } = new URL(request.url);
    const qb = searchParams.get("qb") || "school"; // Default to 'school'

    if (!schoolId && (qb === "school" || qb === "both")) {
      return NextResponse.json(
        { error: "School ID is required for school questions" },
        { status: 400 }
      );
    }

    let allQuestions: any[] = [];

    // Fetch from school questions if qb is 'school' or 'both'
    if (qb === "school" || qb === "both") {
      if (schoolId) {
        const schoolQuestionsRef = collection(db, 'questions', 'schools', schoolId);
        const schoolQuery = query(schoolQuestionsRef, limit(500));
        const schoolSnapshot = await getDocs(schoolQuery);
        const schoolQuestions = schoolSnapshot.docs.map((doc) => ({
          id: doc.id,
          source: "school",
          ...doc.data(),
        }));
        allQuestions = allQuestions.concat(schoolQuestions);
      }
    }

    // Fetch from OUP questions if qb is 'oup' or 'both'
    if (qb === "oup" || qb === "both") {
      const oupQuestionsRef = collection(db, 'questions', 'oup', 'items');
      const oupQuery = query(oupQuestionsRef, limit(500));
      const oupSnapshot = await getDocs(oupQuery);
      const oupQuestions = oupSnapshot.docs.map((doc) => ({
        id: doc.id,
        source: "oup",
        ...doc.data(),
      }));
      allQuestions = allQuestions.concat(oupQuestions);
    }

    return NextResponse.json({
      success: true,
      questions: allQuestions,
    });
  } catch (error) {
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
    
    // Normalize grade to always have "Grade " prefix for consistent matching in quiz builder
    let normalizedGrade = body.grade || "";
    if (normalizedGrade && !normalizedGrade.toLowerCase().startsWith('grade ') && !normalizedGrade.toLowerCase().startsWith('class ')) {
      normalizedGrade = `Grade ${normalizedGrade}`;
    }
    
    // Normalize difficulty to canonical title case (Easy/Medium/Hard)
    const difficultyRaw = (body.difficulty || 'Medium').toString().trim().toLowerCase();
    const normalizedDifficulty = difficultyRaw.startsWith('easy') ? 'Easy' :
                                 difficultyRaw.startsWith('hard') ? 'Hard' :
                                 'Medium';
    
    // Log the question being saved
    
    const questionDoc = await addDoc(questionsRef, {
      type: body.type,
      subject: body.subject,
      grade: normalizedGrade, // Store with normalized format
      book: body.book,
      chapter: body.chapter,
      topic: body.topic || "",
      slo: body.slo || "",
      difficulty: normalizedDifficulty,
      questionText: body.questionText,
      options: body.type === "multiple" ? body.options || [] : [],
      correctAnswer: body.correctAnswer || "",
      explanation: body.explanation || "",
      blanks: body.type === "fillblanks" ? body.blanks || {} : {},
      cognitiveLevel: body.cognitiveLevel || {
        knowledge: false,
        understanding: false,
        application: false,
      },
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
        await setDoc(statsRef, stats, { merge: true });
      } catch (statsError) {
      }
    }

    return NextResponse.json({
      success: true,
      questionId: questionDoc.id,
      message: "Question created successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}
