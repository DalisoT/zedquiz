-- =============================================
-- PRACTICE PAPERS (Custom teacher-built papers)
-- =============================================
CREATE TABLE IF NOT EXISTS practice_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  time_limit_minutes INT DEFAULT 30,
  question_count INT DEFAULT 20,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed')) DEFAULT 'mixed',
  is_exam_simulation BOOLEAN DEFAULT FALSE,
  status TEXT CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PRACTICE PAPER QUESTIONS (Links questions to practice papers)
-- =============================================
CREATE TABLE IF NOT EXISTS practice_paper_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_paper_id UUID REFERENCES practice_papers(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  source_paper_id UUID REFERENCES papers(id) ON DELETE SET NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RLS POLICIES for practice_papers
-- =============================================
ALTER TABLE practice_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_paper_questions ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own practice papers
CREATE POLICY "Teachers manage practice papers" ON practice_papers FOR ALL TO anon USING (
  (teacher_id = auth.uid())
);

-- Teachers can manage their own practice paper questions
CREATE POLICY "Teachers manage practice paper questions" ON practice_paper_questions FOR ALL TO anon USING (
  EXISTS (
    SELECT 1 FROM practice_papers
    WHERE practice_papers.id = practice_paper_questions.practice_paper_id
    AND practice_papers.teacher_id = auth.uid()
  )
);

-- Published practice papers are readable by students
CREATE POLICY "Students read published practice papers" ON practice_papers FOR SELECT TO anon USING (
  status = 'published'
);

-- Published practice paper questions are readable
CREATE POLICY "Students read practice paper questions" ON practice_paper_questions FOR SELECT TO anon USING (
  EXISTS (
    SELECT 1 FROM practice_papers
    WHERE practice_papers.id = practice_paper_questions.practice_paper_id
    AND practice_papers.status = 'published'
  )
);
