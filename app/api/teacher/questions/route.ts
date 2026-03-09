import { NextRequest, NextResponse } from "next/server";
import { pgPool } from "@/lib/postgres";
import { db } from "@/firebase/firebase";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
} from "firebase/firestore";

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

type PgErrorLike = {
  code?: string;
  constraint?: string;
};

function isQuestionsPrimaryKeyConflict(error: unknown): boolean {
  const pgError = error as PgErrorLike | undefined;
  return pgError?.code === "23505" && pgError?.constraint === "questions_pkey";
}

async function realignQuestionsIdSequence(): Promise<void> {
  await pgPool.query(`
    SELECT setval(
      pg_get_serial_sequence('public.questions', 'id'),
      COALESCE((SELECT MAX(id) FROM public.questions), 0) + 1,
      false
    )
  `);
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

let hasQuestionsSchoolIdColumnCache: boolean | null = null;
async function hasQuestionsSchoolIdColumn(): Promise<boolean> {
  if (hasQuestionsSchoolIdColumnCache !== null) return hasQuestionsSchoolIdColumnCache;
  const res = await pgPool.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'questions'
        AND column_name = 'school_id'
      LIMIT 1
    `
  );
  hasQuestionsSchoolIdColumnCache = res.rowCount > 0;
  return hasQuestionsSchoolIdColumnCache;
}

let hasQuestionsSourceSchoolPkColumnCache: boolean | null = null;
async function hasQuestionsSourceSchoolPkColumn(): Promise<boolean> {
  if (hasQuestionsSourceSchoolPkColumnCache !== null) return hasQuestionsSourceSchoolPkColumnCache;
  const res = await pgPool.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'questions'
        AND column_name = 'source_school_pk'
      LIMIT 1
    `
  );
  hasQuestionsSourceSchoolPkColumnCache = res.rowCount > 0;
  return hasQuestionsSourceSchoolPkColumnCache;
}

let hasQuestionsSourceSchoolIdColumnCache: boolean | null = null;
async function hasQuestionsSourceSchoolIdColumn(): Promise<boolean> {
  if (hasQuestionsSourceSchoolIdColumnCache !== null) return hasQuestionsSourceSchoolIdColumnCache;
  const res = await pgPool.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'questions'
        AND column_name = 'source_school_id'
      LIMIT 1
    `
  );
  hasQuestionsSourceSchoolIdColumnCache = res.rowCount > 0;
  return hasQuestionsSourceSchoolIdColumnCache;
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

async function getUserKeys(userId: string, userEmail?: string | null): Promise<string[]> {
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

async function fetchTeacherQuestionsFromFirebase(
  schoolId: string | null,
  qb: string,
  userId?: string | null,
  mine?: boolean
): Promise<any[]> {
  let allQuestions: any[] = [];

  if ((qb === "school" || qb === "both") && schoolId) {
    const schoolQuestionsRef = collection(db, "questions", "schools", schoolId);
    const schoolQuery = query(schoolQuestionsRef, limit(5000));
    const schoolSnapshot = await getDocs(schoolQuery);
    const schoolQuestions = schoolSnapshot.docs.map((d) => ({
      id: d.id,
      source: "school",
      ...d.data(),
    }));
    allQuestions = allQuestions.concat(schoolQuestions);
  }

  if (qb === "oup" || qb === "both") {
    const oupQuestionsRef = collection(db, "questions", "oup", "items");
    const oupQuery = query(oupQuestionsRef, limit(5000));
    const oupSnapshot = await getDocs(oupQuery);
    const oupQuestions = oupSnapshot.docs.map((d) => ({
      id: d.id,
      source: "oup",
      ...d.data(),
    }));
    allQuestions = allQuestions.concat(oupQuestions);
  }

  if (mine && userId) {
    allQuestions = allQuestions.filter((q: any) => {
      const createdBy = q.createdBy || q.created_by || null;
      return createdBy && String(createdBy) === String(userId);
    });
  }

  return allQuestions;
}

// GET - Fetch teacher questions with filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = request.headers.get("x-user-id") || searchParams.get("userId");
  const userEmail = request.headers.get("x-user-email") || searchParams.get("userEmail");
  const userRole = request.headers.get("x-user-role") || searchParams.get("userRole") || "teacher";
  const schoolId = request.headers.get("x-school-id") || searchParams.get("schoolId");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const allowedRoles = ["teacher", "admin", "school_admin"];
  if (!allowedRoles.includes((userRole || "").toLowerCase())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const qb = (searchParams.get("qb") || "school").toLowerCase();
  const subject = searchParams.get("subject");
  const grade = searchParams.get("grade");
  const book = searchParams.get("book");
  const chapter = searchParams.get("chapter");
  const difficulty = searchParams.get("difficulty");
  const mine = (searchParams.get("mine") || "false").toLowerCase() === "true";

  if (!schoolId && (qb === "school" || qb === "both")) {
    return NextResponse.json(
      { error: "School ID is required for school questions" },
      { status: 400 }
    );
  }

  try {
    const where: string[] = [];
    const values: any[] = [];

    if (qb === "school") {
      values.push(schoolId);
      where.push(`qb_source = 'school' AND source_school_id = $${values.length}`);
    } else if (qb === "oup") {
      where.push(`qb_source = 'oup'`);
    } else {
      values.push(schoolId);
      where.push(`((qb_source = 'school' AND source_school_id = $${values.length}) OR qb_source = 'oup')`);
    }

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

    if (mine) {
      const creatorKeys = await getUserKeys(userId, userEmail);
      values.push(creatorKeys);
      where.push(`created_by::text = ANY($${values.length}::text[])`);
    }

    const sql = `
      SELECT
        q.id::text AS id,
        q.question_text AS "questionText",
        q.type,
        q.subject,
        q.grade,
        q.book,
        q.chapter,
        q.slo,
        q.difficulty,
        q.answer AS "correctAnswer",
        q.explanation,
        q.marks,
        q.qb_source AS source,
        q.source_school_id AS "schoolId",
        q.is_interactive AS "isInteractive",
        q.interactive_data AS "interactiveData",
        q.image_url AS "imageUrl",
        q.created_by AS "createdBy",
        COALESCE(
          NULLIF(TRIM(CONCAT(COALESCE(creator.first_name, ''), ' ', COALESCE(creator.last_name, ''))), ''),
          creator.email,
          q.created_by::text
        ) AS "createdByName",
        q.created_at AS "createdAt",
        q.updated_at AS "updatedAt",
        q.cognitive_level AS "cognitiveLevel"
      FROM questions q
      LEFT JOIN users creator
        ON creator.id::text = q.created_by::text
        OR COALESCE(to_jsonb(creator)->>'uid', '') = q.created_by::text
        OR COALESCE(to_jsonb(creator)->>'firebase_uid', '') = q.created_by::text
        OR LOWER(COALESCE(creator.email, '')) = LOWER(q.created_by::text)
      WHERE ${where.join(" AND ")}
      ORDER BY q.created_at DESC
      LIMIT 5000
    `;

    const { rows } = await pgPool.query(sql, values);
    const questions = rows.map((row: any) => {
      const interactiveData = safeJson(row.interactiveData);
      return {
        ...row,
        options: Array.isArray(interactiveData?.options) ? interactiveData.options : [],
        blanks: interactiveData?.blanks || {},
      };
    });

    return NextResponse.json({ success: true, questions });
  } catch (pgError) {
    console.error("[teacher/questions][GET] PostgreSQL failed, falling back to Firebase:", pgError);
    try {
      const questions = await fetchTeacherQuestionsFromFirebase(schoolId, qb, userId, mine);
      return NextResponse.json({ success: true, questions });
    } catch (firebaseError) {
      console.error("[teacher/questions][GET] Firebase fallback failed:", firebaseError);
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }
  }
}

// POST - Create new teacher question
export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  const userName = request.headers.get("x-user-name");
  const userEmail = request.headers.get("x-user-email");
  const userRole = (request.headers.get("x-user-role") || "").toLowerCase();
  const schoolIdRaw = request.headers.get("x-school-id");
  
  console.log("[teacher/questions][POST] schoolIdRaw received:", schoolIdRaw);
  
  // Convert empty string to null and trim whitespace
  const schoolId = schoolIdRaw?.trim() || null;
  
  console.log("[teacher/questions][POST] schoolId after processing:", schoolId);

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  if (!schoolId) {
    console.log("[teacher/questions][POST] Rejecting - no school ID");
    return NextResponse.json({ 
      error: "School ID is required for teacher questions. Please ensure your profile has a school assigned." 
    }, { status: 400 });
  }
  if (!["teacher", "admin", "school_admin"].includes(userRole)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.subject || !body.grade || !body.book || !body.chapter || !body.type || !body.questionText) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const normalizedType = normalizeType(body.type);
  const normalizedGrade = normalizeGrade(body.grade);
  const normalizedDifficulty = normalizeDifficulty(body.difficulty || "Medium");
  const options = normalizedType === "multiple" ? (Array.isArray(body.options) ? body.options : []) : [];
  const blanks = normalizedType === "fillblanks" ? (body.blanks || {}) : {};
  const cognitiveLevel = body.cognitiveLevel || {
    knowledge: false,
    understanding: false,
    application: false,
  };
  const interactiveData = JSON.stringify({
    options,
    blanks,
    topic: body.topic || "",
    interactiveData: body.interactiveData || null,
  });
  const hasBookId = await hasQuestionsBookIdColumn();
  const hasSchoolIdColumn = await hasQuestionsSchoolIdColumn();
  const hasSourceSchoolPkColumn = await hasQuestionsSourceSchoolPkColumn();
  const hasSourceSchoolIdColumn = await hasQuestionsSourceSchoolIdColumn();
  const resolvedBookId = hasBookId
    ? await resolveBookId(body.subject || "", body.book || "", normalizedGrade)
    : null;
  const schoolIdPk = Number.parseInt(schoolId, 10);

  if (!Number.isFinite(schoolIdPk)) {
    return NextResponse.json({ error: "Invalid school ID" }, { status: 400 });
  }

  // Resolve Firebase UID to numeric user ID
  const userKeys = await getUserKeys(userId, userEmail);
  const createdByValue = userKeys.find((k) => k !== userId) || userId;

  try {
    const insertColumns: string[] = [
      "question_text",
      "type",
      "subject",
      "grade",
      "book",
      ...(hasBookId ? ["book_id"] : []),
      "chapter",
      "slo",
      "difficulty",
      "answer",
      "explanation",
      "marks",
      "qb_source",
      ...(hasSourceSchoolPkColumn ? ["source_school_pk"] : []),
      ...(hasSourceSchoolIdColumn ? ["source_school_id"] : []),
      ...(hasSchoolIdColumn ? ["school_id"] : []),
      "is_interactive",
      "interactive_data",
      "image_url",
      "created_by",
      "created_at",
      "updated_at",
      "cognitive_level",
    ];

    const insertValues: any[] = [
      body.questionText,
      normalizedType,
      body.subject,
      normalizedGrade,
      body.book,
      ...(hasBookId ? [resolvedBookId] : []),
      body.chapter,
      body.slo || "",
      normalizedDifficulty,
      normalizeAnswer(body.correctAnswer),
      body.explanation || "",
      Number.isFinite(body.marks) ? body.marks : 1,
      "school",
      ...(hasSourceSchoolPkColumn ? [schoolIdPk] : []),
      ...(hasSourceSchoolIdColumn ? [schoolId] : []),
      ...(hasSchoolIdColumn ? [schoolIdPk] : []),
      Boolean(body.isInteractiveQuestion && body.interactiveData),
      interactiveData,
      body.imageUrl || null,
      createdByValue,
      new Date(),
      new Date(),
      JSON.stringify(cognitiveLevel),
    ];

    const placeholders = insertColumns.map((_, index) => {
      const column = insertColumns[index];
      if (column === "interactive_data" || column === "cognitive_level") {
        return `$${index + 1}::jsonb`;
      }
      return `$${index + 1}`;
    });

    const sql = `
      INSERT INTO questions (${insertColumns.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING id
    `;

    const runInsert = () => pgPool.query(sql, insertValues);

    let result;
    try {
      result = await runInsert();
    } catch (error) {
      if (!isQuestionsPrimaryKeyConflict(error)) throw error;
      console.warn(
        "[teacher/questions][POST] questions_id_seq is out of sync. Realigning sequence and retrying once."
      );
      await realignQuestionsIdSequence();
      result = await runInsert();
    }

    return NextResponse.json({
      success: true,
      questionId: String(result.rows[0].id),
      message: "Question created successfully",
    });
  } catch (pgError) {
    console.error("[teacher/questions][POST] PostgreSQL failed, falling back to Firebase:", pgError);
    try {
      const questionsRef = collection(db, "questions", "schools", schoolId);
      const questionDoc = await addDoc(questionsRef, {
        type: normalizedType,
        subject: body.subject,
        grade: normalizedGrade,
        book: body.book,
        chapter: body.chapter,
        topic: body.topic || "",
        slo: body.slo || "",
        difficulty: normalizedDifficulty,
        questionText: body.questionText,
        options,
        correctAnswer: body.correctAnswer || "",
        explanation: body.explanation || "",
        blanks,
        cognitiveLevel,
        createdBy: userId,
        createdByName: userName || "",
        createdAt: serverTimestamp(),
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        questionId: questionDoc.id,
        message: "Question created successfully",
      });
    } catch (firebaseError) {
      console.error("[teacher/questions][POST] Firebase fallback failed:", firebaseError);
      return NextResponse.json({ error: "Failed to create question" }, { status: 500 });
    }
  }
}
