import { NextResponse } from "next/server";
import { pgPool } from "@/lib/postgres";
import {
  getDb,
  isQuotaError,
  resetToPrimaryFirebase,
  switchToSecondaryFirebase,
} from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

function normalizeGrade(value: string): string {
  const v = String(value || "").trim();
  if (!v) return "";
  if (/^(grade|class)\s+/i.test(v)) return v.replace(/^class\s+/i, "Grade ");
  return `Grade ${v}`;
}

function splitSubjects(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((v) => String(v || "").trim()).filter(Boolean);
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

async function fetchUserFromPostgres(uid: string, email: string) {
  const userRes = await pgPool.query(
    `
      WITH matched_user AS (
        SELECT
          u.*,
          to_jsonb(u) AS user_json,
          CASE
            WHEN COALESCE(to_jsonb(u)->>'school_id', '') ~ '^[0-9]+$'
            THEN (to_jsonb(u)->>'school_id')::bigint
            WHEN COALESCE(to_jsonb(u)->>'class', '') ~ '^[0-9]+$'
            THEN (to_jsonb(u)->>'class')::bigint
            ELSE NULL
          END AS school_id_num,
          CASE
            WHEN COALESCE(to_jsonb(u)->>'campus_id', '') ~ '^[0-9]+$'
            THEN (to_jsonb(u)->>'campus_id')::bigint
            ELSE NULL
          END AS campus_id_num
        FROM users u
        WHERE COALESCE(to_jsonb(u)->>'uid', '') = $1
           OR COALESCE(to_jsonb(u)->>'firebase_uid', '') = $1
           OR LOWER(COALESCE(to_jsonb(u)->>'email', '')) = LOWER($2)
        LIMIT 1
      )
      SELECT
        matched_user.user_json,
        to_jsonb(s) AS school_json,
        to_jsonb(c) AS campus_json
      FROM matched_user
      LEFT JOIN schools s ON s.id = matched_user.school_id_num
      LEFT JOIN campuses c ON c.id = matched_user.campus_id_num
    `,
    [uid, email]
  );

  if (!userRes.rowCount) return null;

  const base = userRes.rows[0];
  const uj = base.user_json || {};
  const sj = base.school_json || {};
  const cj = base.campus_json || {};
  
  console.log('[fetchUserFromPostgres] Raw data:', {
    user_school_id: uj.school_id,
    user_class: uj.class,
    user_firebase_uid: uj.firebase_uid,
    school_json_exists: !!sj.id,
    school_firebase_id: sj.firebase_id,
    school_id: sj.id,
    school_name: sj.name
  });
  
  const userIdNum = Number(uj.id);
  const hasNumericUserId = Number.isFinite(userIdNum);

  let assignedBooks: Array<{
    id: string;
    title: string;
    subject: string;
    grade: string;
    chapters: number;
  }> = [];

  let subjectGradePairs: Array<{
    id: string;
    subject: string;
    grade: string;
    assignedBooks: Array<{
      id: string;
      title: string;
      subject: string;
      grade: string;
      chapters: number;
    }>;
  }> = [];

  let assignedGrades: string[] = [];
  let subjects: string[] = [];

  if (hasNumericUserId) {
    const booksRes = await pgPool.query(
      `
        SELECT
          b.id::text AS id,
          b.title,
          COALESCE(sb.name, '') AS subject,
          COALESCE(b.grade, '') AS grade,
          COALESCE(b.chapters, 0)::int AS chapters
        FROM user_book_assignments uba
        JOIN books b ON b.id = uba.book_id
        LEFT JOIN subjects sb ON sb.id = b.subject_id
        WHERE uba.user_id = $1
        ORDER BY b.title
      `,
      [userIdNum]
    );
    assignedBooks = booksRes.rows.map((r: any) => ({
      id: String(r.id),
      title: String(r.title || ""),
      subject: String(r.subject || ""),
      grade: normalizeGrade(String(r.grade || "")),
      chapters: Number(r.chapters || 0),
    }));

    const pairsRes = await pgPool.query(
      `
        SELECT
          usga.subject_id::text AS subject_id,
          COALESCE(s.name, '') AS subject,
          COALESCE(g.label, '') AS grade_label
        FROM user_subject_grade_assignments usga
        LEFT JOIN subjects s ON s.id = usga.subject_id
        LEFT JOIN grades g ON g.id = usga.grade_id
        WHERE usga.user_id = $1
        ORDER BY s.name, g.label
      `,
      [userIdNum]
    );

    subjectGradePairs = pairsRes.rows.map((r: any) => {
      const pairGrade = normalizeGrade(String(r.grade_label || ""));
      const pairSubject = String(r.subject || "");
      const pairBooks = assignedBooks.filter((b) => {
        if (b.subject !== pairSubject) return false;
        if (pairGrade && b.grade) return b.grade === pairGrade;
        return true;
      });
      return {
        id: `${r.subject_id}-${pairGrade}`,
        subject: pairSubject,
        grade: pairGrade,
        assignedBooks: pairBooks,
      };
    });

    assignedGrades = Array.from(new Set(subjectGradePairs.map((p) => p.grade).filter(Boolean)));
    subjects = Array.from(new Set(subjectGradePairs.map((p) => p.subject).filter(Boolean)));
  }

  if (!subjects.length) {
    subjects = Array.from(new Set(splitSubjects(uj.assigned_subjects)));
  }
  if (!assignedGrades.length && uj.assigned_grade) {
    assignedGrades = [normalizeGrade(String(uj.assigned_grade))];
  }

  if (!subjectGradePairs.length && subjects.length && assignedGrades.length) {
    subjectGradePairs = subjects.map((subject, idx) => ({
      id: `${subject.toLowerCase()}-${idx}`,
      subject,
      grade: assignedGrades[idx] || assignedGrades[0],
      assignedBooks: assignedBooks.filter((b) => b.subject === subject),
    }));
  }

  const nameFromCols = `${String(uj.first_name || "").trim()} ${String(uj.last_name || "").trim()}`.trim();
  const role = String(uj.role || "");
  
  // Determine schoolId - prioritize numeric school_id from users table
  // school_id can be: number, string number, or undefined
  const schoolIdFromDb = uj.school_id !== undefined && uj.school_id !== null && uj.school_id !== "" 
    ? String(uj.school_id) 
    : (uj.class !== undefined && uj.class !== null && uj.class !== "" ? String(uj.class) : "");
  
  const schoolFirebaseId = sj.firebase_id ? String(sj.firebase_id) : "";
  
  // Prefer firebase_id from schools table, but fallback to direct school_id from users
  const finalSchoolId = schoolFirebaseId || schoolIdFromDb;
  
  console.log('[check-role] School ID resolution:', {
    firebase_uid: uj.firebase_uid,
    school_id_from_user: uj.school_id,
    school_id_type: typeof uj.school_id,
    class_from_user: uj.class,
    school_firebase_id: schoolFirebaseId,
    school_name: sj.name,
    schoolIdFromDb,
    final_school_id: finalSchoolId
  });
  
  const userData = {
    uid: String(uj.firebase_uid || uj.uid || uid || ""),
    email: String(uj.email || email || ""),
    role,
    name: nameFromCols || String(uj.name || uj.display_name || uj.email || "User"),
    displayName: nameFromCols || String(uj.name || uj.display_name || ""),
    status: String(uj.status || "Active"),
    schoolId: String(finalSchoolId),
    schoolName: String(sj.name || uj.school_name || ""),
    campusId: String(cj.firebase_id || uj.campus_id || ""),
    campusName: String(cj.name || uj.campus_name || ""),
    subjects,
    assignedGrades,
    assignedBooks,
    subjectGradePairs,
    createdAt: uj.created_at || null,
    updatedAt: uj.updated_at || null,
  };

  return { role, userData };
}

async function fetchUserFromFirebase(uid: string, email: string) {
  let userData: any = null;
  const currentDb = await getDb();

  try {
    let userDoc = await currentDb.collection("users").doc(uid).get();
    if (userDoc.exists) {
      userData = userDoc.data();
    } else {
      const querySnapshot = await currentDb
        .collection("users")
        .where("email", "==", email)
        .limit(1)
        .get();
      if (!querySnapshot.empty) {
        userData = querySnapshot.docs[0].data();
      }
    }
    resetToPrimaryFirebase();
  } catch (error: any) {
    if (!isQuotaError(error)) throw error;
    switchToSecondaryFirebase();
    try {
      const backupDb = await getDb();
      let userDoc = await backupDb.collection("users").doc(uid).get();
      if (userDoc.exists) {
        userData = userDoc.data();
      } else {
        const querySnapshot = await backupDb
          .collection("users")
          .where("email", "==", email)
          .limit(1)
          .get();
        if (!querySnapshot.empty) userData = querySnapshot.docs[0].data();
      }
      resetToPrimaryFirebase();
    } catch (retryError: any) {
      resetToPrimaryFirebase();
      if (isQuotaError(retryError)) {
        return { quotaExceeded: true, role: null, userData: null };
      }
      throw retryError;
    }
  }

  return { quotaExceeded: false, role: userData?.role || null, userData };
}

export async function POST(request: Request) {
  try {
    const { uid, email } = await request.json();
    if (!uid || !email) {
      return NextResponse.json({ error: "Missing uid or email" }, { status: 400 });
    }

    try {
      const pgUser = await fetchUserFromPostgres(uid, email);
      if (pgUser?.userData) {
        console.log('[check-role] PostgreSQL user found:', {
          uid: pgUser.userData.uid,
          email: pgUser.userData.email,
          schoolId: pgUser.userData.schoolId,
          schoolName: pgUser.userData.schoolName,
          role: pgUser.role
        });
        return NextResponse.json({
          role: pgUser.role,
          email: pgUser.userData.email || email,
          user: pgUser.userData,
          source: "postgres",
        });
      }
    } catch (pgError: any) {
      console.error("[check-role] PostgreSQL lookup failed. Falling back to Firebase:", pgError?.message || pgError);
    }

    const firebaseResult = await fetchUserFromFirebase(uid, email);
    if (firebaseResult.quotaExceeded) {
      return NextResponse.json(
        {
          error:
            "Both primary and secondary databases have exceeded their quota limits. Please try again later or contact support.",
          quotaExceeded: true,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      role: firebaseResult.role,
      email,
      user: firebaseResult.userData || null,
      source: "firebase",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to check user role. Database may be temporarily unavailable.",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
