import { NextResponse } from "next/server";
import { getDb, switchToSecondaryFirebase, resetToPrimaryFirebase } from "@/lib/firebaseAdmin";
import { pgPool } from "@/lib/postgres";

export const dynamic = "force-dynamic";

function buildStatsFromArrays(users: any[], schools: any[], quizzes: any[]) {
  const totalUsers = users.length;
  const schoolUsers = users.filter((u: any) => u.schoolId || u.school_id).length;
  const oupUsers = users.filter((u: any) => !(u.schoolId || u.school_id)).length;
  const studentCount = users.filter((u: any) => String(u.role || "").toLowerCase() === "student").length;
  const teacherCount = users.filter((u: any) => String(u.role || "").toLowerCase() === "teacher").length;
  const adminCount = users.filter((u: any) => {
    const role = String(u.role || "").toLowerCase();
    return role === "school_admin" || role === "admin";
  }).length;
  const totalSchools = schools.length;
  const activeSchools = schools.filter((s: any) => String(s.status || "").toLowerCase() === "active").length;
  const totalQuizzes = quizzes.length;

  return {
    stats: {
      totalUsers,
      schoolUsers,
      oupUsers,
      totalSchools,
      activeSchools,
      totalQuizzes,
    },
    userRoles: {
      students: studentCount,
      teachers: teacherCount,
      admins: adminCount,
    },
  };
}

async function fetchFromPostgres() {
  const safeRows = async (label: string, sql: string) => {
    try {
      const res = await pgPool.query(sql);
      return res.rows;
    } catch (err: any) {
      console.error(`[dashboard-stats] PostgreSQL ${label} query failed:`, err?.message || err);
      return [];
    }
  };

  const [usersRows, schoolsRows, quizzesRows] = await Promise.all([
    safeRows("users", `
      SELECT
        id::text AS id,
        email,
        role,
        school_id::text AS "schoolId",
        created_at AS "createdAt",
        TRIM(CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,''))) AS name
      FROM users
      ORDER BY created_at DESC NULLS LAST
      LIMIT 500
    `),
    safeRows("schools", `
      SELECT id::text AS id, name, status, created_at AS "createdAt"
      FROM schools
      ORDER BY created_at DESC NULLS LAST
      LIMIT 200
    `),
    safeRows("quizzes", `
      SELECT id::text AS id, title, NULL::text AS grade, created_at AS "createdAt"
      FROM quizzes
      ORDER BY created_at DESC NULLS LAST
      LIMIT 500
    `),
  ]);

  const users = usersRows.map((u: any) => ({
    ...u,
    createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
  }));
  const schools = schoolsRows.map((s: any) => ({
    ...s,
    createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : null,
  }));
  const quizzes = quizzesRows.map((q: any) => ({
    ...q,
    createdAt: q.createdAt ? new Date(q.createdAt).toISOString() : null,
  }));

  return {
    ...buildStatsFromArrays(users, schools, quizzes),
    users,
    quizzes,
    source: "postgres",
  };
}

async function fetchFromFirebase(currentDb: any) {
  const [usersSnapshot, schoolsSnapshot, quizzesSnapshot] = await Promise.all([
    currentDb.collection("users").limit(500).get(),
    currentDb.collection("schools").limit(200).get(),
    currentDb.collection("quizzes").limit(500).get(),
  ]);

  const users = usersSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  const schools = schoolsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  const quizzes = quizzesSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

  return {
    ...buildStatsFromArrays(users, schools, quizzes),
    users,
    quizzes,
    source: "firebase",
  };
}

// Consolidated endpoint to fetch all dashboard stats in one call
export async function GET() {
  console.log("DB_URL set?:", !!process.env.DATABASE_URL);
  console.log("PGHOST:", process.env.PGHOST, "PGDATABASE:", process.env.PGDATABASE);
  console.log("VERCEL_ENV:", process.env.VERCEL_ENV, "BRANCH:", process.env.VERCEL_GIT_COMMIT_REF);

  // 1) Primary: PostgreSQL
  try {
    const probe = await pgPool.query(`
      select
        (select count(*) from subjects) as subjects,
        (select count(*) from books) as books,
        (select count(*) from questions) as questions,
        (select count(*) from users) as users
    `);
    console.log("[PG PROBE]", probe.rows[0]);

    const pgPayload = await fetchFromPostgres();

    // Migration-phase behavior:
    // If PostgreSQL is reachable but has no dashboard data yet, use Firebase fallback.
    const pgLooksEmpty =
      (pgPayload?.stats?.totalUsers || 0) === 0 &&
      (pgPayload?.stats?.totalSchools || 0) === 0 &&
      (pgPayload?.stats?.totalQuizzes || 0) === 0;

    if (pgLooksEmpty && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      try {
        const primaryDb = await getDb();
        const primaryPayload = await fetchFromFirebase(primaryDb);
        resetToPrimaryFirebase();
        return NextResponse.json({ ...primaryPayload, source: "firebase_fallback_pg_empty_primary" });
      } catch (firebaseWhenEmptyError: any) {
        console.error("[dashboard-stats] Firebase fallback (PG empty) failed:", firebaseWhenEmptyError?.message || firebaseWhenEmptyError);
        if (
          firebaseWhenEmptyError?.message?.includes("quota") ||
          firebaseWhenEmptyError?.code === "RESOURCE_EXHAUSTED"
        ) {
          try {
            switchToSecondaryFirebase();
            const backupDb = await getDb();
            const secondaryPayload = await fetchFromFirebase(backupDb);
            resetToPrimaryFirebase();
            return NextResponse.json({ ...secondaryPayload, source: "firebase_fallback_pg_empty_secondary" });
          } catch (secondaryWhenEmptyError: any) {
            console.error("[dashboard-stats] Secondary Firebase fallback (PG empty) failed:", secondaryWhenEmptyError?.message || secondaryWhenEmptyError);
          }
        }

        // Keep API healthy during migration even if Firebase fallback fails.
        return NextResponse.json({ ...pgPayload, source: "postgres_pg_empty_fallback_failed" });
      }
    }

    return NextResponse.json(pgPayload);
  } catch (pgError: any) {
    console.error("[dashboard-stats] PostgreSQL primary failed:", pgError?.message || pgError);
    // 2) Fallback: Firebase primary / secondary
    try {
      if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
        return NextResponse.json(
          { error: "PostgreSQL failed and Firebase not configured", details: pgError?.message },
          { status: 503 }
        );
      }

      const primaryDb = await getDb();
      const primaryPayload = await fetchFromFirebase(primaryDb);
      resetToPrimaryFirebase();
      return NextResponse.json({ ...primaryPayload, source: "firebase_fallback_primary" });
    } catch (firebaseError: any) {
      console.error("[dashboard-stats] Firebase primary fallback failed:", firebaseError?.message || firebaseError);
      if (firebaseError.message?.includes("quota") || firebaseError.code === "RESOURCE_EXHAUSTED") {
        switchToSecondaryFirebase();
        try {
          const backupDb = await getDb();
          const secondaryPayload = await fetchFromFirebase(backupDb);
          resetToPrimaryFirebase();
          return NextResponse.json({ ...secondaryPayload, source: "firebase_fallback_secondary" });
        } catch (secondaryError: any) {
          console.error("[dashboard-stats] Firebase secondary fallback failed:", secondaryError?.message || secondaryError);
          resetToPrimaryFirebase();
          return NextResponse.json(
            {
              error: "Failed to fetch dashboard stats from PostgreSQL and Firebase",
              details: {
                postgres: pgError?.message,
                firebasePrimary: firebaseError?.message,
                firebaseSecondary: secondaryError?.message,
              },
            },
            { status: 500 }
          );
        }
      }

      resetToPrimaryFirebase();
      return NextResponse.json(
        {
          error: "Failed to fetch dashboard stats from PostgreSQL and Firebase",
          details: {
            postgres: pgError?.message,
            firebasePrimary: firebaseError?.message,
          },
        },
        { status: 500 }
      );
    }
  }
}
