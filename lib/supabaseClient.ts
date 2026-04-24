import { createClient } from '@supabase/supabase-js';

let supabase: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (supabase) return supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  supabase = createClient(url, key);
  return supabase;
}

export interface Level { id: string; name: string; created_at: string; }
export interface Class { id: string; level_id: string; name: string; order_index: number; is_final_year: boolean; created_at: string; }
export interface Subject { id: string; name: string; level_id: string; created_at: string; }
export interface Question {
  id: string; class_id: string; subject_id: string; topic_id: string | null;
  question_text: string; image_url: string | null;
  answer_type: 'objective' | 'structured' | 'essay'; marks: number;
  marking_scheme: { point: string; marks: number }[] | null;
  model_answer: string | null; difficulty_level: 'easy' | 'medium' | 'hard'; created_at: string;
}

export async function getLevels(): Promise<Level[]> {
  const client = getClient();
  if (!client) return [
    { id: "1", name: "Primary", created_at: "" },
    { id: "2", name: "O-Level", created_at: "" },
    { id: "3", name: "A-Level", created_at: "" },
  ];
  const { data } = await client.from('levels').select('*').order('name');
  return data || [];
}

export async function getClassesByLevel(levelId: string): Promise<Class[]> {
  const client = getClient();
  if (!client) return [];
  const { data } = await client.from('classes').select('*').eq('level_id', levelId).order('order_index');
  return data || [];
}

export async function getSubjectsByLevel(levelId: string): Promise<Subject[]> {
  const client = getClient();
  if (!client) return [];
  const { data } = await client.from('subjects').select('*').eq('level_id', levelId).order('name');
  return data || [];
}

export async function getRandomQuestion(classId: string, subjectId: string): Promise<Question | null> {
  const client = getClient();
  if (!client) return null;
  const { data } = await client.from('questions').select('*').eq('class_id', classId).eq('subject_id', subjectId).order('random').limit(1);
  return data?.[0] || null;
}

export async function createAttempt(questionId: string, answer: string, userId: string) {
  const client = getClient();
  if (!client) return;
  await client.from('attempts').insert({ question_id: questionId, answer, user_id: userId } as any);
}