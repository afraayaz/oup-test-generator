BEGIN;

CREATE TABLE IF NOT EXISTS quiz_assignments (
  id BIGSERIAL PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  quiz_title TEXT,
  is_marked BOOLEAN NOT NULL DEFAULT FALSE,
  time_limit_minutes INTEGER NOT NULL DEFAULT 30,
  schedule JSONB,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'assigned',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  score NUMERIC,
  total_marks NUMERIC,
  percentage NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_assignments_quiz_student
  ON quiz_assignments (quiz_id, student_id);

CREATE INDEX IF NOT EXISTS idx_quiz_assignments_student_id
  ON quiz_assignments (student_id);

CREATE INDEX IF NOT EXISTS idx_quiz_assignments_quiz_id
  ON quiz_assignments (quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_assignments_status
  ON quiz_assignments (status);

CREATE INDEX IF NOT EXISTS idx_quiz_assignments_assigned_at
  ON quiz_assignments (assigned_at DESC);

COMMIT;
