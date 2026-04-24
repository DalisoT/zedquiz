-- Points History Table for tracking points earned over time
-- This enables weekly/monthly leaderboards

CREATE TABLE IF NOT EXISTS points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('quiz', 'exam', 'practice', 'daily_streak', 'badge')),
  reference_id UUID, -- quiz_id, exam_id, etc.
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON points_history(user_id);
CREATE INDEX IF NOT EXISTS idx_points_history_earned_at ON points_history(earned_at);
CREATE INDEX IF NOT EXISTS idx_points_history_source ON points_history(source);

-- Add exam_id to exam_attempts if it doesn't exist
-- This is needed to link exam attempts to specific exams
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES exams(id);

-- Add quiz_id to quiz_attempts if it doesn't exist
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS quiz_id UUID REFERENCES quizzes(id);

-- RLS policies for points_history
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own points history
CREATE POLICY "Users can view own points history" ON points_history
  FOR SELECT USING (auth.uid() = user_id);

-- Allow service role to insert points history
CREATE POLICY "Service role can insert points history" ON points_history
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to view leaderboard (all students)
CREATE POLICY "Anyone can view leaderboard" ON points_history
  FOR SELECT USING (true);
