import { NextRequest, NextResponse } from "next/server";
import { pgPool } from "@/lib/postgres";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const subjectId = String(body?.subjectId || "");
    const title = String(body?.title || "").trim();
    const grade = String(body?.grade || "").trim();
    const description = String(body?.description || "");
    const chapters = Number.isFinite(body?.chapters) ? Number(body.chapters) : 0;

    if (!subjectId || !title || !grade) {
      return NextResponse.json(
        { error: "Subject ID, title, and grade are required" },
        { status: 400 }
      );
    }

    const insert = await pgPool.query(
      `
        INSERT INTO books (subject_id, title, grade, description, chapters, created_at, updated_at)
        VALUES ($1::bigint, $2, $3, $4, $5, NOW(), NOW())
        RETURNING
          id::text AS id,
          subject_id::text AS "subjectId",
          title,
          grade,
          description,
          chapters,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [subjectId, title, grade, description, chapters]
    );

    return NextResponse.json({ book: insert.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create book" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const subjectId = String(body?.subjectId || "");
    const bookId = String(body?.bookId || "");
    const title = String(body?.title || "").trim();
    const grade = String(body?.grade || "").trim();
    const description = String(body?.description || "");
    const chapters = Number.isFinite(body?.chapters) ? Number(body.chapters) : 0;

    if (!subjectId || !bookId || !title || !grade) {
      return NextResponse.json(
        { error: "Subject ID, book ID, title, and grade are required" },
        { status: 400 }
      );
    }

    const update = await pgPool.query(
      `
        UPDATE books
        SET
          title = $3,
          grade = $4,
          description = $5,
          chapters = $6,
          updated_at = NOW()
        WHERE id::text = $1
          AND subject_id::text = $2
        RETURNING
          id::text AS id,
          subject_id::text AS "subjectId",
          title,
          grade,
          description,
          chapters,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [bookId, subjectId, title, grade, description, chapters]
    );

    if (!update.rowCount) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({ book: update.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update book" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    const bookId = searchParams.get("bookId");

    if (!subjectId || !bookId) {
      return NextResponse.json({ error: "Subject ID and Book ID are required" }, { status: 400 });
    }

    await pgPool.query(`DELETE FROM book_chapters WHERE book_id::text = $1`, [bookId]);
    const del = await pgPool.query(
      `DELETE FROM books WHERE id::text = $1 AND subject_id::text = $2`,
      [bookId, subjectId]
    );

    if (!del.rowCount) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Book deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete book" }, { status: 500 });
  }
}

