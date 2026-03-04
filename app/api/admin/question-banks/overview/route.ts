import { NextResponse } from "next/server";
import { pgPool } from "@/lib/postgres";
import { getDb, switchToSecondaryFirebase, resetToPrimaryFirebase } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

type BankStats = {
  schoolId?: string;
  schoolName?: string;
  bankName: string;
  bankType: "school" | "oup";
  totalQuestions: number;
  questionsBySubject: Record<string, number>;
  questionsByGrade: Record<string, number>;
  lastUpdated: string | null;
};

function addToMap(map: Record<string, number>, key: any) {
  const k = String(key || "").trim();
  if (!k) return;
  map[k] = (map[k] || 0) + 1;
}

async function fetchFromPostgres(): Promise<BankStats[]> {
  const [schoolsRes, questionsRes] = await Promise.all([
    pgPool.query(`SELECT id::text AS id, COALESCE(firebase_id, '') AS firebase_id, name FROM schools`),
    pgPool.query(`
      SELECT
        id::text AS id,
        qb_source,
        subject,
        grade,
        source_school_id::text AS source_school_id,
        source_school_pk::text AS source_school_pk,
        updated_at
      FROM questions
      WHERE qb_source IN ('oup','school')
      LIMIT 20000
    `),
  ]);

  const schoolNameByKey = new Map<string, string>();
  for (const s of schoolsRes.rows) {
    if (s.id) schoolNameByKey.set(String(s.id), s.name || s.id);
    if (s.firebase_id) schoolNameByKey.set(String(s.firebase_id), s.name || s.firebase_id);
  }

  const banks = new Map<string, BankStats>();
  for (const q of questionsRes.rows) {
    const source = String(q.qb_source || "");
    if (source === "oup") {
      const key = "oup";
      if (!banks.has(key)) {
        banks.set(key, {
          bankType: "oup",
          bankName: "OUP Question Bank",
          totalQuestions: 0,
          questionsBySubject: {},
          questionsByGrade: {},
          lastUpdated: null,
        });
      }
      const b = banks.get(key)!;
      b.totalQuestions += 1;
      addToMap(b.questionsBySubject, q.subject);
      addToMap(b.questionsByGrade, q.grade);
      const u = q.updated_at ? new Date(q.updated_at).toISOString() : null;
      if (u && (!b.lastUpdated || u > b.lastUpdated)) b.lastUpdated = u;
      continue;
    }

    const schoolKey = String(q.source_school_id || q.source_school_pk || "").trim();
    if (!schoolKey) continue;
    if (!banks.has(schoolKey)) {
      const schoolName = schoolNameByKey.get(schoolKey) || schoolKey;
      banks.set(schoolKey, {
        schoolId: schoolKey,
        schoolName,
        bankName: schoolName,
        bankType: "school",
        totalQuestions: 0,
        questionsBySubject: {},
        questionsByGrade: {},
        lastUpdated: null,
      });
    }
    const b = banks.get(schoolKey)!;
    b.totalQuestions += 1;
    addToMap(b.questionsBySubject, q.subject);
    addToMap(b.questionsByGrade, q.grade);
    const u = q.updated_at ? new Date(q.updated_at).toISOString() : null;
    if (u && (!b.lastUpdated || u > b.lastUpdated)) b.lastUpdated = u;
  }

  return Array.from(banks.values()).sort((a, b) => {
    if (a.bankType === "oup") return -1;
    if (b.bankType === "oup") return 1;
    return (a.bankName || "").localeCompare(b.bankName || "");
  });
}

async function fetchFromFirebase(): Promise<BankStats[]> {
  const readWith = async (currentDb: any): Promise<BankStats[]> => {
    const allBanks: BankStats[] = [];

    const schoolStatsSnap = await currentDb.collection("school-stats").get();
    for (const doc of schoolStatsSnap.docs) {
      const d = doc.data() || {};
      allBanks.push({
        schoolId: doc.id,
        schoolName: d.schoolName || doc.id,
        bankName: d.schoolName || doc.id,
        bankType: "school",
        totalQuestions: d.totalQuestions || 0,
        questionsBySubject: d.questionsBySubject || {},
        questionsByGrade: d.questionsByGrade || {},
        lastUpdated: d.lastUpdated?.toDate ? d.lastUpdated.toDate().toISOString() : null,
      });
    }

    const oupDoc = await currentDb.collection("question-bank-stats").doc("oup").get();
    if (oupDoc.exists) {
      const d = oupDoc.data() || {};
      allBanks.unshift({
        schoolId: "oup",
        bankType: "oup",
        bankName: "OUP Question Bank",
        totalQuestions: d.totalQuestions || 0,
        questionsBySubject: d.questionsBySubject || {},
        questionsByGrade: d.questionsByGrade || {},
        lastUpdated: d.lastUpdated?.toDate ? d.lastUpdated.toDate().toISOString() : null,
      });
    }
    return allBanks;
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

export async function GET() {
  try {
    const banks = await fetchFromPostgres();
    if (banks.length > 0) return NextResponse.json({ success: true, banks, source: "postgres" });

    const fb = await fetchFromFirebase();
    return NextResponse.json({ success: true, banks: fb, source: "firebase_fallback_empty_pg" });
  } catch (pgErr: any) {
    try {
      const fb = await fetchFromFirebase();
      return NextResponse.json({ success: true, banks: fb, source: "firebase_fallback" });
    } catch (fbErr: any) {
      return NextResponse.json(
        {
          error: "Failed to fetch question banks overview",
          details: { postgres: pgErr?.message, firebase: fbErr?.message },
        },
        { status: 500 }
      );
    }
  }
}

