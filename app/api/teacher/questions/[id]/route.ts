import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebase/firebase";
import { doc, updateDoc, deleteDoc, getDoc, serverTimestamp, collection, getDocs, setDoc } from "firebase/firestore";

// PUT - Update teacher question
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params;
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    const schoolId = request.headers.get("x-school-id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!schoolId) {
      return NextResponse.json(
        { error: "School ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Get the question to check ownership
    const questionRef = doc(db, "questions", "schools", schoolId, questionId);
    const questionSnap = await getDoc(questionRef);

    if (!questionSnap.exists()) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    const question = questionSnap.data();

    // Check ownership or admin
    if (question.createdBy !== userId && userRole !== "admin" && userRole !== "school_admin") {
      return NextResponse.json(
        { error: "Unauthorized to update this question" },
        { status: 403 }
      );
    }

    // Update question
    await updateDoc(questionRef, {
      ...body,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });

    return NextResponse.json({
      success: true,
      message: "Question updated successfully",
    });
  } catch (error) {
    console.error("Error updating question:", error);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

// DELETE - Delete teacher question
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: questionId } = await params;
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    const schoolId = request.headers.get("x-school-id");
    const schoolName = request.headers.get("x-school-name");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!schoolId) {
      return NextResponse.json(
        { error: "School ID is required" },
        { status: 400 }
      );
    }

    // Get the question to check ownership
    const questionRef = doc(db, "questions", "schools", schoolId, questionId);
    const questionSnap = await getDoc(questionRef);

    if (!questionSnap.exists()) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    const question = questionSnap.data();

    // Check ownership or admin
    if (question.createdBy !== userId && userRole !== "admin" && userRole !== "school_admin") {
      return NextResponse.json(
        { error: "Unauthorized to delete this question" },
        { status: 403 }
      );
    }

    // Delete question
    await deleteDoc(questionRef);

    // Recalculate and update school stats
    try {
      const statsRef = doc(db, "school-stats", schoolId);
      const statsDoc = await getDocs(collection(db, 'questions', 'schools', schoolId));
      
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

      statsDoc.docs.forEach((doc: any) => {
        const q = doc.data();
        stats.questionsBySubject[q.subject] = (stats.questionsBySubject[q.subject] || 0) + 1;
        stats.questionsByGrade[q.grade] = (stats.questionsByGrade[q.grade] || 0) + 1;
        stats.questionsByType[q.type] = (stats.questionsByType[q.type] || 0) + 1;
        stats.questionsByDifficulty[q.difficulty || 'Medium'] = (stats.questionsByDifficulty[q.difficulty || 'Medium'] || 0) + 1;
      });

      await setDoc(statsRef, stats, { merge: true });
    } catch (statsError) {
      console.error("❌ Error updating school stats after deletion:", statsError);
    }

    return NextResponse.json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}
