import { z } from 'zod';

export const createQuizSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(1000).optional(),
  class_id: z.string().uuid('Invalid class ID'),
  subject_id: z.string().uuid('Invalid subject ID'),
  time_limit_seconds: z.number().int().min(60).max(7200).default(300),
  question_count: z.number().int().min(1).max(100).default(5),
});

export const createExamSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(1000).optional(),
  class_id: z.string().uuid('Invalid class ID'),
  subject_id: z.string().uuid('Invalid subject ID'),
  time_limit_seconds: z.number().int().min(60).max(14400).default(3600),
  question_count: z.number().int().min(1).max(200).default(10),
  passing_score: z.number().int().min(0).max(100).default(60),
});

export const submitQuizAnswersSchema = z.object({
  answers: z.array(z.object({
    question_id: z.string().uuid(),
    answer_text: z.string(),
  })).min(1, 'At least one answer required'),
});

export const submitExamAnswersSchema = z.object({
  answers: z.array(z.object({
    question_id: z.string().uuid(),
    answer_text: z.string(),
  })).min(1, 'At least one answer required'),
});

export const practiceMarkSchema = z.object({
  question_id: z.string().uuid(),
  user_answer: z.string().min(1, 'Answer is required'),
});

export const pointsHistorySchema = z.object({
  points: z.number().int().min(1, 'Points must be positive'),
  source: z.enum(['quiz', 'exam', 'practice', 'daily_streak', 'badge']),
  reference_id: z.string().uuid().optional(),
});

export const uploadPaperSchema = z.object({
  subjectId: z.string().uuid(),
  classId: z.string().uuid(),
  title: z.string().min(1).max(255),
  examYear: z.number().int().min(2000).max(2030),
  paperNumber: z.number().int().min(1).max(10),
});

export const markingKeySchema = z.object({
  subject_id: z.string().uuid(),
  class_id: z.string().uuid(),
  exam_year: z.number().int().min(2000).max(2030).optional(),
  paper_variant: z.string().max(50).optional(),
  marking_scheme: z.record(z.string(), z.unknown()),
  notes: z.string().max(500).optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(['student', 'teacher', 'admin', 'super_admin']),
});

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
    };
  }
  return { valid: true, data: result.data };
}
