import { NextResponse } from "next/server";
import { db, getDb, switchToSecondaryFirebase, resetToPrimaryFirebase } from "@/lib/firebaseAdmin";
import { pgPool } from "@/lib/postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  // 1) Primary: PostgreSQL
  try {
    console.log('[admin/schools][GET] Fetching schools from PostgreSQL...');
    
    // Check what columns exist
    const colCheck = await pgPool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'schools'
    `);
    
    const existingColumns = new Set(colCheck.rows.map(r => r.column_name));
    
    // Build dynamic SELECT based on existing columns
    const selectCols = [];
    if (existingColumns.has('id')) selectCols.push('id::text AS id');
    if (existingColumns.has('name')) selectCols.push('name');
    if (existingColumns.has('address')) selectCols.push(`COALESCE(address, '') AS address`);
    if (existingColumns.has('city')) selectCols.push(`COALESCE(city, '') AS city`);
    if (existingColumns.has('email')) selectCols.push(`COALESCE(email, '') AS "contactEmail"`);
    if (existingColumns.has('contact_email')) selectCols.push(`COALESCE(contact_email, '') AS "contactEmail"`);
    if (existingColumns.has('phone')) selectCols.push(`COALESCE(phone, '') AS "contactPhone"`);
    if (existingColumns.has('contact_phone')) selectCols.push(`COALESCE(contact_phone, '') AS "contactPhone"`);
    if (existingColumns.has('status')) selectCols.push(`COALESCE(status, 'Active') AS status`);
    if (existingColumns.has('created_at')) selectCols.push('created_at AS "createdAt"');
    if (existingColumns.has('updated_at')) selectCols.push('updated_at AS "updatedAt"');
    
    const sql = `
      SELECT ${selectCols.join(', ')}
      FROM schools
      ORDER BY created_at DESC NULLS LAST, id DESC
      LIMIT 500
    `;
    
    const res = await pgPool.query(sql);
    console.log('[admin/schools][GET] Found', res.rows.length, 'schools in PostgreSQL');
    return NextResponse.json({ schools: res.rows, source: "postgres" });
  } catch (pgError: any) {
    console.error('[admin/schools][GET] PostgreSQL failed:', pgError);
    // 2) Fallback: Firebase (primary/secondary)
    try {
      if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
        return NextResponse.json(
          { error: "PostgreSQL failed and Firebase not configured", details: pgError?.message },
          { status: 503 }
        );
      }

      const primaryDb = await getDb();
      const snapshot = await primaryDb.collection("schools").get();
      const schools = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      resetToPrimaryFirebase();
      return NextResponse.json({ schools, source: "firebase_fallback_primary" });
    } catch (firebaseError: any) {
      if (firebaseError?.message?.includes("quota") || firebaseError?.code === "RESOURCE_EXHAUSTED") {
        try {
          switchToSecondaryFirebase();
          const backupDb = await getDb();
          const snapshot = await backupDb.collection("schools").get();
          const schools = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
          resetToPrimaryFirebase();
          return NextResponse.json({ schools, source: "firebase_fallback_secondary" });
        } catch (secondaryError: any) {
          resetToPrimaryFirebase();
          return NextResponse.json(
            {
              error: "Failed to fetch schools",
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
          error: "Failed to fetch schools",
          details: { postgres: pgError?.message, firebasePrimary: firebaseError?.message },
        },
        { status: 500 }
      );
    }
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, address, city, contactEmail, contactPhone } = body;

  console.log('[admin/schools][POST] Creating school:', { name, address, city, contactEmail, contactPhone });

  if (!name) {
    return NextResponse.json({ error: "School name is required" }, { status: 400 });
  }

  // 1) Primary write: PostgreSQL
  try {
    console.log('[admin/schools][POST] Attempting PostgreSQL insert...');
    
    // First, verify the schools table exists and get its columns
    const tableCheck = await pgPool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'schools'
    `);
    
    const existingColumns = new Set(tableCheck.rows.map(r => r.column_name));
    console.log('[admin/schools][POST] Schools table columns:', Array.from(existingColumns));
    
    if (tableCheck.rowCount === 0) {
      console.error('[admin/schools][POST] Schools table does not exist! Creating it...');
      
      // Create schools table if it doesn't exist
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS schools (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          address TEXT,
          city VARCHAR(100),
          email VARCHAR(255),
          phone VARCHAR(50),
          status VARCHAR(50) DEFAULT 'Active',
          firebase_id VARCHAR(255),
          total_users INTEGER DEFAULT 0,
          total_students INTEGER DEFAULT 0,
          total_teachers INTEGER DEFAULT 0,
          total_school_admins INTEGER DEFAULT 0,
          total_content_managers INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('[admin/schools][POST] Schools table created');
      existingColumns.add('id');
      existingColumns.add('name');
      existingColumns.add('address');
      existingColumns.add('city');
      existingColumns.add('email');
      existingColumns.add('phone');
      existingColumns.add('status');
      existingColumns.add('created_at');
      existingColumns.add('updated_at');
    }
    
    // Build dynamic INSERT based on existing columns
    const columnMap = {
      name: name,
      address: address || "",
      city: city || "",
      email: contactEmail || "",
      contact_email: contactEmail || "",
      phone: contactPhone || "",
      contact_phone: contactPhone || "",
      status: 'Active',
    };
    
    const columns = [];
    const values = [];
    const placeholders = [];
    
    // Add columns that exist in the table
    Object.entries(columnMap).forEach(([col, val]) => {
      if (existingColumns.has(col)) {
        columns.push(col);
        values.push(val);
        placeholders.push(`$${values.length}`);
      }
    });
    
    // Add metadata columns if they exist
    if (existingColumns.has('total_users')) {
      columns.push('total_users', 'total_students', 'total_teachers', 'total_school_admins', 'total_content_managers');
      placeholders.push('0', '0', '0', '0', '0');
    }
    
    if (existingColumns.has('created_at')) {
      columns.push('created_at', 'updated_at');
      placeholders.push('NOW()', 'NOW()');
    }
    
    // Build RETURNING clause based on what columns exist
    const returningCols = [];
    if (existingColumns.has('id')) returningCols.push('id::text AS id');
    if (existingColumns.has('name')) returningCols.push('name');
    if (existingColumns.has('address')) returningCols.push(`COALESCE(address, '') AS address`);
    if (existingColumns.has('city')) returningCols.push(`COALESCE(city, '') AS city`);
    if (existingColumns.has('email')) returningCols.push(`COALESCE(email, '') AS "contactEmail"`);
    if (existingColumns.has('contact_email')) returningCols.push(`COALESCE(contact_email, '') AS "contactEmail"`);
    if (existingColumns.has('phone')) returningCols.push(`COALESCE(phone, '') AS "contactPhone"`);
    if (existingColumns.has('contact_phone')) returningCols.push(`COALESCE(contact_phone, '') AS "contactPhone"`);
    if (existingColumns.has('status')) returningCols.push(`COALESCE(status, 'Active') AS status`);
    if (existingColumns.has('created_at')) returningCols.push('created_at AS "createdAt"');
    if (existingColumns.has('updated_at')) returningCols.push('updated_at AS "updatedAt"');
    
    const sql = `
      INSERT INTO schools (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING ${returningCols.join(', ')}
    `;
    
    console.log('[admin/schools][POST] Dynamic SQL:', sql);
    console.log('[admin/schools][POST] Values:', values);
    
    const insert = await pgPool.query(sql, values);

    console.log('[admin/schools][POST] PostgreSQL insert successful:', insert.rows[0]);

    // Best effort dual-write to Firebase during migration phase.
    try {
      console.log('[admin/schools][POST] Attempting Firebase dual-write...');
      await db.collection("schools").add({
        name,
        address: address || "",
        city: city || "",
        contactEmail: contactEmail || "",
        contactPhone: contactPhone || "",
        status: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalUsers: 0,
        totalStudents: 0,
        totalTeachers: 0,
        totalSchoolAdmins: 0,
        totalContentManagers: 0,
      });
      console.log('[admin/schools][POST] Firebase dual-write successful');
    } catch (e) {
      console.log('[admin/schools][POST] Firebase dual-write failed (ignored):', e);
      // Ignore Firebase write failure while PostgreSQL is primary
    }

    return NextResponse.json({ success: true, school: insert.rows[0], source: "postgres" });
  } catch (pgError: any) {
    console.error('[admin/schools][POST] PostgreSQL insert failed, falling back to Firebase:', pgError);
    // 2) Fallback write: Firebase
    try {
      const schoolData = {
        name,
        address: address || "",
        city: city || "",
        contactEmail: contactEmail || "",
        contactPhone: contactPhone || "",
        status: "Active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalUsers: 0,
        totalStudents: 0,
        totalTeachers: 0,
        totalSchoolAdmins: 0,
        totalContentManagers: 0,
      };

      const docRef = await db.collection("schools").add(schoolData);
      return NextResponse.json({
        success: true,
        school: { id: docRef.id, ...schoolData },
        source: "firebase_fallback",
      });
    } catch (firebaseError: any) {
      return NextResponse.json(
        {
          error: "Failed to create school",
          details: { postgres: pgError?.message, firebase: firebaseError?.message },
        },
        { status: 500 }
      );
    }
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('id');

  console.log('[admin/schools][DELETE] Deleting school:', schoolId);

  if (!schoolId) {
    return NextResponse.json({ error: "School ID is required" }, { status: 400 });
  }

  // 1) Primary delete: PostgreSQL
  try {
    console.log('[admin/schools][DELETE] Attempting PostgreSQL delete...');
    
    // Check if school exists and has users
    const checkRes = await pgPool.query(
      `SELECT COUNT(*) as user_count FROM users WHERE school_id = $1`,
      [schoolId]
    );
    
    const userCount = parseInt(checkRes.rows[0]?.user_count || '0');
    console.log('[admin/schools][DELETE] School has', userCount, 'users');
    
    if (userCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete school. It has ${userCount} users assigned. Please reassign users first.` 
      }, { status: 400 });
    }
    
    // Delete school
    const deleteRes = await pgPool.query(
      `DELETE FROM schools WHERE id = $1 RETURNING id`,
      [schoolId]
    );
    
    if (deleteRes.rowCount === 0) {
      console.log('[admin/schools][DELETE] School not found in PostgreSQL');
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }
    
    console.log('[admin/schools][DELETE] PostgreSQL delete successful');
    
    // Best effort delete from Firebase
    try {
      await db.collection("schools").doc(schoolId).delete();
      console.log('[admin/schools][DELETE] Firebase delete successful');
    } catch (e) {
      console.log('[admin/schools][DELETE] Firebase delete failed (ignored):', e);
    }
    
    return NextResponse.json({ success: true, message: "School deleted successfully" });
  } catch (pgError: any) {
    console.error('[admin/schools][DELETE] PostgreSQL delete failed:', pgError);
    
    // 2) Fallback delete: Firebase
    try {
      await db.collection("schools").doc(schoolId).delete();
      return NextResponse.json({ 
        success: true, 
        message: "School deleted successfully",
        source: "firebase_fallback" 
      });
    } catch (firebaseError: any) {
      return NextResponse.json(
        {
          error: "Failed to delete school",
          details: { postgres: pgError?.message, firebase: firebaseError?.message },
        },
        { status: 500 }
      );
    }
  }
}
