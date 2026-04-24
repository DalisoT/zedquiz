// =============================================
// DATABASE TYPES
// =============================================

export interface Level {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
}

export interface ClassInfo {
  id: string;
  level_id: string;
  name: string;
  slug: string;
  order_index: number;
  is_final_year: boolean;
  created_at: string;
}

export interface Subject {
  id: string;
  level_id: string;
  name: string;
  slug: string;
  icon?: string;
  created_at: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  description?: string;
  order_index: number;
  created_at: string;
}

export interface QuestionSource {
  id: string;
  name: string;
  source_type: 'ecz_past_paper' | 'textbook' | 'teacher_created' | 'ai_generated';
  exam_year?: number;
  paper_variant?: string;
  created_by?: string;
  created_at: string;
}

export interface Question {
  id: string;
  class_id: string;
  subject_id: string;
  topic_id: string | null;
  source_id?: string;
  question_text: string;
  image_url?: string | null;
  answer_type: 'objective' | 'structured' | 'essay';
  marks: number;
  marking_scheme: { point: string; marks: number }[] | null;
  model_answer?: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  is_approved: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type Role = 'student' | 'teacher' | 'admin' | 'super_admin';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  avatar_url?: string;
  school_name?: string;
  district?: string;
  grade_level?: string;
  streak_days: number;
  total_points: number;
  created_at: string;
  updated_at: string;
}

export interface StudentProgress {
  id: string;
  user_id: string;
  question_id: string;
  class_id: string;
  subject_id: string;
  topic_id?: string;
  correct?: boolean;
  attempts: number;
  last_attempted: string;
}

export interface Badge {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  criteria: string;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  title?: string;
  class_id?: string;
  subject_id?: string;
  score: number;
  total_questions: number;
  time_spent_seconds: number;
  answers: Record<string, unknown>;
  completed_at: string;
}

export interface ExamAttempt {
  id: string;
  user_id: string;
  title?: string;
  class_id?: string;
  subject_id?: string;
  score: number;
  total_questions: number;
  time_spent_seconds: number;
  answers: Record<string, unknown>;
  completed_at: string;
}

export interface Quiz {
  id: string;
  teacher_id: string;
  title: string;
  description?: string;
  class_id: string;
  subject_id: string;
  time_limit_seconds: number;
  question_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  teacher_id: string;
  title: string;
  description?: string;
  class_id: string;
  subject_id: string;
  time_limit_seconds: number;
  question_count: number;
  passing_score: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Paper {
  id: string;
  subject_id: string;
  class_id: string;
  title: string;
  exam_year: number;
  paper_number: number;
  total_questions: number;
  status: 'uploaded' | 'processing' | 'processed' | 'imported';
  file_url?: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface PaperQuestion {
  id: string;
  paper_id: string;
  question_number?: number;
  question_text: string;
  image_url?: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer?: string;
  topic_name?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  needs_image: boolean;
  is_approved: boolean;
  is_rejected: boolean;
  created_at: string;
}

export interface PracticePaper {
  id: string;
  teacher_id: string;
  title: string;
  description?: string;
  class_id: string;
  subject_id: string;
  time_limit_minutes: number;
  question_count: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  is_exam_simulation: boolean;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export interface MarkingKey {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  exam_year?: number;
  paper_variant?: string;
  marking_scheme: unknown;
  notes?: string;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface TopicPerformance {
  id: string;
  user_id: string;
  topic_id: string;
  subject_id: string;
  class_id: string;
  total_attempts: number;
  correct_attempts: number;
  total_marks: number;
  marks_obtained: number;
  last_attempted_at: string;
  created_at: string;
  updated_at: string;
}

export interface SubjectPerformance {
  id: string;
  user_id: string;
  subject_id: string;
  class_id: string;
  total_attempts: number;
  correct_attempts: number;
  total_questions: number;
  correct_questions: number;
  last_attempted_at: string;
  created_at: string;
  updated_at: string;
}

export interface PointsHistory {
  id: string;
  user_id: string;
  points: number;
  source: 'quiz' | 'exam' | 'practice' | 'daily_streak' | 'badge';
  reference_id?: string;
  earned_at: string;
  created_at: string;
}

export interface Download {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_name?: string;
  class_id: string;
  subject_id: string;
  exam_year?: number;
  paper_number?: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

// =============================================
// API RESPONSE TYPES
// =============================================

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}
