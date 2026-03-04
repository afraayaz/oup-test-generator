import { NextRequest, NextResponse } from "next/server";
import { pgPool } from "@/lib/postgres";
import { refreshContentCreatorStats } from "@/lib/contentCreatorStats";

let hasQuestionsBookIdColumnCache: boolean | null = null;

async function hasQuestionsBookIdColumn(): Promise<boolean> {
  if (hasQuestionsBookIdColumnCache !== null) return hasQuestionsBookIdColumnCache;
  const res = await pgPool.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'questions'
        AND column_name = 'book_id'
      LIMIT 1
    `
  );
  hasQuestionsBookIdColumnCache = res.rowCount > 0;
  return hasQuestionsBookIdColumnCache;
}

async function resolveBookId(subject?: string, book?: string, grade?: string): Promise<number | null> {
  const s = (subject || "").trim();
  const b = (book || "").trim();
  const g = (grade || "").trim();
  if (!s || !b) return null;

  const byGrade = await pgPool.query(
    `
      SELECT bk.id
      FROM books bk
      JOIN subjects sb ON sb.id = bk.subject_id
      WHERE LOWER(sb.name) = LOWER($1)
        AND LOWER(bk.title) = LOWER($2)
        AND LOWER(COALESCE(bk.grade, '')) = LOWER(COALESCE($3, ''))
      ORDER BY bk.id DESC
      LIMIT 1
    `,
    [s, b, g || null]
  );
  if (byGrade.rowCount) return Number(byGrade.rows[0].id);

  const fallback = await pgPool.query(
    `
      SELECT bk.id
      FROM books bk
      JOIN subjects sb ON sb.id = bk.subject_id
      WHERE LOWER(sb.name) = LOWER($1)
        AND LOWER(bk.title) = LOWER($2)
      ORDER BY bk.id DESC
      LIMIT 1
    `,
    [s, b]
  );
  return fallback.rowCount ? Number(fallback.rows[0].id) : null;
}

async function resolveCreatorKeys(userId: string): Promise<{ uid: string; userPkText: string | null }> {
  const colsRes = await pgPool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name IN ('uid', 'firebase_uid')
    `
  );
  const cols = new Set<string>(colsRes.rows.map((r: any) => r.column_name));
  const where: string[] = [];
  const values: any[] = [];

  if (cols.has("uid")) {
    values.push(userId);
    where.push(`uid = $${values.length}`);
  }
  if (cols.has("firebase_uid")) {
    values.push(userId);
    where.push(`firebase_uid = $${values.length}`);
  }
  if (!where.length) {
    return { uid: userId, userPkText: null };
  }

  const sql = `SELECT id::text AS id FROM users WHERE ${where.join(" OR ")} LIMIT 1`;
  const userPk = await pgPool.query(sql, values);
  return { uid: userId, userPkText: userPk.rows[0]?.id || null };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: questionId } = await params;
    const userRole = request.headers.get("x-user-role");
    const userId = request.headers.get("x-user-id");

    if (!["oup-creator", "content_creator", "oup-admin"].includes(userRole || "")) {
      return NextResponse.json(
        { error: "Unauthorized: Only content creators can update questions" },
        { status: 403 }
      );
    }
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 401 });
    }

    const found = await pgPool.query(
      `SELECT id, created_by, subject, book, grade
       FROM questions
       WHERE id = $1 AND qb_source = 'oup'
       LIMIT 1`,
      [questionId]
    );

    if (!found.rowCount) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const { uid, userPkText } = await resolveCreatorKeys(userId);
    const createdByText = String(found.rows[0].created_by ?? "");
    const isOwner = createdByText === uid || (userPkText ? createdByText === userPkText : false);
    if (userRole !== "oup-admin" && !isOwner) {
      return NextResponse.json(
        { error: "Unauthorized: You can only update your own questions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updateFields: string[] = [];
    const values: any[] = [];

    const push = (field: string, value: any) => {
      values.push(value);
      updateFields.push(`${field} = $${values.length}`);
    };

    if (body.questionText !== undefined) push("question_text", body.questionText);
    if (body.type !== undefined) push("type", body.type);
    if (body.subject !== undefined) push("subject", body.subject);
    if (body.grade !== undefined) push("grade", body.grade);
    if (body.book !== undefined) push("book", body.book);
    if (body.chapter !== undefined) push("chapter", body.chapter);
    if (body.slo !== undefined) push("slo", body.slo);
    if (body.difficulty !== undefined) push("difficulty", body.difficulty);
    if (body.explanation !== undefined) push("explanation", body.explanation);
    if (body.correctAnswer !== undefined) {
      const answer =
        typeof body.correctAnswer === "string" ? body.correctAnswer : JSON.stringify(body.correctAnswer);
      push("answer", answer);
    }
    if (body.marks !== undefined) push("marks", body.marks);
    if (body.imageUrl !== undefined) push("image_url", body.imageUrl);
    if (body.cognitiveLevel !== undefined) {
      values.push(JSON.stringify(body.cognitiveLevel));
      updateFields.push(`cognitive_level = $${values.length}::jsonb`);
    }
    if (body.interactiveData !== undefined) {
      values.push(JSON.stringify(body.interactiveData));
      updateFields.push(`interactive_data = $${values.length}::jsonb`);
      push("is_interactive", Boolean(body.interactiveData));
    }

    if (await hasQuestionsBookIdColumn()) {
      const nextSubject = body.subject !== undefined ? body.subject : found.rows[0].subject;
      const nextBook = body.book !== undefined ? body.book : found.rows[0].book;
      const nextGrade = body.grade !== undefined ? body.grade : found.rows[0].grade;
      const nextBookId = await resolveBookId(nextSubject, nextBook, nextGrade);
      push("book_id", nextBookId);
    }

    push("updated_at", new Date().toISOString());

    if (updateFields.length) {
      values.push(questionId);
      await pgPool.query(
        `UPDATE questions
         SET ${updateFields.join(", ")}
         WHERE id = $${values.length} AND qb_source = 'oup'`,
        values
      );
      await refreshContentCreatorStats(userId);
    }

    return NextResponse.json({
      success: true,
      questionId,
      message: "Question updated successfully",
    });
  } catch (error) {
    console.error("Error updating OUP question:", error);
    return NextResponse.json({ error: "Failed to update question" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: questionId } = await params;
    const userRole = request.headers.get("x-user-role");
    const userId = request.headers.get("x-user-id");

    if (!["oup-creator", "content_creator", "oup-admin"].includes(userRole || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 401 });
    }

    const found = await pgPool.query(
      `SELECT id, created_by
       FROM questions
       WHERE id = $1 AND qb_source = 'oup'
       LIMIT 1`,
      [questionId]
    );

    if (!found.rowCount) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const { uid, userPkText } = await resolveCreatorKeys(userId);
    const createdByText = String(found.rows[0].created_by ?? "");
    const isOwner = createdByText === uid || (userPkText ? createdByText === userPkText : false);
    if (userRole !== "oup-admin" && !isOwner) {
      return NextResponse.json(
        { error: "Unauthorized: You can only delete your own questions" },
        { status: 403 }
      );
    }

    await pgPool.query(
      `DELETE FROM questions
       WHERE id = $1 AND qb_source = 'oup'`,
      [questionId]
    );
    await refreshContentCreatorStats(userId);

    return NextResponse.json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting OUP question:", error);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}
