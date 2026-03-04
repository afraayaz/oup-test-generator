import { NextRequest, NextResponse } from "next/server";
import { pgPool } from "@/lib/postgres";
import { refreshContentCreatorStats } from "@/lib/contentCreatorStats";

function normalizeGrade(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  // Extract the numeric part from "Grade X" or "Class X"
  const match = trimmed.match(/^(?:grade|class)\s+(\d+)/i);
  if (match) {
    return `Grade ${match[1]}`;
  }
  // If it's just a number, add "Grade" prefix
  return `Grade ${trimmed}`;
}

function normalizeDifficulty(input: string): string {
  const d = (input || "Medium").trim().toLowerCase();
  if (d === "easy") return "Easy";
  if (d === "hard") return "Hard";
  return "Medium";
}

function normalizeType(input: string): string {
  const map: Record<string, string> = {
    mcq: "multiple",
    multiple: "multiple",
    true_false: "truefalse",
    truefalse: "truefalse",
    short_answer: "short",
    short: "short",
    long_answer: "long",
    long: "long",
    fill_in_the_blank: "fillblanks",
    fillblanks: "fillblanks",
  };
  const key = (input || "").trim().toLowerCase();
  return map[key] || key;
}

function normalizeAnswer(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "string") return raw;
  return JSON.stringify(raw);
}

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

async function getCreatorKeys(userId: string, userEmail?: string | null): Promise<string[]> {
  const colsRes = await pgPool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name IN ('uid', 'firebase_uid', 'email')
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

  const keys = new Set<string>([String(userId)]);
  if (userEmail) {
    keys.add(String(userEmail));
    keys.add(String(userEmail).toLowerCase());
  }
  if (where.length) {
    const sql = `SELECT id::text AS id FROM users WHERE ${where.join(" OR ")} LIMIT 1`;
    const res = await pgPool.query(sql, values);
    if (res.rows[0]?.id) keys.add(String(res.rows[0].id));
  }

  return Array.from(keys);
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userEmail = request.headers.get("x-user-email");
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 401 });
    }

    const subject = request.nextUrl.searchParams.get("subject");
    const grade = request.nextUrl.searchParams.get("grade");
    const book = request.nextUrl.searchParams.get("book");
    const chapter = request.nextUrl.searchParams.get("chapter");
    const difficulty = request.nextUrl.searchParams.get("difficulty");

    const creatorKeys = await getCreatorKeys(userId, userEmail);
    const where: string[] = ["qb_source = 'oup'", `created_by::text = ANY($1::text[])`];
    const values: any[] = [creatorKeys];

    if (subject) {
      values.push(subject);
      where.push(`subject = $${values.length}`);
    }
    if (grade) {
      values.push(normalizeGrade(grade));
      where.push(`grade = $${values.length}`);
    }
    if (book) {
      values.push(book);
      where.push(`book = $${values.length}`);
    }
    if (chapter) {
      values.push(chapter);
      where.push(`chapter = $${values.length}`);
    }
    if (difficulty) {
      values.push(normalizeDifficulty(difficulty));
      where.push(`difficulty = $${values.length}`);
    }

    const sql = `
      SELECT
        id,
        question_text AS "questionText",
        type,
        subject,
        grade,
        book,
        book_id AS "bookId",
        chapter,
        slo,
        difficulty,
        explanation,
        answer AS "correctAnswer",
        marks,
        qb_source AS source,
        is_interactive AS "isInteractive",
        interactive_data AS "interactiveData",
        image_url AS "imageUrl",
        created_by AS "createdBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        cognitive_level AS "cognitiveLevel"
      FROM questions
      WHERE ${where.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT 5000
    `;

    const { rows } = await pgPool.query(sql, values);

    return NextResponse.json({
      success: true,
      questions: rows,
      total: rows.length,
    });
  } catch (error) {
    console.error("Failed to fetch OUP questions from PostgreSQL:", error);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userRole = request.headers.get("x-user-role");
    const userId = request.headers.get("x-user-id");
    const userEmail = request.headers.get("x-user-email");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 401 });
    }

    if (!["oup-creator", "content_creator", "oup-admin"].includes(userRole || "")) {
      return NextResponse.json(
        { error: "Unauthorized: Only OUP creators can add questions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const normalizedType = normalizeType(body.type || "");
    const normalizedGrade = normalizeGrade(body.grade || "");
    const normalizedDifficulty = normalizeDifficulty(body.difficulty || "Medium");

    const questionText = body.questionText || body.question || "";
    if (!questionText || !body.subject || !normalizedType || !normalizedGrade) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const options = normalizedType === "multiple" ? (Array.isArray(body.options) ? body.options : []) : [];
    const blanks = normalizedType === "fillblanks" ? (body.blanks || {}) : {};
    const cognitiveLevel = body.cognitiveLevel || {
      knowledge: false,
      understanding: false,
      application: false,
    };

    // Debug logging for MCQ options
    if (normalizedType === "multiple") {
      console.log('[POST /api/oup-creator/questions] MCQ Question received');
      console.log('  - Question:', questionText.substring(0, 50));
      console.log('  - body.options:', body.options);
      console.log('  - Extracted options:', options);
    }

    const interactiveData = body.isInteractiveQuestion && body.interactiveData ? body.interactiveData : null;
    const isInteractive = Boolean(body.isInteractiveQuestion && body.interactiveData);
    const hasBookId = await hasQuestionsBookIdColumn();
    const resolvedBookId = hasBookId
      ? await resolveBookId(body.subject || "", body.book || "", normalizedGrade)
      : null;

    const sqlWithBookId = `
      INSERT INTO questions (
        question_text,
        type,
        subject,
        grade,
        book,
        book_id,
        chapter,
        slo,
        difficulty,
        answer,
        explanation,
        marks,
        qb_source,
        source_school_id,
        is_interactive,
        interactive_data,
        image_url,
        created_by,
        created_at,
        updated_at,
        cognitive_level
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'oup',NULL,$13,$14::jsonb,$15,$16,NOW(),NOW(),$17::jsonb
      )
      RETURNING id
    `;

    const sqlWithoutBookId = `
      INSERT INTO questions (
        question_text,
        type,
        subject,
        grade,
        book,
        chapter,
        slo,
        difficulty,
        answer,
        explanation,
        marks,
        qb_source,
        source_school_id,
        is_interactive,
        interactive_data,
        image_url,
        created_by,
        created_at,
        updated_at,
        cognitive_level
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'oup',NULL,$12,$13::jsonb,$14,$15,NOW(),NOW(),$16::jsonb
      )
      RETURNING id
    `;

    const creatorKeys = await getCreatorKeys(userId, userEmail);
    const createdByValue = creatorKeys.find((k) => k !== userId) || userId;

    const interactiveDataJson = JSON.stringify({
      options,
      blanks,
      topic: body.topic || "",
      interactiveData,
    });

    // Debug: Log what will be stored in interactive_data
    if (normalizedType === "multiple") {
      console.log('[POST /api/oup-creator/questions] Storing interactive_data:', interactiveDataJson);
    }

    const baseValues = [
      questionText,
      normalizedType,
      body.subject || "",
      normalizedGrade,
      body.book || "",
      body.chapter || "",
      body.slo || "",
      normalizedDifficulty,
      normalizeAnswer(body.correctAnswer),
      body.explanation || "",
      Number.isFinite(body.marks) ? body.marks : 1,
      isInteractive,
      interactiveDataJson,
      body.imageUrl || null,
      createdByValue,
      JSON.stringify(cognitiveLevel),
    ] as const;

    const result = hasBookId
      ? await pgPool.query(sqlWithBookId, [
          baseValues[0],
          baseValues[1],
          baseValues[2],
          baseValues[3],
          baseValues[4],
          resolvedBookId,
          baseValues[5],
          baseValues[6],
          baseValues[7],
          baseValues[8],
          baseValues[9],
          baseValues[10],
          baseValues[11],
          baseValues[12],
          baseValues[13],
          baseValues[14],
          baseValues[15],
        ])
      : await pgPool.query(sqlWithoutBookId, baseValues);
    await refreshContentCreatorStats(userId, userEmail);

    return NextResponse.json({
      success: true,
      questionId: result.rows[0].id,
      message: "Question added successfully",
      needsApproval: false,
    });
  } catch (error) {
    console.error("Failed to create OUP question in PostgreSQL:", error);
    return NextResponse.json({ error: "Failed to add question" }, { status: 500 });
  }
}
