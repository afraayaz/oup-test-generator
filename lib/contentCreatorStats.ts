import { pgPool } from "@/lib/postgres";

const TYPE_LABELS: Record<string, string> = {
  multiple: "MCQ",
  truefalse: "True/False",
  short: "Short Answer",
  long: "Long Answer",
  fillblanks: "Fill Blanks",
  matching: "Matching",
  ordering: "Ordering",
  categorization: "Categorization",
  "drag-drop": "Drag & Drop",
};

const TYPE_COLORS: Record<string, string> = {
  MCQ: "#8B5CF6",
  "True/False": "#10B981",
  "Short Answer": "#F59E0B",
  "Long Answer": "#EF4444",
  "Fill Blanks": "#06B6D4",
  Matching: "#EC4899",
  Ordering: "#6366F1",
  Categorization: "#84CC16",
  "Drag & Drop": "#F97316",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "#10B981",
  Medium: "#F59E0B",
  Hard: "#EF4444",
};

function normalizeGrade(grade: string): string {
  return (grade || "").replace(/^grade\s*/i, "").trim();
}

function getTimeAgo(date: Date): string {
  const timeDiff = Date.now() - date.getTime();
  const hours = Math.floor(timeDiff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return "Just now";
}

async function resolveUserPk(authUserId: string, authEmail?: string | null): Promise<string | null> {
  const colsRes = await pgPool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name IN ('uid', 'firebase_uid', 'email')
    `
  );
  const cols = new Set<string>(colsRes.rows.map((r: any) => r.column_name));
  const where: string[] = [];
  const values: any[] = [];

  if (authUserId && cols.has("uid")) {
    values.push(authUserId);
    where.push(`uid = $${values.length}`);
  }
  if (authUserId && cols.has("firebase_uid")) {
    values.push(authUserId);
    where.push(`firebase_uid = $${values.length}`);
  }
  if (authEmail && cols.has("email")) {
    values.push(authEmail.toLowerCase());
    where.push(`LOWER(email) = $${values.length}`);
  }

  if (!where.length) return null;

  const sql = `SELECT id::text AS id FROM users WHERE ${where.join(" OR ")} LIMIT 1`;
  const res = await pgPool.query(sql, values);
  return res.rows[0]?.id || null;
}

async function getCreatorKeys(authUserId: string, authEmail?: string | null): Promise<string[]> {
  const keys = new Set<string>();
  if (authUserId) keys.add(String(authUserId));
  const pk = await resolveUserPk(authUserId, authEmail);
  if (pk) keys.add(String(pk));
  return Array.from(keys);
}

export async function ensureContentCreatorStatsTable(): Promise<void> {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS content_creator_stats (
      creator_id text PRIMARY KEY,
      questions_created integer NOT NULL DEFAULT 0,
      questions_approved integer NOT NULL DEFAULT 0,
      pending_review integer NOT NULL DEFAULT 0,
      rejected_questions integer NOT NULL DEFAULT 0,
      this_week integer NOT NULL DEFAULT 0,
      approval_rate integer NOT NULL DEFAULT 100,
      creation_trend jsonb NOT NULL DEFAULT '[]'::jsonb,
      difficulty_distribution jsonb NOT NULL DEFAULT '[]'::jsonb,
      question_type_distribution jsonb NOT NULL DEFAULT '[]'::jsonb,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function refreshContentCreatorStats(userId: string, userEmail?: string | null): Promise<void> {
  await ensureContentCreatorStatsTable();
  const creatorKeys = await getCreatorKeys(userId, userEmail);

  const { rows } = await pgPool.query(
    `
      SELECT
        id,
        question_text,
        subject,
        grade,
        difficulty,
        type,
        created_at
      FROM questions
      WHERE qb_source = 'oup'
        AND created_by::text = ANY($1::text[])
    `,
    [creatorKeys]
  );

  const totalQuestions = rows.length;
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const thisWeek = rows.filter((q) => new Date(q.created_at) >= oneWeekAgo).length;

  const creationTrendData: Array<{ week: string; created: number; approved: number; rejected: number }> = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - i * 7);

    const count = rows.filter((q) => {
      const createdAt = new Date(q.created_at);
      return createdAt >= weekStart && createdAt < weekEnd;
    }).length;

    creationTrendData.push({
      week: `Week ${4 - i}`,
      created: count,
      approved: 0,
      rejected: 0,
    });
  }

  const difficultyCounts: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 };
  rows.forEach((q) => {
    const difficulty = q.difficulty || "Medium";
    if (difficultyCounts[difficulty] !== undefined) {
      difficultyCounts[difficulty]++;
    }
  });
  const difficultyDistribution = Object.entries(difficultyCounts).map(([subject, count]) => ({
    subject,
    count,
    color: DIFFICULTY_COLORS[subject] || "#F59E0B",
  }));

  const typeCounts: Record<string, number> = {};
  rows.forEach((q) => {
    const type = q.type || "multiple";
    const label = TYPE_LABELS[type] || type;
    typeCounts[label] = (typeCounts[label] || 0) + 1;
  });
  const questionTypeDistribution = Object.entries(typeCounts)
    .map(([level, count]) => ({
      level,
      count,
      color: TYPE_COLORS[level] || "#8B5CF6",
    }))
    .sort((a, b) => b.count - a.count);

  await pgPool.query(
    `
      INSERT INTO content_creator_stats (
        creator_id,
        questions_created,
        questions_approved,
        pending_review,
        rejected_questions,
        this_week,
        approval_rate,
        creation_trend,
        difficulty_distribution,
        question_type_distribution,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,NOW())
      ON CONFLICT (creator_id)
      DO UPDATE SET
        questions_created = EXCLUDED.questions_created,
        questions_approved = EXCLUDED.questions_approved,
        pending_review = EXCLUDED.pending_review,
        rejected_questions = EXCLUDED.rejected_questions,
        this_week = EXCLUDED.this_week,
        approval_rate = EXCLUDED.approval_rate,
        creation_trend = EXCLUDED.creation_trend,
        difficulty_distribution = EXCLUDED.difficulty_distribution,
        question_type_distribution = EXCLUDED.question_type_distribution,
        updated_at = NOW()
    `,
    [
      userId,
      totalQuestions,
      totalQuestions,
      0,
      0,
      thisWeek,
      100,
      JSON.stringify(creationTrendData),
      JSON.stringify(difficultyDistribution),
      JSON.stringify(questionTypeDistribution),
    ]
  );
}

export async function getContentCreatorDashboardData(userId: string, userEmail?: string | null) {
  await ensureContentCreatorStatsTable();
  const creatorKeys = await getCreatorKeys(userId, userEmail);

  const [statsRes, questionsRes] = await Promise.all([
    pgPool.query(
      `
        SELECT
          questions_created,
          questions_approved,
          pending_review,
          rejected_questions,
          this_week,
          approval_rate,
          creation_trend,
          difficulty_distribution,
          question_type_distribution
        FROM content_creator_stats
        WHERE creator_id = $1
        LIMIT 1
      `,
      [userId]
    ),
    pgPool.query(
      `
        SELECT
          id,
          question_text AS "questionText",
          subject,
          grade,
          difficulty,
          type,
          created_at AS "createdAt"
        FROM questions
        WHERE qb_source = 'oup'
          AND created_by::text = ANY($1::text[])
        ORDER BY created_at DESC
      `,
      [creatorKeys]
    ),
  ]);

  if (!statsRes.rowCount) {
    await refreshContentCreatorStats(userId, userEmail);
    return getContentCreatorDashboardData(userId, userEmail);
  }

  const statsRow = statsRes.rows[0];
  const questions = questionsRes.rows;
  const recentQuestions = questions.slice(0, 4).map((q: any) => {
    const createdAt = new Date(q.createdAt);
    return {
      id: q.id,
      text: q.questionText || "No question text",
      subject: q.subject || "N/A",
      grade: q.grade || "N/A",
      difficulty: q.difficulty || "Medium",
      status: "approved",
      time: getTimeAgo(createdAt),
    };
  });

  const availableGrades = [...new Set(questions.map((q: any) => normalizeGrade(q.grade)).filter(Boolean))].sort(
    (a, b) => {
      const aNum = parseInt(a, 10);
      const bNum = parseInt(b, 10);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
      return String(a).localeCompare(String(b));
    }
  );
  const availableSubjects = [...new Set(questions.map((q: any) => q.subject).filter(Boolean))].sort();

  return {
    stats: {
      questionsCreated: statsRow.questions_created || 0,
      questionsApproved: statsRow.questions_approved || 0,
      pendingReview: statsRow.pending_review || 0,
      rejectedQuestions: statsRow.rejected_questions || 0,
      thisWeek: statsRow.this_week || 0,
      approvalRate: statsRow.approval_rate || 100,
    },
    creationTrendData: statsRow.creation_trend || [],
    subjectDistribution: statsRow.difficulty_distribution || [],
    difficultyBreakdown: statsRow.question_type_distribution || [],
    recentQuestions,
    availableGrades,
    availableSubjects,
    allQuestions: questions,
  };
}
