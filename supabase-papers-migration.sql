-- Papers (ECZ past papers metadata)
CREATE TABLE IF NOT EXISTS papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),
  title TEXT NOT NULL,
  exam_year INT,
  paper_number INT,
  total_questions INT DEFAULT 0,
  status TEXT CHECK (status IN ('uploaded', 'processing', 'processed', 'imported')) DEFAULT 'uploaded',
  file_url TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paper questions (AI-parsed, pre-approval)
CREATE TABLE IF NOT EXISTS paper_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES papers(id) ON DELETE CASCADE,
  question_number INT,
  question_text TEXT NOT NULL,
  image_url TEXT,
  options JSONB NOT NULL DEFAULT '{"A":"","B":"","C":"","D":""}',
  correct_answer TEXT,
  topic_name TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  needs_image BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  is_rejected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_questions ENABLE ROW LEVEL SECURITY;

-- Admins can manage papers and paper_questions
CREATE POLICY "Admins manage papers" ON papers FOR ALL TO anon USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins manage paper questions" ON paper_questions FOR ALL TO anon USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Teachers can upload and manage papers/paper_questions (no RLS auth for bulk import)
CREATE POLICY "Teachers insert papers" ON papers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Teachers manage papers" ON papers FOR UPDATE TO anon USING (true);
CREATE POLICY "Teachers select own papers" ON papers FOR SELECT TO anon USING (
  uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Teachers insert paper questions" ON paper_questions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Teachers update paper questions" ON paper_questions FOR UPDATE TO anon USING (true);

-- Public can read imported papers and their questions
CREATE POLICY "Public read papers" ON papers FOR SELECT TO anon USING (status = 'imported');
CREATE POLICY "Public read paper questions" ON paper_questions FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM papers WHERE papers.id = paper_questions.paper_id AND papers.status = 'imported')
);