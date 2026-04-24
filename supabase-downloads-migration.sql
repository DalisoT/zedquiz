-- Downloads table for ECZ Past Papers PDF downloads

CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT,
  class_id UUID REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),
  exam_year INTEGER,
  paper_number INTEGER,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_downloads_class ON downloads(class_id);
CREATE INDEX IF NOT EXISTS idx_downloads_subject ON downloads(subject_id);
CREATE INDEX IF NOT EXISTS idx_downloads_year ON downloads(exam_year);

-- RLS
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read downloads
CREATE POLICY "Anyone can view downloads" ON downloads
  FOR SELECT USING (true);

-- Only teachers/admins can insert
CREATE POLICY "Teachers and admins can upload downloads" ON downloads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'teacher')
    )
  );

-- Only uploader or admin can delete
CREATE POLICY "Uploader or admin can delete downloads" ON downloads
  FOR DELETE USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
