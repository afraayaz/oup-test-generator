import OrganizationClient from "./OrganizationClient";
import { pgPool } from "@/lib/postgres";
import { getDb, switchToSecondaryFirebase, resetToPrimaryFirebase } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type School = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: string;
};

type Campus = {
  id: string;
  name: string;
  schoolId: string;
  schoolName?: string;
  address?: string;
  city?: string;
  status?: string;
};

type UserRow = {
  id: string;
  role?: string;
  schoolId?: string;
  campusId?: string;
};

async function fetchSchoolsFromPostgres(): Promise<School[]> {
  try {
    const res = await pgPool.query(`
      SELECT
        id::text AS id,
        COALESCE(to_jsonb(s)->>'name', '') AS name,
        COALESCE(to_jsonb(s)->>'address', '') AS address,
        COALESCE(to_jsonb(s)->>'city', '') AS city,
        COALESCE(to_jsonb(s)->>'contact_email', to_jsonb(s)->>'contactEmail', '') AS "contactEmail",
        COALESCE(to_jsonb(s)->>'contact_phone', to_jsonb(s)->>'contactPhone', '') AS "contactPhone",
        COALESCE(to_jsonb(s)->>'status', 'Active') AS status
      FROM schools
      AS s
      ORDER BY name ASC
    `);
    return res.rows;
  } catch (err: any) {
    console.error("[organization] PostgreSQL schools query failed:", err?.message || err);
    return [];
  }
}

async function fetchCampusesFromPostgres(): Promise<Campus[]> {
  try {
    const res = await pgPool.query(`
      SELECT
        c.id::text AS id,
        COALESCE(to_jsonb(c)->>'name', '') AS name,
        COALESCE(
          to_jsonb(c)->>'school_id',
          to_jsonb(c)->>'firebase_school_id',
          to_jsonb(c)->>'schoolId',
          ''
        ) AS "schoolId",
        COALESCE(
          to_jsonb(s)->>'name',
          to_jsonb(c)->>'school_name',
          to_jsonb(c)->>'schoolName',
          ''
        ) AS "schoolName",
        COALESCE(to_jsonb(c)->>'address', '') AS address,
        COALESCE(to_jsonb(c)->>'city', '') AS city,
        COALESCE(to_jsonb(c)->>'status', 'Active') AS status
      FROM campuses c
      LEFT JOIN schools s ON s.id::text = COALESCE(to_jsonb(c)->>'school_id', '')
      ORDER BY c.name ASC
    `);
    return res.rows;
  } catch (err: any) {
    console.error("[organization] PostgreSQL campuses query failed:", err?.message || err);
    return [];
  }
}

async function fetchUsersFromPostgres(): Promise<UserRow[]> {
  try {
    const res = await pgPool.query(`
      SELECT
        u.id::text AS id,
        COALESCE(to_jsonb(u)->>'role', '') AS role,
        COALESCE(
          to_jsonb(u)->>'school_id',
          to_jsonb(u)->>'schoolId',
          ''
        ) AS "schoolId",
        COALESCE(
          to_jsonb(u)->>'campus_id',
          to_jsonb(u)->>'campusId',
          ''
        ) AS "campusId"
      FROM users u
    `);
    return res.rows;
  } catch (err: any) {
    console.error("[organization] PostgreSQL users query failed:", err?.message || err);
    return [];
  }
}

async function fetchFromFirebaseWithFallback() {
  const readFromDb = async (currentDb: any) => {
    const [schoolsSnap, campusesSnap, usersSnap] = await Promise.all([
      currentDb.collection("schools").get(),
      currentDb.collection("campuses").get(),
      currentDb.collection("users").get(),
    ]);

    const schools: School[] = schoolsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    const campuses: Campus[] = campusesSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    const users: UserRow[] = usersSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    return { schools, campuses, users };
  };

  try {
    const primaryDb = await getDb();
    const payload = await readFromDb(primaryDb);
    resetToPrimaryFirebase();
    return payload;
  } catch (primaryErr: any) {
    if (primaryErr?.message?.includes("quota") || primaryErr?.code === "RESOURCE_EXHAUSTED") {
      switchToSecondaryFirebase();
      const backupDb = await getDb();
      const payload = await readFromDb(backupDb);
      resetToPrimaryFirebase();
      return payload;
    }
    throw primaryErr;
  }
}

function calculateUserCounts(users: UserRow[]) {
  const bySchool: Record<string, { total: number; students: number; teachers: number; schoolAdmins: number; contentManagers: number }> = {};
  const byCampus: Record<string, { total: number; students: number; teachers: number; schoolAdmins: number; contentManagers: number }> = {};

  users.forEach((user) => {
    const schoolId = (user.schoolId || "").toString();
    const campusId = (user.campusId || "").toString();
    const role = (user.role || "").toString();

    if (schoolId) {
      if (!bySchool[schoolId]) {
        bySchool[schoolId] = { total: 0, students: 0, teachers: 0, schoolAdmins: 0, contentManagers: 0 };
      }
      bySchool[schoolId].total++;
      if (role === "student") bySchool[schoolId].students++;
      else if (role === "teacher") bySchool[schoolId].teachers++;
      else if (role === "school_admin") bySchool[schoolId].schoolAdmins++;
      else if (role === "content_manager") bySchool[schoolId].contentManagers++;
    }

    if (campusId) {
      if (!byCampus[campusId]) {
        byCampus[campusId] = { total: 0, students: 0, teachers: 0, schoolAdmins: 0, contentManagers: 0 };
      }
      byCampus[campusId].total++;
      if (role === "student") byCampus[campusId].students++;
      else if (role === "teacher") byCampus[campusId].teachers++;
      else if (role === "school_admin") byCampus[campusId].schoolAdmins++;
      else if (role === "content_manager") byCampus[campusId].contentManagers++;
    }
  });

  return { bySchool, byCampus };
}

export default async function OrganizationSetup() {
  let schools: School[] = [];
  let campuses: Campus[] = [];
  let users: UserRow[] = [];

  // 1) Primary: PostgreSQL
  try {
    [schools, campuses, users] = await Promise.all([
      fetchSchoolsFromPostgres(),
      fetchCampusesFromPostgres(),
      fetchUsersFromPostgres(),
    ]);
  } catch {
    // no-op, per-query handlers already return []
  }

  const pgLooksEmpty = schools.length === 0 && campuses.length === 0 && users.length === 0;
  if (pgLooksEmpty) {
    // 2) Fallback: Firebase
    try {
      const fallback = await fetchFromFirebaseWithFallback();
      schools = fallback.schools;
      campuses = fallback.campuses;
      users = fallback.users;
    } catch (fallbackErr: any) {
      console.error("[organization] Firebase fallback failed:", fallbackErr?.message || fallbackErr);
      // Keep empty payload instead of throwing 500
    }
  }

  const userCounts = calculateUserCounts(users);

  return (
    <OrganizationClient
      initialSchools={schools}
      initialCampuses={campuses}
      userCounts={userCounts}
    />
  );
}
