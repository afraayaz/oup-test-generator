import { NextRequest, NextResponse } from "next/server";
import { pgPool } from "@/lib/postgres";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");

    if (!bookId) {
      return NextResponse.json({ error: "Book ID is required" }, { status: 400 });
    }

    const response = await pgPool.query(
      `
        SELECT
          id::text AS id,
          chapter_number AS "chapterNo",
          chapter_name AS "chapterName",
          NULL::text AS topic,
          COALESCE(description, '') AS description,
          created_at AS "createdAt"
        FROM book_chapters
        WHERE book_id::text = $1
        ORDER BY chapter_number ASC, chapter_name ASC
      `,
      [bookId]
    );

    return NextResponse.json({ chapters: response.rows });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch chapters" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bookId = String(body?.bookId || "");
    const chapterNo = Number(body?.chapterNo);
    const chapterName = String(body?.chapterName || "").trim();
    const description = String(body?.description || "");

    if (!bookId || !Number.isFinite(chapterNo) || !chapterName) {
      return NextResponse.json(
        { error: "Book ID, Chapter No, and Chapter Name are required" },
        { status: 400 }
      );
    }

    const insert = await pgPool.query(
      `
        INSERT INTO book_chapters (book_id, chapter_number, chapter_name, description, created_at, updated_at)
        VALUES ($1::bigint, $2, $3, $4, NOW(), NOW())
        RETURNING
          id::text AS id,
          chapter_number AS "chapterNo",
          chapter_name AS "chapterName",
          NULL::text AS topic,
          COALESCE(description, '') AS description,
          created_at AS "createdAt"
      `,
      [bookId, chapterNo, chapterName, description]
    );

    // keep books.chapters count aligned
    await pgPool.query(
      `
        UPDATE books b
        SET chapters = sub.cnt, updated_at = NOW()
        FROM (
          SELECT book_id, COUNT(*)::int AS cnt
          FROM book_chapters
          WHERE book_id::text = $1
          GROUP BY book_id
        ) sub
        WHERE b.id = sub.book_id
      `,
      [bookId]
    );

    return NextResponse.json({ chapter: insert.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create chapter" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const chapterId = String(body?.chapterId || "");
    const chapterNo = Number(body?.chapterNo);
    const chapterName = String(body?.chapterName || "").trim();
    const description = String(body?.description || "");

    if (!chapterId || !Number.isFinite(chapterNo) || !chapterName) {
      return NextResponse.json({ error: "All required fields are missing" }, { status: 400 });
    }

    const update = await pgPool.query(
      `
        UPDATE book_chapters
        SET
          chapter_number = $2,
          chapter_name = $3,
          description = $4,
          updated_at = NOW()
        WHERE id::text = $1
        RETURNING id::text AS id
      `,
      [chapterId, chapterNo, chapterName, description]
    );

    if (!update.rowCount) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update chapter" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");
    const chapterId = searchParams.get("chapterId");

    if (!bookId || !chapterId) {
      return NextResponse.json({ error: "Book ID and Chapter ID are required" }, { status: 400 });
    }

    const del = await pgPool.query(
      `DELETE FROM book_chapters WHERE id::text = $1 AND book_id::text = $2`,
      [chapterId, bookId]
    );

    if (!del.rowCount) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    // keep books.chapters count aligned
    await pgPool.query(
      `
        UPDATE books
        SET
          chapters = (
            SELECT COUNT(*)::int
            FROM book_chapters
            WHERE book_id::text = $1
          ),
          updated_at = NOW()
        WHERE id::text = $1
      `,
      [bookId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete chapter" }, { status: 500 });
  }
}

