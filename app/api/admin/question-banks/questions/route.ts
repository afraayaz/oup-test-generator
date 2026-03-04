import { NextRequest, NextResponse } from "next/server";
import { pgPool } from "@/lib/postgres";
import { getDb, switchToSecondaryFirebase, resetToPrimaryFirebase } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

function normalizeDifficulty(d: any): "easy" | "medium" | "hard" {
  const v = String(d || "medium").toLowerCase();
  if (v.includes("easy")) return "easy";
  if (v.includes("hard")) return "hard";
  return "medium";
}

function extractOptions(interactiveData: any): string[] {
  const parsed = typeof interactiveData === "string" ? (() => {
    try { return JSON.parse(interactiveData); } catch { return null; }
  })() : interactiveData;
  const arr = Array.isArray(parsed?.options) ? parsed.options : [];
  return arr.map((o: any) => (typeof o === "string" ? o : (o?.text ?? ""))).filter(Boolean);
}

async function fetchFromPostgres(params: URLSearchParams) {
  const bankType = params.get("bankType") || "school";
  const bankId = params.get("bankId") || "";
  const subject = params.get("subject") || "all";
  const grade = params.get("grade") || "all";
  const difficulty = params.get("difficulty") || "all";
  const type = params.get("type") || "all";

  const where: string[] = [];
  const values: any[] = [];

  if (bankType === "oup") {
    where.push(`qb_source = 'oup'`);
  } else {
    where.push(`qb_source = 'school'`);
    if (/^\d+$/.test(bankId)) {
      values.push(bankId);
      where.push(`(source_school_pk::text = $${values.length} OR source_school_id = $${values.length})`);
    } else {
      values.push(bankId);
      where.push(`source_school_id = $${values.length}`);
    }
  }

  if (subject !== "all") {
    values.push(subject);
    where.push(`subject = $${values.length}`);
  }
  if (grade !== "all") {
    values.push(grade);
    where.push(`grade = $${values.length}`);
  }
  if (difficulty !== "all") {
    values.push(difficulty.toLowerCase());
    where.push(`LOWER(COALESCE(difficulty,'')) = $${values.length}`);
  }
  if (type !== "all") {
    values.push(type);
    where.push(`type = $${values.length}`);
  }

  const [res, usersRes] = await Promise.all([
    pgPool.query(
    `
      SELECT
        id::text AS id,
        type,
        subject,
        grade,
        chapter,
        book,
        question_text,
        answer,
        difficulty,
        created_by,
        interactive_data
      FROM questions
      WHERE ${where.join(" AND ")}
      ORDER BY id DESC
      LIMIT 5000
    `,
    values
    ),
    pgPool.query(
      `
        SELECT
          u.id::text AS id,
          COALESCE(to_jsonb(u)->>'uid', '') AS uid,
          COALESCE(to_jsonb(u)->>'firebase_uid', '') AS firebase_uid,
          LOWER(COALESCE(to_jsonb(u)->>'email', '')) AS email,
          TRIM(
            COALESCE(to_jsonb(u)->>'name', '') || ' ' ||
            COALESCE(to_jsonb(u)->>'display_name', '') || ' ' ||
            COALESCE(to_jsonb(u)->>'first_name', '') || ' ' ||
            COALESCE(to_jsonb(u)->>'last_name', '')
          ) AS resolved_name
        FROM users u
      `
    )
  ]);

  const userNameByKey = new Map<string, string>();
  for (const u of usersRes.rows) {
    const name = String(u.resolved_name || "").replace(/\s+/g, " ").trim();
    const finalName = name || u.email || `User ${u.id}`;
    const keys = [u.id, u.uid, u.firebase_uid, u.email];
    for (const k of keys) {
      const key = String(k || "").trim().toLowerCase();
      if (key) userNameByKey.set(key, finalName);
    }
  }

  const questions = res.rows.map((r: any) => {
    const createdBy = String(r.created_by || "").trim();
    const key = createdBy.toLowerCase();
    const createdByName = userNameByKey.get(key) || createdBy;
    return {
      id: r.id,
      source: bankType === "oup" ? "oup" : "school",
      type: r.type || "",
      subject: r.subject || "",
      grade: r.grade || "",
      chapter: r.chapter || "",
      book: r.book || "",
      content: r.question_text || "",
      options: extractOptions(r.interactive_data),
      correctAnswer: r.answer || "",
      difficulty: normalizeDifficulty(r.difficulty),
      createdByName,
    };
  });

  return { questions, total: questions.length };
}

async function fetchFromFirebase(params: URLSearchParams) {
  const bankType = params.get("bankType") || "school";
  const bankId = params.get("bankId") || "";
  const subject = params.get("subject") || "all";
  const grade = params.get("grade") || "all";
  const difficulty = params.get("difficulty") || "all";
  const type = params.get("type") || "all";

  const readWith = async (currentDb: any) => {
    const ref = bankType === "oup"
      ? currentDb.collection("questions").doc("oup").collection("items")
      : currentDb.collection("questions").doc("schools").collection(bankId);
    const snapshot = await ref.get();
    let questions: any[] = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    if (subject !== "all") questions = questions.filter((q) => q.subject === subject);
    if (grade !== "all") questions = questions.filter((q) => q.grade === grade);
    if (difficulty !== "all") questions = questions.filter((q) => String(q.difficulty || "").toLowerCase() === difficulty.toLowerCase());
    if (type !== "all") questions = questions.filter((q) => q.type === type);
    return {
      questions: questions.map((q) => ({
        id: q.id,
        source: bankType === "oup" ? "oup" : "school",
        type: q.type || "",
        subject: q.subject || "",
        grade: q.grade || "",
        chapter: q.chapter || "",
        book: q.book || "",
        content: q.questionText || q.question || "",
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer || "",
        difficulty: normalizeDifficulty(q.difficulty),
        createdByName: q.createdByName || "",
      })),
      total: questions.length,
    };
  };

  try {
    const primary = await getDb();
    const data = await readWith(primary);
    resetToPrimaryFirebase();
    return data;
  } catch (e: any) {
    if (e?.message?.includes("quota") || e?.code === "RESOURCE_EXHAUSTED") {
      switchToSecondaryFirebase();
      const secondary = await getDb();
      const data = await readWith(secondary);
      resetToPrimaryFirebase();
      return data;
    }
    throw e;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  try {
    const data = await fetchFromPostgres(searchParams);
    return NextResponse.json({ success: true, ...data, source: "postgres" });
  } catch (pgErr: any) {
    try {
      const data = await fetchFromFirebase(searchParams);
      return NextResponse.json({ success: true, ...data, source: "firebase_fallback" });
    } catch (fbErr: any) {
      return NextResponse.json(
        { error: "Failed to fetch bank questions", details: { postgres: pgErr?.message, firebase: fbErr?.message } },
        { status: 500 }
      );
    }
  }
}
