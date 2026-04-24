-- =============================================
-- TUTORIALS, VIDEOS & AUDIO LESSONS
-- =============================================

-- Tutorials table (video/audio lessons)
CREATE TABLE IF NOT EXISTS tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tutorial_type TEXT CHECK (tutorial_type IN ('video', 'audio', 'youtube')) NOT NULL,
  -- For youtube embeds
  youtube_url TEXT,
  youtube_video_id TEXT,
  -- For uploaded audio/video files
  storage_url TEXT,
  file_name TEXT,
  file_size_bytes BIGINT,
  duration_seconds INT,
  -- Content categorization
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  grade_level UUID REFERENCES classes(id) ON DELETE SET NULL,
  topic TEXT,
  -- Metrics
  view_count INT DEFAULT 0,
  completion_count INT DEFAULT 0,
  -- Points/money values
  points_reward INT DEFAULT 50,
  estimated_minutes INT DEFAULT 5,
  -- Status
  is_published BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tutorial views tracking
CREATE TABLE IF NOT EXISTS tutorial_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutorial_id UUID REFERENCES tutorials(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  watch_duration_seconds INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutorial_id, user_id)
);

-- Tutorial bookmarks (students save for later)
CREATE TABLE IF NOT EXISTS tutorial_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutorial_id UUID REFERENCES tutorials(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutorial_id, user_id)
);

-- Teacher earnings tracking
CREATE TABLE IF NOT EXISTS teacher_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tutorial_id UUID REFERENCES tutorials(id) ON DELETE SET NULL,
  -- Earnings breakdown
  base_amount DECIMAL(10,2) DEFAULT 0,
  bonus_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  -- What triggered this
  earning_type TEXT CHECK (earning_type IN (
    'tutorial_created', 'tutorial_published', 'tutorial_completed',
    'view_milestone', 'completion_milestone', 'quality_bonus'
  )) NOT NULL,
  description TEXT,
  -- Status
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Points history for tutorials
CREATE TABLE IF NOT EXISTS tutorial_points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tutorial_id UUID REFERENCES tutorials(id) ON DELETE CASCADE,
  points INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tutorial ratings (students rate lessons)
CREATE TABLE IF NOT EXISTS tutorial_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutorial_id UUID REFERENCES tutorials(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutorial_id, user_id)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_tutorials_teacher ON tutorials(teacher_id);
CREATE INDEX idx_tutorials_subject ON tutorials(subject_id);
CREATE INDEX idx_tutorials_grade ON tutorials(grade_level);
CREATE INDEX idx_tutorials_published ON tutorials(is_published, is_approved);
CREATE INDEX idx_tutorial_views_tutorial ON tutorial_views(tutorial_id);
CREATE INDEX idx_tutorial_views_user ON tutorial_views(user_id);
CREATE INDEX idx_teacher_earnings_teacher ON teacher_earnings(teacher_id);
CREATE INDEX idx_teacher_earnings_paid ON teacher_earnings(is_paid);

-- =============================================
-- TRIGGER FOR updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tutorials_updated_at ON tutorials;
CREATE TRIGGER update_tutorials_updated_at
  BEFORE UPDATE ON tutorials
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE tutorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_points_history ENABLE ROW LEVEL SECURITY;

-- Tutorials: Teachers manage own, students read published approved
CREATE POLICY "Teachers manage own tutorials" ON tutorials FOR ALL TO authenticated USING (
  teacher_id = auth.uid()
);
CREATE POLICY "Anyone read published tutorials" ON tutorials FOR SELECT TO anon USING (
  is_published = TRUE AND is_approved = TRUE
);
CREATE POLICY "Admins manage all tutorials" ON tutorials FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Tutorial views: Users manage own views
CREATE POLICY "Users manage own views" ON tutorial_views FOR ALL TO authenticated USING (
  user_id = auth.uid()
);
CREATE POLICY "Teachers view own tutorial analytics" ON tutorial_views FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tutorials WHERE tutorials.id = tutorial_views.tutorial_id AND tutorials.teacher_id = auth.uid())
);

-- Bookmarks: Users manage own
CREATE POLICY "Users manage own bookmarks" ON tutorial_bookmarks FOR ALL TO authenticated USING (
  user_id = auth.uid()
);

-- Teacher earnings: Teachers view own, admins view all
CREATE POLICY "Teachers view own earnings" ON teacher_earnings FOR SELECT TO authenticated USING (
  teacher_id = auth.uid()
);
CREATE POLICY "Admins manage earnings" ON teacher_earnings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Points history: Users view own, admins view all
CREATE POLICY "Users view own points" ON tutorial_points_history FOR SELECT TO authenticated USING (
  user_id = auth.uid()
);
CREATE POLICY "Admins view all points" ON tutorial_points_history FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Tutorial ratings: Students rate, teachers see their tutorial ratings
CREATE POLICY "Students rate tutorials" ON tutorial_ratings FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "Users update own rating" ON tutorial_ratings FOR UPDATE TO authenticated USING (
  user_id = auth.uid()
);
CREATE POLICY "Anyone read tutorial ratings" ON tutorial_ratings FOR SELECT TO anon USING (TRUE);
CREATE POLICY "Teachers see own tutorial ratings" ON tutorial_ratings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM tutorials WHERE tutorials.id = tutorial_ratings.tutorial_id AND tutorials.teacher_id = auth.uid())
);
CREATE POLICY "Admins manage ratings" ON tutorial_ratings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- =============================================
-- INSERT DEFAULT TUTORIAL TYPES REFERENCE DATA
-- =============================================
-- (Reference only - tutorial types are enum in code)
