-- =============================================
-- ZEDQUIZ COMPREHENSIVE SECURITY & SCHEMA FIX
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. MISSING TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  time_limit_seconds INT DEFAULT 3600,
  question_count INT DEFAULT 10,
  passing_score INT DEFAULT 60,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  time_limit_seconds INT DEFAULT 300,
  question_count INT DEFAULT 5,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quiz_id, question_id)
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, question_id)
);

CREATE TABLE IF NOT EXISTS marking_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  exam_year INT,
  paper_variant TEXT,
  marking_scheme JSONB NOT NULL,
  notes TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id)
);

-- =============================================
-- 2. COLUMN FIXES
-- =============================================

DO $$ BEGIN
  ALTER TABLE quiz_attempts RENAME COLUMN time_taken_seconds TO time_spent_seconds;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE exam_attempts RENAME COLUMN time_taken_seconds TO time_spent_seconds;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE practice_papers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE practice_paper_questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE papers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE paper_questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE teacher_subjects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =============================================
-- 3. UPDATED_AT TRIGGER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. SAFE INDEXES
-- =============================================

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_questions_class ON questions(class_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_questions_approved ON questions(is_approved); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_questions_created ON questions(created_at DESC); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_student_progress_user ON student_progress(user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_student_progress_question ON student_progress(question_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_paper_questions_paper ON paper_questions(paper_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_practice_papers_teacher ON practice_papers(teacher_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_practice_papers_status ON practice_papers(status); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_practice_paper_questions_paper ON practice_paper_questions(practice_paper_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_topic_perf_user_subject ON topic_performance(user_id, subject_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_topic_perf_user_topic ON topic_performance(user_id, topic_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_subj_perf_user ON subject_performance(user_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_points_history_user_points ON points_history(user_id, earned_at DESC); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_downloads_uploader ON downloads(uploaded_by); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_exams_teacher ON exams(teacher_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_exams_subject ON exams(subject_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_exams_published ON exams(is_published); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_quizzes_teacher ON quizzes(teacher_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_quizzes_class ON quizzes(class_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON quizzes(subject_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_quizzes_published ON quizzes(is_published); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_quiz_questions_question ON quiz_questions(question_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_exam_questions_question ON exam_questions(question_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_marking_keys_teacher ON marking_keys(teacher_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_marking_keys_subject ON marking_keys(subject_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_marking_keys_approved ON marking_keys(is_approved); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher ON teacher_subjects(teacher_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject ON teacher_subjects(subject_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- =============================================
-- 5. RLS POLICIES
-- =============================================

DO $$ BEGIN ALTER TABLE papers ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE paper_questions ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE exams ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE marking_keys ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE points_history ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- PAPERS
DROP POLICY IF EXISTS "Teachers insert papers" ON papers;
DROP POLICY IF EXISTS "Teachers manage papers" ON papers;
DROP POLICY IF EXISTS "Teachers select own papers" ON papers;
CREATE POLICY "Teachers insert papers" ON papers FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'super_admin'))
);
CREATE POLICY "Teachers manage own papers" ON papers FOR UPDATE TO authenticated USING (
  uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- PAPER_QUESTIONS
DROP POLICY IF EXISTS "Teachers insert paper questions" ON paper_questions;
DROP POLICY IF EXISTS "Teachers update paper questions" ON paper_questions;
CREATE POLICY "Teachers insert paper questions" ON paper_questions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM papers WHERE papers.id = paper_questions.paper_id AND (papers.uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))))
);
CREATE POLICY "Teachers update paper questions" ON paper_questions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM papers WHERE papers.id = paper_questions.paper_id AND (papers.uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))))
);

-- EXAMS
DROP POLICY IF EXISTS "Public read published exams" ON exams;
DROP POLICY IF EXISTS "Teachers manage own exams" ON exams;
CREATE POLICY "Public read published exams" ON exams FOR SELECT TO anon USING (is_published = true);
CREATE POLICY "Teachers manage own exams" ON exams FOR ALL TO authenticated USING (
  teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- QUIZZES
DROP POLICY IF EXISTS "Public read published quizzes" ON quizzes;
DROP POLICY IF EXISTS "Teachers manage own quizzes" ON quizzes;
CREATE POLICY "Public read published quizzes" ON quizzes FOR SELECT TO anon USING (is_published = true);
CREATE POLICY "Teachers manage own quizzes" ON quizzes FOR ALL TO authenticated USING (
  teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- QUIZ_QUESTIONS
DROP POLICY IF EXISTS "Public read quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Teachers manage quiz questions" ON quiz_questions;
CREATE POLICY "Public read quiz questions" ON quiz_questions FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.is_published = true)
);
CREATE POLICY "Teachers manage quiz questions" ON quiz_questions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND (quizzes.teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))))
);

-- EXAM_QUESTIONS
DROP POLICY IF EXISTS "Public read exam questions" ON exam_questions;
DROP POLICY IF EXISTS "Teachers manage exam questions" ON exam_questions;
CREATE POLICY "Public read exam questions" ON exam_questions FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM exams WHERE exams.id = exam_questions.exam_id AND exams.is_published = true)
);
CREATE POLICY "Teachers manage exam questions" ON exam_questions FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM exams WHERE exams.id = exam_questions.exam_id AND (exams.teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))))
);

-- MARKING_KEYS
DROP POLICY IF EXISTS "Admins view all marking keys" ON marking_keys;
DROP POLICY IF EXISTS "Teachers view own marking keys" ON marking_keys;
DROP POLICY IF EXISTS "Teachers insert marking keys" ON marking_keys;
DROP POLICY IF EXISTS "Teachers update own marking keys" ON marking_keys;
DROP POLICY IF EXISTS "Admins manage marking keys" ON marking_keys;
CREATE POLICY "Admins view all marking keys" ON marking_keys FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Teachers view own marking keys" ON marking_keys FOR SELECT TO authenticated USING (teacher_id = auth.uid());
CREATE POLICY "Teachers insert marking keys" ON marking_keys FOR INSERT TO authenticated WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "Teachers update own marking keys" ON marking_keys FOR UPDATE TO authenticated USING (
  teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins manage marking keys" ON marking_keys FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- TEACHER_SUBJECTS
DROP POLICY IF EXISTS "Teachers view own subjects" ON teacher_subjects;
DROP POLICY IF EXISTS "Teachers manage own subjects" ON teacher_subjects;
CREATE POLICY "Teachers view own subjects" ON teacher_subjects FOR SELECT TO authenticated USING (
  teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Teachers manage own subjects" ON teacher_subjects FOR ALL TO authenticated USING (teacher_id = auth.uid());

-- POINTS_HISTORY
DROP POLICY IF EXISTS "Users can view own points history" ON points_history;
DROP POLICY IF EXISTS "Users view own points history" ON points_history;
DROP POLICY IF EXISTS "Users insert own points" ON points_history;
CREATE POLICY "Users view own points history" ON points_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own points" ON points_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- DOWNLOADS
DROP POLICY IF EXISTS "Uploader or admin can delete downloads" ON downloads;
DROP POLICY IF EXISTS "Uploader or admin can manage downloads" ON downloads;
CREATE POLICY "Uploader or admin can manage downloads" ON downloads FOR UPDATE USING (
  uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- =============================================
-- 6. UPDATED_AT TRIGGERS
-- =============================================

DO $$ BEGIN DROP TRIGGER IF EXISTS update_papers_updated_at ON papers; CREATE TRIGGER update_papers_updated_at BEFORE UPDATE ON papers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column(); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP TRIGGER IF EXISTS update_paper_questions_updated_at ON paper_questions; CREATE TRIGGER update_paper_questions_updated_at BEFORE UPDATE ON paper_questions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column(); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP TRIGGER IF EXISTS update_practice_papers_updated_at ON practice_papers; CREATE TRIGGER update_practice_papers_updated_at BEFORE UPDATE ON practice_papers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column(); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP TRIGGER IF EXISTS update_practice_paper_questions_updated_at ON practice_paper_questions; CREATE TRIGGER update_practice_paper_questions_updated_at BEFORE UPDATE ON practice_paper_questions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column(); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP TRIGGER IF EXISTS update_exams_updated_at ON exams; CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column(); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP TRIGGER IF EXISTS update_quizzes_updated_at ON quizzes; CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column(); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP TRIGGER IF EXISTS update_marking_keys_updated_at ON marking_keys; CREATE TRIGGER update_marking_keys_updated_at BEFORE UPDATE ON marking_keys FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column(); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP TRIGGER IF EXISTS update_teacher_subjects_updated_at ON teacher_subjects; CREATE TRIGGER update_teacher_subjects_updated_at BEFORE UPDATE ON teacher_subjects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column(); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- =============================================
-- DONE
-- =============================================
SELECT 'Comprehensive security and schema migration complete!' AS status;
