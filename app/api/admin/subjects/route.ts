import { NextRequest, NextResponse } from "next/server";
import { pgPool } from "@/lib/postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const subjectsRes = await pgPool.query(
      `
        SELECT id::text AS id, name, created_at AS "createdAt"
        FROM subjects
        ORDER BY name ASC
      `
    );

    const booksRes = await pgPool.query(
      `
        SELECT
          b.id::text AS id,
          b.subject_id::text AS "subjectId",
          b.title,
          b.grade,
          COALESCE(b.description, '') AS description,
          COALESCE(b.chapters, 0) AS chapters,
          b.created_at AS "createdAt",
          b.updated_at AS "updatedAt"
        FROM books b
        ORDER BY b.title ASC
      `
    );

    const booksBySubject = new Map<string, any[]>();
    for (const book of booksRes.rows) {
      const key = String(book.subjectId);
      if (!booksBySubject.has(key)) booksBySubject.set(key, []);
      booksBySubject.get(key)!.push(book);
    }

    const subjects = subjectsRes.rows.map((subject) => ({
      id: subject.id,
      name: subject.name,
      createdAt: subject.createdAt,
      books: booksBySubject.get(String(subject.id)) || [],
    }));

    return NextResponse.json({ subjects });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body?.name || "").trim();

    if (!name) {
      return NextResponse.json({ error: "Subject name is required" }, { status: 400 });
    }

    const existing = await pgPool.query(
      `SELECT id::text AS id, name, created_at AS "createdAt" FROM subjects WHERE lower(name)=lower($1) LIMIT 1`,
      [name]
    );
    if (existing.rowCount) {
      return NextResponse.json({ subject: { ...existing.rows[0], books: [] } });
    }

    const insert = await pgPool.query(
      `
        INSERT INTO subjects (name, created_at)
        VALUES ($1, NOW())
        RETURNING id::text AS id, name, created_at AS "createdAt"
      `,
      [name]
    );

    return NextResponse.json({ subject: { ...insert.rows[0], books: [] } });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create subject" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = String(body?.id || "");
    const name = String(body?.name || "").trim();

    if (!id || !name) {
      return NextResponse.json({ error: "Subject ID and name are required" }, { status: 400 });
    }

    const update = await pgPool.query(
      `
        UPDATE subjects
        SET name = $2
        WHERE id::text = $1
        RETURNING id::text AS id, name
      `,
      [id, name]
    );

    if (!update.rowCount) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    return NextResponse.json({ subject: update.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update subject" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("id");

    if (!subjectId) {
      return NextResponse.json({ error: "Subject ID is required" }, { status: 400 });
    }

    // Delete dependent rows first if FK/cascade is not defined
    await pgPool.query(
      `DELETE FROM book_chapters WHERE book_id IN (SELECT id FROM books WHERE subject_id::text = $1)`,
      [subjectId]
    );
    await pgPool.query(`DELETE FROM books WHERE subject_id::text = $1`, [subjectId]);
    await pgPool.query(`DELETE FROM subjects WHERE id::text = $1`, [subjectId]);

    return NextResponse.json({ message: "Subject deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}

