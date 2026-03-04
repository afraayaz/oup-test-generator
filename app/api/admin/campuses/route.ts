import { NextResponse } from "next/server";
import { db, getDb, switchToSecondaryFirebase, resetToPrimaryFirebase } from "@/lib/firebaseAdmin";
import { pgPool } from "@/lib/postgres";

export const dynamic = "force-dynamic";

async function resolveSchoolPk(schoolId: string): Promise<number | null> {
  if (!schoolId) return null;
  if (/^\d+$/.test(schoolId)) return Number(schoolId);

  // If caller passed Firebase school id, try mapping through schools.firebase_id
  try {
    const byFirebase = await pgPool.query(
      `SELECT id FROM schools WHERE firebase_id = $1 LIMIT 1`,
      [schoolId]
    );
    if (byFirebase.rowCount) return Number(byFirebase.rows[0].id);
  } catch {
    // ignore if firebase_id column is not present
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get("schoolId");

  // 1) Primary: PostgreSQL
  try {
    const values: any[] = [];
    const where: string[] = [];

    if (schoolId) {
      const schoolPk = await resolveSchoolPk(schoolId);
      values.push(schoolId);
      where.push(`COALESCE(c.firebase_school_id, '') = $${values.length}`);

      if (schoolPk !== null) {
        values.push(schoolPk);
        where.push(`c.school_id = $${values.length}`);
      }
    }

    const res = await pgPool.query(
      `
        SELECT
          c.id::text AS id,
          c.name,
          COALESCE(c.address, '') AS address,
          COALESCE(c.city, '') AS city,
          COALESCE(c.status, 'Active') AS status,
          COALESCE(c.firebase_school_id, c.school_id::text, '') AS "schoolId",
          COALESCE(c.school_name, s.name, '') AS "schoolName",
          c.created_at AS "createdAt",
          c.updated_at AS "updatedAt"
        FROM campuses c
        LEFT JOIN schools s ON s.id = c.school_id
        ${where.length ? `WHERE (${where.join(" OR ")})` : ""}
        ORDER BY c.created_at DESC NULLS LAST, c.id DESC
        LIMIT 1000
      `,
      values
    );

    return NextResponse.json({ campuses: res.rows, source: "postgres" });
  } catch (pgError: any) {
    // 2) Fallback: Firebase primary/secondary
    try {
      if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
        return NextResponse.json(
          { error: "PostgreSQL failed and Firebase not configured", details: pgError?.message },
          { status: 503 }
        );
      }

      const primaryDb = await getDb();
      const snapshot = await primaryDb.collection("campuses").get();
      let campuses = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      if (schoolId) campuses = campuses.filter((c: any) => c.schoolId === schoolId);
      resetToPrimaryFirebase();
      return NextResponse.json({ campuses, source: "firebase_fallback_primary" });
    } catch (firebaseError: any) {
      if (firebaseError?.message?.includes("quota") || firebaseError?.code === "RESOURCE_EXHAUSTED") {
        try {
          switchToSecondaryFirebase();
          const backupDb = await getDb();
          const snapshot = await backupDb.collection("campuses").get();
          let campuses = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
          if (schoolId) campuses = campuses.filter((c: any) => c.schoolId === schoolId);
          resetToPrimaryFirebase();
          return NextResponse.json({ campuses, source: "firebase_fallback_secondary" });
        } catch (secondaryError: any) {
          resetToPrimaryFirebase();
          return NextResponse.json(
            {
              error: "Failed to fetch campuses",
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

      return NextResponse.json(
        {
          error: "Failed to fetch campuses",
          details: { postgres: pgError?.message, firebasePrimary: firebaseError?.message },
        },
        { status: 500 }
      );
    }
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, schoolId, schoolName, address, city } = body;

  if (!name || !schoolId) {
    return NextResponse.json({ error: "Campus name and school are required" }, { status: 400 });
  }

  // 1) Primary write: PostgreSQL
  try {
    const schoolPk = await resolveSchoolPk(String(schoolId));
    const insert = await pgPool.query(
      `
        INSERT INTO campuses (
          name, school_id, firebase_school_id, school_name, address, city, status,
          total_users, total_students, total_teachers, total_school_admins, total_content_managers,
          created_at, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,'Active',0,0,0,0,0,NOW(),NOW())
        RETURNING
          id::text AS id,
          name,
          COALESCE(address, '') AS address,
          COALESCE(city, '') AS city,
          COALESCE(status, 'Active') AS status,
          COALESCE(firebase_school_id, school_id::text, '') AS "schoolId",
          COALESCE(school_name, '') AS "schoolName",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [name, schoolPk, String(schoolId), schoolName || "", address || "", city || ""]
    );

    // Best effort dual-write to Firebase
    try {
      await db.collection("campuses").add({
        name,
        schoolId: String(schoolId),
        schoolName: schoolName || "",
        address: address || "",
        city: city || "",
        status: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalUsers: 0,
        totalStudents: 0,
        totalTeachers: 0,
        totalSchoolAdmins: 0,
        totalContentManagers: 0,
      });
    } catch {
      // ignore Firebase write failure while PostgreSQL is primary
    }

    return NextResponse.json({ success: true, campus: insert.rows[0], source: "postgres" });
  } catch (pgError: any) {
    // 2) Fallback write: Firebase
    try {
      const campusData = {
        name,
        schoolId: String(schoolId),
        schoolName: schoolName || "",
        address: address || "",
        city: city || "",
        status: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalUsers: 0,
        totalStudents: 0,
        totalTeachers: 0,
        totalSchoolAdmins: 0,
        totalContentManagers: 0,
      };

      const docRef = await db.collection("campuses").add(campusData);
      return NextResponse.json({
        success: true,
        campus: { id: docRef.id, ...campusData },
        source: "firebase_fallback",
      });
    } catch (firebaseError: any) {
      return NextResponse.json(
        {
          error: "Failed to create campus",
          details: { postgres: pgError?.message, firebase: firebaseError?.message },
        },
        { status: 500 }
      );
    }
  }
}
