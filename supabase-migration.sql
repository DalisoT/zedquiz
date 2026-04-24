-- =============================================
-- ZEDQUIZ NATIONAL PLATFORM - COMPLETE SCHEMA
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard
-- =============================================

-- =============================================
-- LEVELS (Primary, O-Level, A-Level)
-- =============================================
CREATE TABLE IF NOT EXISTS levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CLASSES (Grade 1-7, Form 1-5, Form 6-7)
-- =============================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID REFERENCES levels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  order_index INT DEFAULT 0,
  is_final_year BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUBJECTS
-- =============================================
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID REFERENCES levels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TOPICS (Chapters within subjects)
-- =============================================
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- QUESTION SOURCES
-- =============================================
CREATE TABLE IF NOT EXISTS question_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('ecz_past_paper', 'textbook', 'teacher_created', 'ai_generated')),
  exam_year INT,
  paper_variant TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- QUESTIONS (Core question bank)
-- =============================================
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  source_id UUID REFERENCES question_sources(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  image_url TEXT,
  answer_type TEXT CHECK (answer_type IN ('objective', 'structured', 'essay')) DEFAULT 'objective',
  marks INT DEFAULT 1,
  marking_scheme JSONB NOT NULL DEFAULT '[]',
  model_answer TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  is_approved BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PROFILES (extends auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('student', 'teacher', 'admin', 'super_admin')) DEFAULT 'student',
  avatar_url TEXT,
  school_name TEXT,
  district TEXT,
  grade_level UUID REFERENCES classes(id) ON DELETE SET NULL,
  streak_days INT DEFAULT 0,
  total_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STUDENT PROGRESS
-- =============================================
CREATE TABLE IF NOT EXISTS student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  correct BOOLEAN,
  attempts INT DEFAULT 1,
  last_attempted TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BADGES
-- =============================================
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  criteria TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER BADGES
-- =============================================
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- =============================================
-- QUIZ ATTEMPTS
-- =============================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  score FLOAT,
  total_questions INT,
  time_taken_seconds INT,
  answers JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- EXAM ATTEMPTS
-- =============================================
CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  score FLOAT,
  total_questions INT,
  time_taken_seconds INT,
  answers JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- QUESTION PACKS (for offline)
-- =============================================
CREATE TABLE IF NOT EXISTS question_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  question_count INT DEFAULT 0,
  size_bytes INT DEFAULT 0,
  version INT DEFAULT 1,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_packs ENABLE ROW LEVEL SECURITY;

-- Public read policies (for students)
CREATE POLICY "Public read levels" ON levels FOR SELECT TO anon USING (true);
CREATE POLICY "Public read classes" ON classes FOR SELECT TO anon USING (true);
CREATE POLICY "Public read subjects" ON subjects FOR SELECT TO anon USING (true);
CREATE POLICY "Public read topics" ON topics FOR SELECT TO anon USING (true);
CREATE POLICY "Public read questions" ON questions FOR SELECT TO anon USING (is_approved = true);
CREATE POLICY "Public read question_packs" ON question_packs FOR SELECT TO anon USING (is_published = true);
CREATE POLICY "Public read badges" ON badges FOR SELECT TO anon USING (true);

-- Profiles policies
CREATE POLICY "Users read own profile" ON profiles FOR SELECT TO anon USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE TO anon USING (auth.uid() = id);

-- Progress policies
CREATE POLICY "Users manage own progress" ON student_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users read own badges" ON user_badges FOR SELECT TO anon USING (auth.uid() = user_id);
CREATE POLICY "Users read own attempts" ON quiz_attempts FOR SELECT TO anon USING (auth.uid() = user_id);
CREATE POLICY "Users read own exam attempts" ON exam_attempts FOR SELECT TO anon USING (auth.uid() = user_id);

-- Admin policies (full access)
CREATE POLICY "Admins manage all" ON questions FOR ALL TO anon USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins manage sources" ON question_sources FOR ALL TO anon USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins manage profiles" ON profiles FOR ALL TO anon USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins view all progress" ON student_progress FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins manage attempts" ON quiz_attempts FOR ALL TO anon USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins manage exam attempts" ON exam_attempts FOR ALL TO anon USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins manage packs" ON question_packs FOR ALL TO anon USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Teacher policies
CREATE POLICY "Teachers create questions" ON questions FOR INSERT TO anon WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'super_admin'))
);
CREATE POLICY "Teachers create sources" ON question_sources FOR INSERT TO anon WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'super_admin'))
);

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'student'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================
-- INSERT DEFAULT DATA
-- =============================================

-- Insert levels
INSERT INTO levels (name, slug, description) VALUES
  ('Primary', 'primary', 'Grades 1-7'),
  ('O-Level', 'o-level', 'Forms 1-5'),
  ('A-Level', 'a-level', 'Forms 6-7')
ON CONFLICT (slug) DO NOTHING;

-- Insert Primary classes
WITH lvl AS (SELECT id FROM levels WHERE slug = 'primary')
INSERT INTO classes (level_id, name, slug, order_index)
SELECT lvl.id, 'Grade ' || i, 'primary-grade-' || i, i
FROM lvl, generate_series(1, 7) AS i
ON CONFLICT (slug) DO NOTHING;

-- Insert O-Level classes
WITH lvl AS (SELECT id FROM levels WHERE slug = 'o-level')
INSERT INTO classes (level_id, name, slug, order_index, is_final_year)
SELECT lvl.id, 'Form ' || i, 'o-level-form-' || i, i, (i = 5)
FROM lvl, generate_series(1, 5) AS i
ON CONFLICT (slug) DO NOTHING;

-- Insert A-Level classes
WITH lvl AS (SELECT id FROM levels WHERE slug = 'a-level')
INSERT INTO classes (level_id, name, slug, order_index, is_final_year)
SELECT lvl.id, 'Form ' || i, 'a-level-form-' || i, i, (i = 7)
FROM lvl, generate_series(6, 7) AS i
ON CONFLICT (slug) DO NOTHING;

-- Insert subjects for Primary
WITH lvl AS (SELECT id FROM levels WHERE slug = 'primary')
INSERT INTO subjects (level_id, name, slug, icon)
SELECT lvl.id, v.name, v.slug, v.icon
FROM (
  VALUES
    ('Mathematics', 'primary-mathematics', '1234'),
    ('English', 'primary-english', 'ABC'),
    ('Science', 'primary-science', 'science'),
    ('Social Studies', 'primary-social-studies', 'globe'),
    ('Creative Arts', 'primary-creative-arts', 'art'),
    ('Religious Education', 'primary-religious-ed', 'book')
) AS v(name, slug, icon)
CROSS JOIN lvl
ON CONFLICT (slug) DO NOTHING;

-- Insert subjects for O-Level
WITH lvl AS (SELECT id FROM levels WHERE slug = 'o-level')
INSERT INTO subjects (level_id, name, slug, icon)
SELECT lvl.id, v.name, v.slug, v.icon
FROM (
  VALUES
    ('Mathematics', 'o-level-mathematics', '1234'),
    ('English', 'o-level-english', 'ABC'),
    ('Biology', 'o-level-biology', 'leaf'),
    ('Chemistry', 'o-level-chemistry', 'flask'),
    ('Physics', 'o-level-physics', 'bolt'),
    ('Geography', 'o-level-geography', 'globe'),
    ('History', 'o-level-history', 'book'),
    ('Civic Education', 'o-level-civic', 'landmark'),
    ('Commerce', 'o-level-commerce', 'briefcase'),
    ('Accounts', 'o-level-accounts', 'calculator')
) AS v(name, slug, icon)
CROSS JOIN lvl
ON CONFLICT (slug) DO NOTHING;

-- Insert subjects for A-Level
WITH lvl AS (SELECT id FROM levels WHERE slug = 'a-level')
INSERT INTO subjects (level_id, name, slug, icon)
SELECT lvl.id, v.name, v.slug, v.icon
FROM (
  VALUES
    ('Mathematics', 'a-level-mathematics', '1234'),
    ('Physics', 'a-level-physics', 'bolt'),
    ('Chemistry', 'a-level-chemistry', 'flask'),
    ('Biology', 'a-level-biology', 'leaf'),
    ('Geography', 'a-level-geography', 'globe'),
    ('History', 'a-level-history', 'book'),
    ('English', 'a-level-english', 'ABC'),
    ('Economics', 'a-level-economics', 'chart')
) AS v(name, slug, icon)
CROSS JOIN lvl
ON CONFLICT (slug) DO NOTHING;

-- Insert default badges
INSERT INTO badges (name, description, icon, criteria) VALUES
  ('First Steps', 'Complete your first quiz', 'trophy', 'first_quiz'),
  ('Perfect Score', 'Get 100% on any quiz', 'star', 'perfect_score'),
  ('Week Warrior', 'Maintain a 7-day streak', 'fire', 'streak_7'),
  ('Month Master', 'Maintain a 30-day streak', 'crown', 'streak_30'),
  ('Question Master', 'Answer 100 questions', 'book', 'questions_100'),
  ('Quiz Champion', 'Complete 50 quizzes', 'medal', 'quizzes_50'),
  ('Helpful Teacher', 'Submit 10 questions', 'star', 'questions_contributed'),
  ('Early Bird', 'Login before 7am', 'sun', 'early_bird')
ON CONFLICT DO NOTHING;

-- =============================================
-- UPDATE EXISTING ADMIN USER
-- =============================================
-- Update your admin user (replace with your actual user ID)
UPDATE profiles SET role = 'super_admin', full_name = 'Admin User' WHERE id = '85bee6dc-d3cc-4f76-8e36-d556a44b6ad2';

-- =============================================
-- DONE
-- =============================================
SELECT 'Schema migration complete!' AS status;
