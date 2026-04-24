-- Topic Performance Tracking for Weakness Analysis

CREATE TABLE IF NOT EXISTS topic_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id),
  subject_id UUID REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),

  -- Performance metrics
  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  total_marks INTEGER DEFAULT 0,
  marks_obtained INTEGER DEFAULT 0,

  -- Timestamps
  last_attempted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(user_id, topic_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_topic_perf_user ON topic_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_perf_topic ON topic_performance(topic_id);

-- Subject performance (rollup from topic)
CREATE TABLE IF NOT EXISTS subject_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),

  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  correct_questions INTEGER DEFAULT 0,

  last_attempted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, subject_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subj_perf_user ON subject_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_subj_perf_subject ON subject_performance(subject_id);

-- RLS
ALTER TABLE topic_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_performance ENABLE ROW LEVEL SECURITY;

-- Allow students to read their own performance
CREATE POLICY "Students can view own topic performance" ON topic_performance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can view own subject performance" ON subject_performance
  FOR SELECT USING (auth.uid() = user_id);

-- Allow authenticated users to update (via API)
CREATE POLICY "Auth users can update topic performance" ON topic_performance
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Auth users can update subject performance" ON subject_performance
  FOR INSERT WITH CHECK (auth.uid() = user_id);
