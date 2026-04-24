import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface PaperQuestion {
  id?: string;
  paper_id?: string;
  question_number: number;
  question_text: string;
  image_url?: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: string;
  topic_name?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  needs_image: boolean;
  is_approved?: boolean;
  is_rejected?: boolean;
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function parseQuestionsWithAI(
  ocrText: string,
  paperYear: number,
  paperNumber: number
): Promise<PaperQuestion[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const system = `You are an expert Zambian ECZ exam paper parser.
Given the raw OCR text of a Grade 6 Social Studies ECZ past paper, extract all multiple-choice questions.
For each question output ONLY valid JSON array. No markdown, no explanation.
Each question object must have:
- question_number: integer (1, 2, 3...)
- question_text: string (the question as-is, preserve original wording)
- options: {"A": "...", "B": "...", "C": "...", "D": "..."} (the option texts exactly as in the paper)
- correct_answer: "A" or "B" or "C" or "D"
- topic_name: string (infer the Social Studies topic from content, e.g. "History and Government", "Geography", "Citizenship", or null)
- difficulty: "easy" or "medium" or "hard" (estimate based on complexity)
- needs_image: boolean (true if the question references a map, diagram, image, or photograph that would need a separate image upload)

Respond ONLY with: [{"question_number":1,"question_text":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correct_answer":"A","topic_name":"History and Government","difficulty":"medium","needs_image":false},...]`;

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `OCR Text:\n${ocrText}\n\nYear: ${paperYear}, Paper: ${paperNumber}` }
      ],
      temperature: 0.1,
    }),
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Extract JSON array from response
  const match = content.match(/\[[\s\S]*?\]/);
  if (!match) throw new Error('Failed to parse questions from AI response');

  const questions = JSON.parse(match[0]);
  return questions.map((q: any) => ({
    ...q,
    question_number: parseInt(q.question_number),
    needs_image: Boolean(q.needs_image),
    difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
  }));
}

export async function uploadPaperFile(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `papers/${userId}/${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from('papers')
    .upload(path, file, { contentType: 'application/pdf' });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from('papers').getPublicUrl(data.path);
  return urlData.publicUrl;
}

export async function createPaper(
  subjectId: string,
  classId: string,
  title: string,
  examYear: number,
  paperNumber: number,
  fileUrl: string,
  userId: string
) {
  const { data, error } = await supabase.from('papers').insert({
    subject_id: subjectId,
    class_id: classId,
    title,
    exam_year: examYear,
    paper_number: paperNumber,
    file_url: fileUrl,
    status: 'uploaded',
    uploaded_by: userId,
  }).select().single();

  if (error) throw error;
  return data;
}

export async function updatePaperStatus(paperId: string, status: string) {
  const { error } = await supabase.from('papers').update({ status }).eq('id', paperId);
  if (error) console.error('updatePaperStatus error:', error);
  return !error;
}

export async function insertPaperQuestions(paperId: string, questions: PaperQuestion[]) {
  console.log('[insertPaperQuestions] Inserting', questions.length, 'questions for paper', paperId);

  // First delete any existing questions for this paper to avoid duplicates
  await supabase.from('paper_questions').delete().eq('paper_id', paperId);

  const { error } = await supabase.from('paper_questions').insert(
    questions.map(q => ({
      paper_id: paperId,
      question_number: q.question_number,
      question_text: q.question_text,
      image_url: q.image_url || null,
      options: q.options,
      correct_answer: q.correct_answer,
      topic_name: q.topic_name || null,
      difficulty: q.difficulty,
      needs_image: q.needs_image,
    }))
  );
  if (error) {
    console.error('[insertPaperQuestions] Error:', error);
    throw error;
  }
  console.log('[insertPaperQuestions] Success');
}

export async function deleteFileFromStorage(fileUrl: string) {
  try {
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.indexOf('papers');
    if (bucketIndex === -1) return;
    const path = pathParts.slice(bucketIndex + 1).join('/');
    const { error } = await supabase.storage.from('papers').remove([path]);
    if (error) console.error('[deleteFileFromStorage] error:', error);
  } catch (e) {
    console.error('[deleteFileFromStorage] failed:', e);
  }
}

export async function getPaperQuestions(paperId: string) {
  // Create a fresh supabase client to avoid module-level issues
  const freshSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await freshSupabase
    .from('paper_questions')
    .select('*')
    .eq('paper_id', paperId)
    .order('question_number');
  console.log('[getPaperQuestions] result:', { count: data?.length, error: error?.message, paperId });
  return data || [];
}

export async function updatePaperQuestion(questionId: string, updates: Partial<PaperQuestion>) {
  const { error } = await supabase.from('paper_questions').update(updates).eq('id', questionId);
  if (error) throw error;
}

export async function getPaper(paperId: string) {
  const { data } = await supabase.from('papers').select('*, subjects(name), classes(name)').eq('id', paperId).single();
  return data;
}

export async function getPapers(userId?: string) {
  let query = supabase
    .from('papers')
    .select('*, subjects(name), classes(name)')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('uploaded_by', userId);
  }

  const { data, error } = await query;
  return data || [];
}

export async function approveQuestions(paperId: string, questionIds: string[]) {
  // First insert approved questions into main questions table
  const { data: questions } = await supabase
    .from('paper_questions')
    .select('*, papers(subject_id, class_id)')
    .in('id', questionIds)
    .eq('paper_id', paperId);

  if (!questions?.length) return;

  // Find or create topic
  for (const q of questions) {
    let topicId: string | null = null;
    if (q.topic_name) {
      const subjectId = (q.papers as any)?.subject_id;
      if (subjectId) {
        // Check if topic exists
        const { data: existing } = await supabase
          .from('topics')
          .select('id')
          .eq('subject_id', subjectId)
          .ilike('name', q.topic_name)
          .single();

        if (existing) {
          topicId = existing.id;
        } else {
          // Create topic
          const { data: newTopic } = await supabase
            .from('topics')
            .insert({ subject_id: subjectId, name: q.topic_name })
            .select('id').single();
          topicId = newTopic?.id || null;
        }
      }
    }

    // Build marking_scheme from correct answer
    const correctAnswer = q.correct_answer;
    const markingScheme = [
      { point: correctAnswer, marks: 1 }
    ];

    await supabase.from('questions').insert({
      class_id: (q.papers as any)?.class_id,
      subject_id: (q.papers as any)?.subject_id,
      topic_id: topicId,
      question_text: q.question_text,
      image_url: q.image_url || null,
      answer_type: 'objective',
      marks: 1,
      marking_scheme: markingScheme,
      difficulty: q.difficulty,
      is_approved: true,
    });
  }

  // Mark paper_questions as approved
  await supabase.from('paper_questions')
    .update({ is_approved: true })
    .in('id', questionIds);

  // Update paper status
  await supabase.from('papers').update({ status: 'imported' }).eq('id', paperId);
}

export async function getSubjectsByLevel(levelSlug: string) {
  const { data: level } = await supabase.from('levels').select('id').eq('slug', levelSlug).single();
  if (!level) return [];
  const { data } = await supabase.from('subjects').select('*').eq('level_id', level.id).order('name');
  return data || [];
}

export async function getClassesByLevel(levelSlug: string) {
  const { data: level } = await supabase.from('levels').select('id').eq('slug', levelSlug).single();
  if (!level) return [];
  const { data } = await supabase.from('classes').select('*').eq('level_id', level.id).order('order_index');
  return data || [];
}
