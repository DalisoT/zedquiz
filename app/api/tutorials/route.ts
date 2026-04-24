import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const createTutorialSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  tutorial_type: z.enum(['video', 'audio', 'youtube']),
  youtube_url: z.string().url().optional(),
  storage_url: z.string().url().optional(),
  file_name: z.string().optional(),
  file_size_bytes: z.number().optional(),
  duration_seconds: z.number().optional(),
  subject_id: z.string().uuid().optional(),
  grade_level: z.string().uuid().optional(),
  topic: z.string().optional(),
  is_published: z.boolean().optional(),
});

function getAuthClient(request: NextRequest) {
  const accessToken = request.cookies.get('sb-access-token')?.value;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false }
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get('subject_id');
  const gradeLevel = searchParams.get('grade_level');
  const type = searchParams.get('type');
  const teacherId = searchParams.get('teacher_id');
  const myTutorials = searchParams.get('my_tutorials') === 'true';

  const authClient = getAuthClient(request);
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let query = authClient
    .from('tutorials')
    .select('*, teacher:profiles(full_name), subject:subjects(name), grade:class(name)')
    .order('created_at', { ascending: false });

  // Filter by published/approved for non-teachers
  const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
  const isTeacher = profile?.role === 'teacher';
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  if (!isTeacher && !isAdmin) {
    query = query.eq('is_published', true).eq('is_approved', true);
  }

  if (myTutorials && isTeacher) {
    query = query.eq('teacher_id', user.id);
  }
  if (subjectId) query = query.eq('subject_id', subjectId);
  if (gradeLevel) query = query.eq('grade_level', gradeLevel);
  if (type) query = query.eq('tutorial_type', type);
  if (teacherId) query = query.eq('teacher_id', teacherId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({ tutorials: data });
}

export async function POST(request: NextRequest) {
  const authClient = getAuthClient(request);
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'teacher' && profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validated = createTutorialSchema.parse(body);

    // Extract youtube video ID
    let youtube_video_id = null;
    if (validated.youtube_url) {
      const match = validated.youtube_url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
      youtube_video_id = match ? match[1] : null;
    }

    // Calculate points based on type
    const pointsReward = validated.tutorial_type === 'video' ? 75 : validated.tutorial_type === 'youtube' ? 50 : 40;

    const { data, error } = await authClient
      .from('tutorials')
      .insert({
        teacher_id: user.id,
        title: validated.title,
        description: validated.description,
        tutorial_type: validated.tutorial_type,
        youtube_url: validated.youtube_url,
        youtube_video_id,
        storage_url: validated.storage_url,
        file_name: validated.file_name,
        file_size_bytes: validated.file_size_bytes,
        duration_seconds: validated.duration_seconds,
        subject_id: validated.subject_id,
        grade_level: validated.grade_level,
        topic: validated.topic,
        is_published: validated.is_published || false,
        points_reward: pointsReward,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error }, { status: 500 });

    // Award points for creating tutorial
    if (data.is_published) {
      await authClient.from('points_history').insert({
        user_id: user.id,
        points: pointsReward,
        reason: `Created ${validated.tutorial_type} tutorial: ${validated.title}`,
      });

      await authClient.rpc('increment_points', {
        user_id_input: user.id,
        points_input: pointsReward
      });
    }

    return NextResponse.json({ tutorial: data });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
