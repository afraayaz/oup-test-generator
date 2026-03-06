import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth, db, deleteFirebaseUser } from "@/lib/firebaseAdmin";
import { pgPool } from "@/lib/postgres";

export const dynamic = "force-dynamic";

type PgUserCols = Set<string>;
let usersColsCache: PgUserCols | null = null;
const tableColsCache = new Map<string, Set<string>>();

async function getUsersColumns(): Promise<PgUserCols> {
  if (usersColsCache) return usersColsCache;
  const res = await pgPool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
    `
  );
  usersColsCache = new Set<string>(res.rows.map((r: any) => r.column_name));
  return usersColsCache;
}

async function getTableColumns(tableName: string): Promise<Set<string>> {
  if (tableColsCache.has(tableName)) return tableColsCache.get(tableName)!;
  const res = await pgPool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [tableName]
  );
  const cols = new Set<string>(res.rows.map((r: any) => r.column_name));
  tableColsCache.set(tableName, cols);
  return cols;
}

async function tableExists(tableName: string): Promise<boolean> {
  const cols = await getTableColumns(tableName);
  return cols.size > 0;
}

function splitName(name: string): { first: string; last: string } {
  const clean = String(name || "").trim().replace(/\s+/g, " ");
  if (!clean) return { first: "", last: "" };
  const parts = clean.split(" ");
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function toPgArrayText(values: any): string | null {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values.map((v) => String(v || "").trim()).filter(Boolean).join(",");
}

function toIntOrNull(v: any): number | null {
  // Handle empty strings, null, and undefined explicitly
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  // Return the number if it's finite, including 0
  return Number.isFinite(n) ? n : null;
}

function normalizeRole(role: string): string {
  const r = String(role || "").trim();
  return r || "teacher";
}

function normalizeGradeLabel(raw: string): string {
  const g = String(raw || "").trim();
  if (!g) return "";
  if (/^(grade|class)\s+/i.test(g)) return g.replace(/^class\s+/i, "Grade ");
  return `Grade ${g}`;
}

async function resolvePgUserId(input: { id?: string; email?: string; uid?: string }): Promise<number | null> {
  if (input.id && /^\d+$/.test(String(input.id))) return Number(input.id);

  const where: string[] = [];
  const values: any[] = [];
  if (input.uid) {
    values.push(String(input.uid));
    where.push(`COALESCE(to_jsonb(u)->>'uid', '') = $${values.length}`);
    values.push(String(input.uid));
    where.push(`COALESCE(to_jsonb(u)->>'firebase_uid', '') = $${values.length}`);
  }
  if (input.email) {
    values.push(String(input.email).toLowerCase());
    where.push(`LOWER(COALESCE(to_jsonb(u)->>'email', '')) = $${values.length}`);
  }
  if (input.id) {
    values.push(String(input.id));
    where.push(`u.id::text = $${values.length}`);
  }
  if (!where.length) return null;

  const res = await pgPool.query(
    `SELECT u.id::bigint AS id FROM users u WHERE ${where.join(" OR ")} LIMIT 1`,
    values
  );
  return res.rowCount ? Number(res.rows[0].id) : null;
}

async function resolveSubjectIdByName(name: string): Promise<number | null> {
  const subject = String(name || "").trim();
  if (!subject) return null;
  const res = await pgPool.query(
    `SELECT id::bigint AS id FROM subjects WHERE LOWER(name) = LOWER($1) LIMIT 1`,
    [subject]
  );
  return res.rowCount ? Number(res.rows[0].id) : null;
}

async function resolveGradeId(rawGrade: string): Promise<number | null> {
  const grade = normalizeGradeLabel(rawGrade);
  if (!grade) return null;
  const gradeDigits = grade.replace(/[^\d]/g, "");
  const res = await pgPool.query(
    `
      SELECT id::bigint AS id
      FROM grades
      WHERE LOWER(COALESCE(label, '')) = LOWER($1)
         OR LOWER(COALESCE(code, '')) = LOWER($1)
         OR regexp_replace(COALESCE(label, ''), '[^0-9]', '', 'g') = $2
         OR regexp_replace(COALESCE(code, ''), '[^0-9]', '', 'g') = $2
      ORDER BY id
      LIMIT 1
    `,
    [grade, gradeDigits]
  );
  return res.rowCount ? Number(res.rows[0].id) : null;
}

async function resolveBookId(book: any): Promise<number | null> {
  if (book?.id && /^\d+$/.test(String(book.id))) return Number(book.id);
  const title = String(book?.title || "").trim();
  if (!title) return null;
  const subjectId = await resolveSubjectIdByName(String(book?.subject || ""));
  const gradeLabel = normalizeGradeLabel(String(book?.grade || ""));
  const gradeDigits = gradeLabel.replace(/[^\d]/g, "");

  const where: string[] = [`LOWER(title) = LOWER($1)`];
  const values: any[] = [title];
  if (subjectId) {
    values.push(subjectId);
    where.push(`subject_id = $${values.length}`);
  }
  if (gradeLabel) {
    values.push(gradeLabel);
    where.push(
      `(LOWER(COALESCE(grade, '')) = LOWER($${values.length}) OR regexp_replace(COALESCE(grade, ''), '[^0-9]', '', 'g') = $${values.length + 1})`
    );
    values.push(gradeDigits);
  }

  const res = await pgPool.query(
    `SELECT id::bigint AS id FROM books WHERE ${where.join(" AND ")} ORDER BY id DESC LIMIT 1`,
    values
  );
  return res.rowCount ? Number(res.rows[0].id) : null;
}

async function insertRow(
  client: any,
  table: string,
  payload: Record<string, any>,
  allowedCols: Set<string>
) {
  const keys = Object.keys(payload).filter((k) => allowedCols.has(k));
  if (!keys.length) return;
  const values = keys.map((k) => payload[k]);
  const params = keys.map((_, i) => `$${i + 1}`);
  await client.query(
    `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${params.join(", ")})`,
    values
  );
}

async function syncUserAssignmentsToPostgres(input: {
  userId: number;
  role: string;
  subjects?: string[];
  assignedGrades?: string[];
  assignedBooks?: any[];
  subjectGradePairs?: any[];
}) {
  const role = normalizeRole(input.role);
  if (!["teacher", "content_creator", "content_manager", "school_admin", "student", "oup_admin"].includes(role)) {
    return;
  }

  const hasSubjectAssignments = await tableExists("user_subject_assignments");
  const hasSubjectGradeAssignments = await tableExists("user_subject_grade_assignments");
  const hasBookAssignments = await tableExists("user_book_assignments");
  if (!hasSubjectAssignments && !hasSubjectGradeAssignments && !hasBookAssignments) return;

  const subjectCols = hasSubjectAssignments ? await getTableColumns("user_subject_assignments") : new Set<string>();
  const subjectGradeCols = hasSubjectGradeAssignments ? await getTableColumns("user_subject_grade_assignments") : new Set<string>();
  const bookCols = hasBookAssignments ? await getTableColumns("user_book_assignments") : new Set<string>();

  const pairs = Array.isArray(input.subjectGradePairs) ? input.subjectGradePairs : [];
  const booksFromPairs = pairs.flatMap((p: any) => (Array.isArray(p?.assignedBooks) ? p.assignedBooks : []));
  const assignedBooks = Array.isArray(input.assignedBooks) ? input.assignedBooks : [];
  const allBooks = [...assignedBooks, ...booksFromPairs];

  const subjectsFromPairs = pairs.map((p: any) => String(p?.subject || "").trim()).filter(Boolean);
  const subjectsFromBooks = allBooks.map((b: any) => String(b?.subject || "").trim()).filter(Boolean);
  const subjects = Array.from(
    new Set([...(input.subjects || []), ...subjectsFromPairs, ...subjectsFromBooks].map((s) => String(s || "").trim()).filter(Boolean))
  );

  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");

    if (hasSubjectAssignments) {
      await client.query(`DELETE FROM user_subject_assignments WHERE user_id = $1`, [input.userId]);
    }
    if (hasSubjectGradeAssignments) {
      await client.query(`DELETE FROM user_subject_grade_assignments WHERE user_id = $1`, [input.userId]);
    }
    if (hasBookAssignments) {
      await client.query(`DELETE FROM user_book_assignments WHERE user_id = $1`, [input.userId]);
    }

    if (hasSubjectAssignments) {
      for (const subjectName of subjects) {
        const subjectId = await resolveSubjectIdByName(subjectName);
        if (!subjectId) continue;
        await insertRow(
          client,
          "user_subject_assignments",
          {
            user_id: input.userId,
            subject_id: subjectId,
            created_at: new Date().toISOString(),
            assigned_at: new Date().toISOString(),
          },
          subjectCols
        );
      }
    }

    if (hasSubjectGradeAssignments) {
      const seen = new Set<string>();
      const derivedPairs =
        pairs.length > 0
          ? pairs
          : (input.subjects || []).map((subject, idx) => ({
              subject,
              grade: input.assignedGrades?.[idx] || input.assignedGrades?.[0] || "",
            }));

      for (const pair of derivedPairs) {
        const subjectName = String(pair?.subject || "").trim();
        const gradeRaw = String(pair?.grade || "").trim();
        if (!subjectName || !gradeRaw) continue;
        const subjectId = await resolveSubjectIdByName(subjectName);
        const gradeId = await resolveGradeId(gradeRaw);
        if (!subjectId || !gradeId) continue;
        const key = `${subjectId}:${gradeId}`;
        if (seen.has(key)) continue;
        seen.add(key);

        await insertRow(
          client,
          "user_subject_grade_assignments",
          {
            user_id: input.userId,
            subject_id: subjectId,
            grade_id: gradeId,
            assigned_at: new Date().toISOString(),
            assigned_by: null,
            created_at: new Date().toISOString(),
          },
          subjectGradeCols
        );
      }
    }

    if (hasBookAssignments) {
      const inserted = new Set<number>();
      for (const book of allBooks) {
        const bookId = await resolveBookId(book);
        if (!bookId || inserted.has(bookId)) continue;
        inserted.add(bookId);
        await insertRow(
          client,
          "user_book_assignments",
          {
            user_id: input.userId,
            book_id: bookId,
            assigned_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          bookCols
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function fetchUsersFromPostgres(params: URLSearchParams) {
  const schoolId = params.get("schoolId");
  const campusId = params.get("campusId");
  const role = params.get("role");

  const where: string[] = [];
  const values: any[] = [];
  if (schoolId) {
    values.push(schoolId);
    where.push(`u.school_id::text = $${values.length}`);
  }
  if (campusId) {
    values.push(campusId);
    where.push(`u.campus_id::text = $${values.length}`);
  }
  if (role) {
    values.push(role);
    where.push(`u.role = $${values.length}`);
  }

  const query = `
    SELECT
      u.id::text AS id,
      TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) AS name,
      u.email,
      u.role,
      COALESCE(u.school_id::text, '') AS "schoolId",
      COALESCE(s.name, '') AS "schoolName",
      COALESCE(u.campus_id::text, '') AS "campusId",
      COALESCE(c.name, '') AS "campusName",
      'Active'::text AS status,
      u.created_at AS "createdAt",
      ''::text AS "lastActive",
      COALESCE(u.assigned_grade, '') AS grade,
      CASE
        WHEN COALESCE(u.assigned_subjects, '') = '' THEN ARRAY[]::text[]
        ELSE string_to_array(u.assigned_subjects, ',')
      END AS subjects
    FROM users u
    LEFT JOIN schools s ON s.id = u.school_id
    LEFT JOIN campuses c ON c.id = u.campus_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY u.created_at DESC
    LIMIT 500
  `;

  const res = await pgPool.query(query, values);
  const users = res.rows.map((r: any) => ({
    ...r,
    name: r.name || r.email || "User",
    status: r.status || "Active",
    schoolId: r.schoolId || "",
    schoolName: r.schoolName || "",
    campusId: r.campusId || "",
    campusName: r.campusName || "",
    subjects: Array.isArray(r.subjects) ? r.subjects : [],
  }));
  return users;
}

async function upsertUserToPostgres(input: {
  id?: string;
  uid?: string;
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  schoolId?: any;
  campusId?: any;
  assignedGrade?: string | null;
  assignedSubjects?: any[] | null;
}) {
  console.log('[upsertUserToPostgres] Input schoolId:', input.schoolId, 'Type:', typeof input.schoolId);
  
  const cols = await getUsersColumns();
  const name = String(input.name || "").trim();
  const { first, last } = splitName(name);
  const email = String(input.email || "").trim().toLowerCase();

  if (!email) return null;

  const payload: Record<string, any> = {};
  if (cols.has("email")) payload.email = email;
  if (cols.has("role")) payload.role = normalizeRole(String(input.role || ""));
  if (cols.has("first_name")) payload.first_name = first;
  if (cols.has("last_name")) payload.last_name = last;
  if (cols.has("school_id")) {
    payload.school_id = toIntOrNull(input.schoolId);
    console.log('[upsertUserToPostgres] Converted school_id:', payload.school_id);
  }
  if (cols.has("campus_id")) payload.campus_id = toIntOrNull(input.campusId);
  if (cols.has("assigned_grade")) payload.assigned_grade = input.assignedGrade || null;
  if (cols.has("assigned_subjects")) payload.assigned_subjects = toPgArrayText(input.assignedSubjects) || null;
  if (cols.has("updated_at")) payload.updated_at = new Date().toISOString();
  if (cols.has("firebase_uid")) payload.firebase_uid = input.uid || null;
  if (cols.has("uid")) payload.uid = input.uid || null;

  if (input.password && cols.has("password_hash")) {
    payload.password_hash = await bcrypt.hash(input.password, 10);
  }

  const keys = Object.keys(payload);
  if (!keys.length) return null;

  const existing = await pgPool.query(`SELECT id::text AS id FROM users WHERE lower(email) = lower($1) LIMIT 1`, [email]);

  if (existing.rowCount) {
    const id = existing.rows[0].id;
    const setKeys = keys.filter((k) => !(k === "password_hash" && !input.password));
    if (setKeys.length) {
      const values = setKeys.map((k) => payload[k]);
      const sets = setKeys.map((k, i) => `${k} = $${i + 1}`);
      values.push(id);
      await pgPool.query(`UPDATE users SET ${sets.join(", ")} WHERE id::text = $${values.length}`, values);
    }
    return id;
  }

  const insertKeys = [...keys];
  if (cols.has("created_at") && !insertKeys.includes("created_at")) {
    insertKeys.push("created_at");
    payload.created_at = new Date().toISOString();
  }
  if (cols.has("updated_at") && !insertKeys.includes("updated_at")) {
    insertKeys.push("updated_at");
    payload.updated_at = new Date().toISOString();
  }

  const values = insertKeys.map((k) => payload[k]);
  const params = insertKeys.map((_, i) => `$${i + 1}`);
  
  console.log('[upsertUserToPostgres] INSERT columns:', insertKeys);
  console.log('[upsertUserToPostgres] INSERT values:', values);
  
  const inserted = await pgPool.query(
    `INSERT INTO users (${insertKeys.join(", ")}) VALUES (${params.join(", ")}) RETURNING id::text AS id`
  , values);
  return inserted.rows[0]?.id || null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const users = await fetchUsersFromPostgres(searchParams);
    return NextResponse.json({ users, source: "postgres" });
  } catch (pgError: any) {
    console.error("[admin/users][GET] PostgreSQL primary failed, falling back to Firebase:", pgError?.message || pgError);
    try {
      let query: any = db.collection("users");
      const schoolId = searchParams.get("schoolId");
      const campusId = searchParams.get("campusId");
      const role = searchParams.get("role");

      if (schoolId) query = query.where("schoolId", "==", schoolId);
      if (campusId) query = query.where("campusId", "==", campusId);
      if (role) query = query.where("role", "==", role);
      query = query.limit(500);

      const snapshot = await query.get();
      const users = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      return NextResponse.json({ users, source: "firebase_fallback" });
    } catch (firebaseError: any) {
      return NextResponse.json(
        { error: "Failed to fetch users", details: pgError?.message || firebaseError?.message },
        { status: 500 }
      );
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      password,
      role,
      schoolId,
      schoolName,
      campusId,
      campusName,
      grade,
      section,
      rollNumber,
      subjects,
      assignedClasses,
      assignedGrades,
      assignedBooks,
      subjectGradePairs,
      userType,
    } = body;

    const normalizedStudentGrade = role === "student" ? normalizeGradeLabel(String(grade || "")) : "";

    console.log('[admin/users][POST] Creating user with schoolId:', schoolId, 'Type:', typeof schoolId);

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Name, email, password, and role are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    const validRoles = ["school_admin", "teacher", "student", "content_manager", "content_creator", "oup_admin"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Firebase auth + Firestore write (best effort)
    let uid = "";
    let firebaseDocId = "";
    try {
      const userRecord = await auth.createUser({ email, password });
      uid = userRecord.uid;

      const userData: Record<string, any> = {
        uid,
        name,
        email,
        role,
        schoolId: schoolId || "",
        schoolName: schoolName || "",
        campusId: campusId || "",
        campusName: campusName || "",
        userType: userType || "school",
        status: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "admin",
        lastActive: "",
      };
      if (role === "student") {
        userData.grade = normalizedStudentGrade || "";
        userData.section = section || "";
        userData.rollNumber = rollNumber || "";
        userData.class = normalizedStudentGrade || "";
        userData.assignedGrade = normalizedStudentGrade || "";
        userData.assigned_grade = normalizedStudentGrade || "";
      }
      if (role === "teacher") {
        userData.subjects = subjects || [];
        userData.assignedClasses = assignedClasses || [];
        userData.assignedGrades = assignedGrades || [];
        userData.assignedBooks = assignedBooks || [];
        userData.subjectGradePairs = subjectGradePairs || [];
      }
      if (role === "content_manager" || role === "content_creator") {
        userData.subjects = subjects || [];
        userData.assignedBooks = assignedBooks || [];
      }
      const docRef = await db.collection("users").add(userData);
      firebaseDocId = docRef.id;
    } catch (firebaseError) {
      // continue; PG is primary fallback
    }

    const pgId = await upsertUserToPostgres({
      uid,
      name,
      email,
      password,
      role,
      schoolId,
      campusId,
      assignedGrade:
        normalizedStudentGrade ||
        (Array.isArray(assignedGrades) && assignedGrades[0] ? normalizeGradeLabel(String(assignedGrades[0])) : null),
      assignedSubjects: Array.isArray(subjects)
        ? subjects
        : Array.isArray(assignedBooks)
        ? assignedBooks.map((b: any) => b.subject).filter(Boolean)
        : [],
    });

    if (pgId) {
      try {
        await syncUserAssignmentsToPostgres({
          userId: Number(pgId),
          role,
          subjects: Array.isArray(subjects) ? subjects : [],
          assignedGrades: Array.isArray(assignedGrades) ? assignedGrades : [],
          assignedBooks: Array.isArray(assignedBooks) ? assignedBooks : [],
          subjectGradePairs: Array.isArray(subjectGradePairs) ? subjectGradePairs : [],
        });
      } catch (assignErr: any) {
        console.error("[admin/users][POST] assignment sync failed:", assignErr?.message || assignErr);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: firebaseDocId || pgId || "",
        uid,
        name,
        email,
        role,
        schoolId: schoolId || "",
        schoolName: schoolName || "",
        campusId: campusId || "",
        campusName: campusName || "",
        grade: normalizedStudentGrade || "",
        section: section || "",
        rollNumber: rollNumber || "",
        status: "Active",
      },
      storedIn: {
        firestore: Boolean(firebaseDocId),
        postgres: Boolean(pgId),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create user", details: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id) return NextResponse.json({ error: "User ID is required" }, { status: 400 });

    let firestoreUpdated = false;
    try {
      await db.collection("users").doc(id).update({ ...updateData, updatedAt: new Date().toISOString() });
      firestoreUpdated = true;
    } catch (e) {
      // fallback to postgres-only update
    }

    const pgUserIdNum = await resolvePgUserId({
      id: String(id),
      email: updateData.email,
      uid: updateData.uid,
    });

    if (pgUserIdNum) {
      const cols = await getUsersColumns();
      const set: string[] = [];
      const values: any[] = [];
      const push = (col: string, value: any) => {
        if (!cols.has(col)) return;
        values.push(value);
        set.push(`${col} = $${values.length}`);
      };

      if (updateData.name !== undefined) {
        const n = splitName(String(updateData.name || ""));
        push("first_name", n.first);
        push("last_name", n.last);
      }
      if (updateData.email !== undefined) push("email", String(updateData.email || "").trim().toLowerCase());
      if (updateData.role !== undefined) push("role", normalizeRole(updateData.role));
      if (updateData.schoolId !== undefined) push("school_id", toIntOrNull(updateData.schoolId));
      if (updateData.campusId !== undefined) push("campus_id", toIntOrNull(updateData.campusId));
      if (updateData.grade !== undefined) push("assigned_grade", updateData.grade || null);
      if (updateData.subjects !== undefined) push("assigned_subjects", toPgArrayText(updateData.subjects));
      if (cols.has("updated_at")) push("updated_at", new Date().toISOString());

      if (set.length) {
        values.push(String(pgUserIdNum));
        await pgPool.query(`UPDATE users SET ${set.join(", ")} WHERE id::text = $${values.length}`, values);
      }

      if (
        updateData.subjectGradePairs !== undefined ||
        updateData.assignedBooks !== undefined ||
        updateData.subjects !== undefined ||
        updateData.assignedGrades !== undefined
      ) {
        try {
          await syncUserAssignmentsToPostgres({
            userId: Number(pgUserIdNum),
            role: updateData.role || "",
            subjects: Array.isArray(updateData.subjects) ? updateData.subjects : [],
            assignedGrades: Array.isArray(updateData.assignedGrades) ? updateData.assignedGrades : [],
            assignedBooks: Array.isArray(updateData.assignedBooks) ? updateData.assignedBooks : [],
            subjectGradePairs: Array.isArray(updateData.subjectGradePairs) ? updateData.subjectGradePairs : [],
          });
        } catch (assignErr: any) {
          console.error("[admin/users][PUT] assignment sync failed:", assignErr?.message || assignErr);
        }
      }
    }

    return NextResponse.json({ success: true, user: { id, ...updateData }, source: firestoreUpdated ? "firestore+postgres" : "postgres_only" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update user", details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "User ID is required" }, { status: 400 });

    let uid = "";
    let userEmail = "";
    try {
      const userDoc = await db.collection("users").doc(id).get();
      if (userDoc.exists) {
        const userData = userDoc.data() || {};
        uid = userData.uid || "";
        userEmail = userData.email || "";
        if (uid) await deleteFirebaseUser(uid);
        await db.collection("users").doc(id).delete();
      }
    } catch (e) {
      // continue with postgres cleanup
    }

    if (/^\d+$/.test(id)) {
      await pgPool.query(`DELETE FROM users WHERE id::text = $1`, [id]);
    } else if (userEmail) {
      await pgPool.query(`DELETE FROM users WHERE lower(email)=lower($1)`, [userEmail]);
    } else {
      const cols = await getUsersColumns();
      if (cols.has("firebase_uid")) {
        await pgPool.query(`DELETE FROM users WHERE firebase_uid = $1`, [id]);
      }
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
      deletedUser: { uid, email: userEmail },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete user", details: error.message }, { status: 500 });
  }
}
