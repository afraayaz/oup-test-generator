import { NextRequest, NextResponse } from "next/server";
import { pgPool } from "@/lib/postgres";
import { db } from "@/firebase/firebase";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

function normalizeDifficulty(input: string): string {
  const d = (input || "Medium").trim().toLowerCase();
  if (d === "easy") return "Easy";
  if (d === "hard") return "Hard";
  return "Medium";
}

function normalizeAnswer(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "string") return raw;
  return JSON.stringify(raw);
}

function safeJson(value: any): any {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

async function getUserKeys(userId: string, userEmail?: string | null): Promise<Set<string>> {
  const keys = new Set<string>([String(userId)]);
  if (userEmail) {
    keys.add(String(userEmail));
    keys.add(String(userEmail).toLowerCase());
  }

  const colsRes = await pgPool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name IN ('id', 'uid', 'firebase_uid', 'email')
    `
  );
  const cols = new Set<string>(colsRes.rows.map((r: any) => r.column_name));
  const where: string[] = [];
  const values: any[] = [];

  if (userId && cols.has("uid")) {
    values.push(userId);
    where.push(`uid = $${values.length}`);
  }
  if (userId && cols.has("firebase_uid")) {
    values.push(userId);
    where.push(`firebase_uid = $${values.length}`);
  }
  if (userEmail && cols.has("email")) {
    values.push(userEmail.toLowerCase());
    where.push(`LOWER(email) = $${values.length}`);
  }

  if (where.length && cols.has("id")) {
    const sql = `SELECT id::text AS id FROM users WHERE ${where.join(" OR ")} LIMIT 1`;
    const res = await pgPool.query(sql, values);
    if (res.rows[0]?.id) keys.add(String(res.rows[0].id));
  }

  return keys;
}

// PUT - Update teacher question
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params;
  const userId = request.headers.get("x-user-id");
  const userEmail = request.headers.get("x-user-email");
  const userRole = request.headers.get("x-user-role");
  const schoolId = request.headers.get("x-school-id");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }
  if (!schoolId) {
    return NextResponse.json({ error: "School ID is required" }, { status: 400 });
  }

  const body = await request.json();

  try {
    const found = await pgPool.query(
      `
        SELECT id, created_by, interactive_data
        FROM questions
        WHERE id = $1
          AND qb_source = 'school'
          AND source_school_id = $2
        LIMIT 1
      `,
      [questionId, schoolId]
    );
    if (!found.rowCount) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const existing = found.rows[0];
    const creatorKeys = await getUserKeys(userId, userEmail);
    const isAdmin = ["admin", "school_admin"].includes((userRole || "").toLowerCase());
    if (!isAdmin && !creatorKeys.has(String(existing.created_by))) {
      return NextResponse.json(
        { error: "Unauthorized to update this question" },
        { status: 403 }
      );
    }

    const setParts: string[] = [];
    const values: any[] = [];

    if (body.questionText || body.question) {
      values.push(body.questionText || body.question);
      setParts.push(`question_text = $${values.length}`);
    }
    if (body.chapter !== undefined) {
      values.push(body.chapter || "");
      setParts.push(`chapter = $${values.length}`);
    }
    if (body.difficulty !== undefined) {
      values.push(normalizeDifficulty(body.difficulty || "Medium"));
      setParts.push(`difficulty = $${values.length}`);
    }
    if (body.explanation !== undefined) {
      values.push(body.explanation || "");
      setParts.push(`explanation = $${values.length}`);
    }
    if (body.correctAnswer !== undefined) {
      values.push(normalizeAnswer(body.correctAnswer));
      setParts.push(`answer = $${values.length}`);
    }

    const nextInteractive = {
      ...(safeJson(existing.interactive_data) || {}),
    } as any;
    if (Array.isArray(body.options)) nextInteractive.options = body.options;
    if (body.blanks) nextInteractive.blanks = body.blanks;
    if (body.topic !== undefined) nextInteractive.topic = body.topic || "";
    if (body.interactiveData && typeof body.interactiveData === "object") {
      Object.assign(nextInteractive, body.interactiveData);
    }
    values.push(JSON.stringify(nextInteractive));
    setParts.push(`interactive_data = $${values.length}::jsonb`);

    values.push(questionId);
    values.push(schoolId);
    await pgPool.query(
      `
        UPDATE questions
        SET ${setParts.join(", ")}, updated_at = NOW()
        WHERE id = $${values.length - 1}
          AND source_school_id = $${values.length}
          AND qb_source = 'school'
      `,
      values
    );

    return NextResponse.json({ success: true, message: "Question updated successfully" });
  } catch (pgError) {
    console.error("[teacher/questions/:id][PUT] PostgreSQL failed, falling back to Firebase:", pgError);
    try {
      const questionRef = doc(db, "questions", "schools", schoolId, questionId);
      const questionSnap = await getDoc(questionRef);
      if (!questionSnap.exists()) {
        return NextResponse.json({ error: "Question not found" }, { status: 404 });
      }
      const question = questionSnap.data();
      if (
        question.createdBy !== userId &&
        (userRole || "").toLowerCase() !== "admin" &&
        (userRole || "").toLowerCase() !== "school_admin"
      ) {
        return NextResponse.json({ error: "Unauthorized to update this question" }, { status: 403 });
      }
      await updateDoc(questionRef, {
        ...body,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      });
      return NextResponse.json({ success: true, message: "Question updated successfully" });
    } catch (firebaseError) {
      console.error("[teacher/questions/:id][PUT] Firebase fallback failed:", firebaseError);
      return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
    }
  }
}

// DELETE - Delete teacher question
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questionId } = await params;
  const userId = request.headers.get("x-user-id");
  const userEmail = request.headers.get("x-user-email");
  const userRole = request.headers.get("x-user-role");
  const schoolId = request.headers.get("x-school-id");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }
  if (!schoolId) {
    return NextResponse.json({ error: "School ID is required" }, { status: 400 });
  }

  try {
    const found = await pgPool.query(
      `
        SELECT id, created_by
        FROM questions
        WHERE id = $1
          AND qb_source = 'school'
          AND source_school_id = $2
        LIMIT 1
      `,
      [questionId, schoolId]
    );
    if (!found.rowCount) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const creatorKeys = await getUserKeys(userId, userEmail);
    const isAdmin = ["admin", "school_admin"].includes((userRole || "").toLowerCase());
    if (!isAdmin && !creatorKeys.has(String(found.rows[0].created_by))) {
      return NextResponse.json(
        { error: "Unauthorized to delete this question" },
        { status: 403 }
      );
    }

    await pgPool.query(
      `
        DELETE FROM questions
        WHERE id = $1
          AND source_school_id = $2
          AND qb_source = 'school'
      `,
      [questionId, schoolId]
    );
    return NextResponse.json({ success: true, message: "Question deleted successfully" });
  } catch (pgError) {
    console.error("[teacher/questions/:id][DELETE] PostgreSQL failed, falling back to Firebase:", pgError);
    try {
      const questionRef = doc(db, "questions", "schools", schoolId, questionId);
      const questionSnap = await getDoc(questionRef);
      if (!questionSnap.exists()) {
        return NextResponse.json({ error: "Question not found" }, { status: 404 });
      }
      const question = questionSnap.data();
      if (
        question.createdBy !== userId &&
        (userRole || "").toLowerCase() !== "admin" &&
        (userRole || "").toLowerCase() !== "school_admin"
      ) {
        return NextResponse.json({ error: "Unauthorized to delete this question" }, { status: 403 });
      }

      await deleteDoc(questionRef);
      return NextResponse.json({ success: true, message: "Question deleted successfully" });
    } catch (firebaseError) {
      console.error("[teacher/questions/:id][DELETE] Firebase fallback failed:", firebaseError);
      return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
    }
  }
}
