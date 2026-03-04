import { NextResponse } from 'next/server';
import { pgPool } from '@/lib/postgres';

const PROJECT_ID = 'quiz-app-ff0ab';

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
  nullValue?: null;
}

function parseFirestoreValue(value: FirestoreValue): any {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== undefined) return null;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.arrayValue !== undefined) {
    return (value.arrayValue.values || []).map(parseFirestoreValue);
  }
  if (value.mapValue !== undefined) {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value.mapValue.fields || {})) {
      result[key] = parseFirestoreValue(val);
    }
    return result;
  }
  return null;
}

function parseJsonSafe(value: any): any {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  if (!id) {
    return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
  }
  
  try {
    try {
      const quizSelectSql = `
        SELECT
          q.id::text AS id,
          COALESCE(
            NULLIF(to_jsonb(q)->>'title', ''),
            NULLIF(to_jsonb(q)->>'quizTitle', ''),
            'Untitled Quiz'
          ) AS title,
          COALESCE(
            NULLIF(to_jsonb(q)->>'quiz_type', ''),
            NULLIF(to_jsonb(q)->>'quizType', ''),
            ''
          ) AS "quizType",
          COALESCE(
            NULLIF(to_jsonb(q)->>'quiz_format', ''),
            NULLIF(to_jsonb(q)->>'quizFormat', ''),
            'Online'
          ) AS "quizFormat",
          COALESCE(NULLIF(to_jsonb(q)->>'subject', ''), '') AS subject,
          COALESCE(
            NULLIF(to_jsonb(q)->>'class', ''),
            NULLIF(to_jsonb(q)->>'grade', ''),
            ''
          ) AS class,
          COALESCE(
            CASE WHEN COALESCE(to_jsonb(q)->>'total_questions', '') ~ '^\\d+$' THEN (to_jsonb(q)->>'total_questions')::int END,
            CASE WHEN COALESCE(to_jsonb(q)->>'totalQuestions', '') ~ '^\\d+$' THEN (to_jsonb(q)->>'totalQuestions')::int END,
            jsonb_array_length(
              COALESCE(
                to_jsonb(q)->'items',
                to_jsonb(q)->'quizItems',
                to_jsonb(q)->'questions',
                '[]'::jsonb
              )
            ),
            0
          ) AS "totalQuestions",
          COALESCE(
            CASE WHEN COALESCE(to_jsonb(q)->>'total_marks', '') ~ '^\\d+$' THEN (to_jsonb(q)->>'total_marks')::int END,
            CASE WHEN COALESCE(to_jsonb(q)->>'totalMarks', '') ~ '^\\d+$' THEN (to_jsonb(q)->>'totalMarks')::int END,
            0
          ) AS "totalMarks",
          COALESCE(
            CASE WHEN COALESCE(to_jsonb(q)->>'time_limit_minutes', '') ~ '^\\d+$' THEN (to_jsonb(q)->>'time_limit_minutes')::int END,
            CASE WHEN COALESCE(to_jsonb(q)->>'timeLimitMinutes', '') ~ '^\\d+$' THEN (to_jsonb(q)->>'timeLimitMinutes')::int END,
            30
          ) AS "timeLimitMinutes",
          COALESCE(NULLIF(to_jsonb(q)->>'status', ''), 'draft') AS status,
          COALESCE(
            to_jsonb(q)->'items',
            to_jsonb(q)->'quizItems',
            to_jsonb(q)->'questions',
            '[]'::jsonb
          ) AS items,
          COALESCE(to_jsonb(q)->'schedule', 'null'::jsonb) AS schedule,
          COALESCE(
            NULLIF(to_jsonb(q)->>'created_at', ''),
            NULLIF(to_jsonb(q)->>'createdAt', ''),
            NULL
          ) AS "createdAt"
        FROM quizzes q
        WHERE q.id::text = $1
        LIMIT 1
      `;

      // Resolve assignment ID first to avoid collisions where assignment.id matches quizzes.id.
      // If no assignment match exists (or table is unavailable), fall back to direct quiz lookup.
      let row: any = null;
      let resolvedId = id;

      try {
        const assignmentLookup = await pgPool.query(
          `
            SELECT
              COALESCE(
                NULLIF(to_jsonb(qa)->>'quiz_id', ''),
                NULLIF(to_jsonb(qa)->>'quizId', '')
              ) AS quiz_id
            FROM quiz_assignments qa
            WHERE qa.id::text = $1
            LIMIT 1
          `,
          [id]
        );

        const resolvedQuizId = assignmentLookup.rows[0]?.quiz_id;
        if (resolvedQuizId) {
          resolvedId = String(resolvedQuizId);
        }
      } catch {
        resolvedId = id;
      }

      const res = await pgPool.query(quizSelectSql, [resolvedId]);
      row = res.rows[0];

      if (row) {
        const parsedItems = parseJsonSafe(row.items);
        const parsedSchedule = parseJsonSafe(row.schedule);
        let normalizedItems = Array.isArray(parsedItems) ? parsedItems : [];

        // Schema fallback: some deployments store quiz questions in quiz_items table
        // instead of embedding items JSON in quizzes.
        if (normalizedItems.length === 0) {
          try {
            const qiRes = await pgPool.query(
              `
                SELECT
                  qi.question_id::text AS question_id,
                  COALESCE(qi.position, 0) AS position,
                  COALESCE(qi.marks, 1) AS marks,
                  COALESCE(
                    NULLIF(to_jsonb(qu)->>'type', ''),
                    NULLIF(to_jsonb(qu)->>'question_type', ''),
                    'short'
                  ) AS question_type,
                  COALESCE(NULLIF(to_jsonb(qu)->>'subject', ''), '') AS subject,
                  COALESCE(NULLIF(to_jsonb(qu)->>'difficulty', ''), 'Medium') AS difficulty,
                  COALESCE(NULLIF(to_jsonb(qu)->>'slo', ''), '') AS slo,
                  COALESCE(
                    NULLIF(to_jsonb(qu)->>'question_text', ''),
                    NULLIF(to_jsonb(qu)->>'questionText', ''),
                    NULLIF(to_jsonb(qu)->>'question', ''),
                    ''
                  ) AS question_text,
                  COALESCE(
                    to_jsonb(qu)->'options',
                    to_jsonb(qu)->'interactive_data'->'options',
                    to_jsonb(qu)->'interactiveData'->'options',
                    '[]'::jsonb
                  ) AS options,
                  COALESCE(to_jsonb(qu)->'interactive_data', to_jsonb(qu)->'interactiveData', 'null'::jsonb) AS interactive_data,
                  COALESCE(
                    NULLIF(to_jsonb(qu)->>'correct_answer', ''),
                    NULLIF(to_jsonb(qu)->>'correctAnswer', ''),
                    NULLIF(to_jsonb(qu)->>'answer', ''),
                    ''
                  ) AS answer_text,
                  COALESCE(NULLIF(to_jsonb(qu)->>'explanation', ''), '') AS explanation,
                  CASE
                    WHEN LOWER(COALESCE(to_jsonb(qu)->>'is_interactive', 'false')) IN ('true','t','1') THEN true
                    ELSE false
                  END AS is_interactive,
                  COALESCE(NULLIF(to_jsonb(qu)->>'image_url', ''), NULLIF(to_jsonb(qu)->>'imageUrl', ''), '') AS image_url
                FROM quiz_items qi
                LEFT JOIN questions qu ON qu.id = qi.question_id
                WHERE qi.quiz_id::text = $1
                ORDER BY qi.position ASC, qi.id ASC
              `,
              [String(row.id)]
            );

            normalizedItems = qiRes.rows.map((r: any) => {
              const parsedOptions = parseJsonSafe(r.options);
              const options = Array.isArray(parsedOptions)
                ? parsedOptions.map((opt: any) =>
                    typeof opt === 'string'
                      ? { text: opt, format: 'text' }
                      : { text: String(opt?.text || ''), format: String(opt?.format || 'text') }
                  )
                : [];

              const answerText = String(r.answer_text || '').trim();
              let answerValue: any = answerText;

              // For MCQs, attempt to convert textual answer to option index.
              if ((String(r.question_type || '').toLowerCase() === 'multiple' || String(r.question_type || '').toLowerCase() === 'mcq') && options.length) {
                const numeric = /^\d+$/.test(answerText) ? Number(answerText) : -1;
                if (numeric >= 0 && numeric < options.length) {
                  answerValue = numeric;
                } else {
                  const idx = options.findIndex((opt: any) => String(opt?.text || '').trim().toLowerCase() === answerText.toLowerCase());
                  answerValue = idx >= 0 ? idx : answerText;
                }
              }

              return {
                questionId: String(r.question_id || ''),
                questionType: String(r.question_type || 'short'),
                subject: String(r.subject || ''),
                difficulty: String(r.difficulty || 'Medium'),
                slo: String(r.slo || ''),
                question: {
                  text: String(r.question_text || ''),
                  format: 'text',
                  isRTL: /urdu|islamiyat/i.test(String(r.subject || '')),
                },
                options,
                answer: {
                  type: 'text',
                  value: answerValue,
                },
                explanation: String(r.explanation || ''),
                marks: Number(r.marks) || 1,
                isInteractive: Boolean(r.is_interactive),
                interactiveData: parseJsonSafe(r.interactive_data),
                imageUrl: String(r.image_url || ''),
              };
            });
          } catch {
            // Keep empty items if quiz_items table is unavailable.
          }
        }

        const quiz = {
          id: String(row.id),
          title: row.title,
          quizType: row.quizType,
          quizFormat: row.quizFormat,
          subject: row.subject,
          class: row.class,
          totalQuestions: Number(row.totalQuestions) || normalizedItems.length || 0,
          totalMarks: Number(row.totalMarks) || 0,
          timeLimitMinutes: Number(row.timeLimitMinutes) || 30,
          status: row.status,
          items: normalizedItems,
          schedule: parsedSchedule && typeof parsedSchedule === 'object' ? parsedSchedule : null,
          createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
        };
        return NextResponse.json({ quiz, source: 'postgres' });
      }
    } catch (pgError) {
      console.error('[api/quizzes/:id][GET] PostgreSQL failed, falling back to Firestore REST:', pgError);
    }

    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/quizzes/${id}`;
    const response = await fetch(url);

    if (response.status === 404) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Firestore error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const doc = await response.json();

    const quiz: Record<string, any> = { id };
    for (const [key, value] of Object.entries(doc.fields || {})) {
      quiz[key] = parseFirestoreValue(value as FirestoreValue);
    }
    
    // Enrich quiz items with cognitive levels from questions collection
    if (quiz.items && Array.isArray(quiz.items)) {
      for (let i = 0; i < quiz.items.length; i++) {
        const item = quiz.items[i];
        if (item && item.questionId) {
          try {
            // Fetch the question document to get cognitive level
            const questionUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/questions/${item.questionId}`;
            const questionResponse = await fetch(questionUrl);
            
            if (questionResponse.ok) {
              const questionDoc = await questionResponse.json();
              const questionData: Record<string, any> = {};
              for (const [key, value] of Object.entries(questionDoc.fields || {})) {
                questionData[key] = parseFirestoreValue(value as FirestoreValue);
              }
              
              // Add cognitive level to the quiz item
              if (questionData.cognitiveLevel) {
                quiz.items[i].cognitiveLevel = questionData.cognitiveLevel;
              }
              
              console.log(`[API] Enriched item ${i} (questionId: ${item.questionId}) with cognitiveLevel:`, questionData.cognitiveLevel);
            }
          } catch (error) {
            console.log(`[API] Failed to fetch cognitive level for question ${item.questionId}:`, error);
          }
        }
      }
    }
    
    return NextResponse.json({ quiz, source: 'firebase_fallback' });
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz', details: error.message },
      { status: 500 }
    );
  }
}
