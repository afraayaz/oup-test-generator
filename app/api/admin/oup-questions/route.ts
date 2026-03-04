import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { pgPool } from "@/lib/postgres";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subject = searchParams.get("subject");

  // 1) Primary: PostgreSQL
  try {
    const where: string[] = [`qb_source = 'oup'`];
    const values: any[] = [];
    if (subject) {
      values.push(subject);
      where.push(`LOWER(subject) = LOWER($${values.length})`);
    }

    const questionsRes = await pgPool.query(
      `
        SELECT id, question_text AS question, subject, grade, book, chapter, difficulty, type, created_at AS "createdAt"
        FROM questions
        WHERE ${where.join(" AND ")}
        ORDER BY created_at DESC NULLS LAST
        LIMIT 5000
      `,
      values
    );

    const breakdownRes = await pgPool.query(
      `
        SELECT
          COALESCE(book, 'Unknown Book') AS book,
          COALESCE(grade, 'Unknown Grade') AS grade,
          COUNT(*)::int AS questions
        FROM questions
        WHERE ${where.join(" AND ")}
        GROUP BY COALESCE(book, 'Unknown Book'), COALESCE(grade, 'Unknown Grade')
        ORDER BY COALESCE(book, 'Unknown Book') ASC
      `,
      values
    );

    return NextResponse.json({ 
      questions: questionsRes.rows,
      total: questionsRes.rowCount || 0,
      totalOUPQuestions: questionsRes.rowCount || 0,
      bookwiseBreakdown: breakdownRes.rows,
      source: "postgres"
    });
  } catch (error: any) {
    // 2) Fallback: Firebase (kept for migration phase)
    try {
      if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
        return NextResponse.json(
          { error: "PostgreSQL failed and Firebase not configured", details: error.message },
          { status: 503 }
        );
      }

      const snapshot = await db.collection("questions").doc("oup").collection("items").limit(1000).get();
      const questions = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

      let result = questions;
      if (subject) {
        result = questions.filter(
          (q: any) => q.subject && q.subject.toLowerCase() === subject.toLowerCase()
        );
      }

      const bookwiseBreakdown: { [key: string]: number } = {};
      const bookGradeMap: { [key: string]: string } = {};
      result.forEach((q: any) => {
        const bookName = q.book || "Unknown Book";
        const grade = q.grade || "Unknown Grade";
        bookwiseBreakdown[bookName] = (bookwiseBreakdown[bookName] || 0) + 1;
        bookGradeMap[bookName] = grade;
      });

      const bookwiseArray = Object.entries(bookwiseBreakdown)
        .map(([book, count]) => ({
          book,
          grade: bookGradeMap[book] || "Unknown",
          questions: count,
        }))
        .sort((a, b) => a.book.localeCompare(b.book));

      return NextResponse.json({
        questions: result,
        total: result.length,
        totalOUPQuestions: questions.length,
        bookwiseBreakdown: bookwiseArray,
        source: "firebase_fallback",
      });
    } catch (fallbackError: any) {
      return NextResponse.json(
        { error: "Failed to fetch OUP questions", details: fallbackError?.message || error?.message },
        { status: 500 }
      );
    }
  }
}
