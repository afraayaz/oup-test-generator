-- Adds relational link from questions -> books
-- Safe to run multiple times.

BEGIN;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS book_id BIGINT;

-- Backfill book_id from existing text fields (subject/book/grade).
UPDATE questions q
SET book_id = x.book_id
FROM (
  SELECT
    q1.id AS question_id,
    (
      SELECT b.id
      FROM books b
      JOIN subjects s ON s.id = b.subject_id
      WHERE LOWER(s.name) = LOWER(COALESCE(q1.subject, ''))
        AND LOWER(b.title) = LOWER(COALESCE(q1.book, ''))
      ORDER BY
        CASE
          WHEN LOWER(COALESCE(b.grade, '')) = LOWER(COALESCE(q1.grade, '')) THEN 0
          ELSE 1
        END,
        b.id DESC
      LIMIT 1
    ) AS book_id
  FROM questions q1
  WHERE q1.book_id IS NULL
) x
WHERE q.id = x.question_id
  AND x.book_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'questions_book_id_fkey'
  ) THEN
    ALTER TABLE questions
      ADD CONSTRAINT questions_book_id_fkey
      FOREIGN KEY (book_id) REFERENCES books(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_questions_book_id ON questions(book_id);

COMMIT;
