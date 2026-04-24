import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getAuthClient(request: NextRequest) {
  const accessToken = request.cookies.get('sb-access-token')?.value;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false }
  });
}

export async function GET(request: NextRequest) {
  const authClient = getAuthClient(request);
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 });
  }

  // Get user counts
  const { count: totalUsers } = await authClient.from('profiles').select('*', { count: 'exact', head: true });
  const { count: totalStudents } = await authClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
  const { count: totalTeachers } = await authClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher');
  const { count: totalAdmins } = await authClient.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['admin', 'super_admin']);

  // Get tutorials stats
  const { count: totalTutorials } = await authClient.from('tutorials').select('*', { count: 'exact', head: true });
  const { data: tutorials } = await authClient.from('tutorials').select('view_count, completion_count');
  const totalViews = tutorials?.reduce((sum, t) => sum + (t.view_count || 0), 0) || 0;
  const totalCompletions = tutorials?.reduce((sum, t) => sum + (t.completion_count || 0), 0) || 0;

  // New users this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { count: newUsersThisMonth } = await authClient.from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString());

  // Top teachers by earnings
  const { data: teacherEarnings } = await authClient
    .from('teacher_earnings')
    .select('teacher_id, total_amount')
    .eq('is_paid', false);

  const teacherEarningsMap: Record<string, number> = {};
  teacherEarnings?.forEach(e => {
    teacherEarningsMap[e.teacher_id] = (teacherEarningsMap[e.teacher_id] || 0) + Number(e.total_amount);
  });

  const { data: teachers } = await authClient
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'teacher');

  const teacherTutorialsMap: Record<string, { count: number; views: number }> = {};
  tutorials?.forEach(t => {
    // We don't have teacher_id in tutorials query above, need to fetch
  });

  // Get teacher stats
  const { data: teacherTutorials } = await authClient
    .from('tutorials')
    .select('teacher_id, view_count, completion_count');

  const teacherStatsMap: Record<string, { count: number; views: number; completions: number }> = {};
  teacherTutorials?.forEach(t => {
    if (!teacherStatsMap[t.teacher_id]) {
      teacherStatsMap[t.teacher_id] = { count: 0, views: 0, completions: 0 };
    }
    teacherStatsMap[t.teacher_id].count++;
    teacherStatsMap[t.teacher_id].views += t.view_count || 0;
    teacherStatsMap[t.teacher_id].completions += t.completion_count || 0;
  });

  const { data: ratings } = await authClient.from('tutorial_ratings').select('tutorial_id, rating, tutorials(teacher_id)');

  const teacherRatingsMap: Record<string, { total: number; count: number }> = {};
  ratings?.forEach(r => {
    if (r.tutorials?.teacher_id) {
      if (!teacherRatingsMap[r.tutorials.teacher_id]) {
        teacherRatingsMap[r.tutorials.teacher_id] = { total: 0, count: 0 };
      }
      teacherRatingsMap[r.tutorials.teacher_id].total += r.rating;
      teacherRatingsMap[r.tutorials.teacher_id].count++;
    }
  });

  const topTeachers = (teachers || []).map(t => ({
    id: t.id,
    full_name: t.full_name,
    tutorials_count: teacherStatsMap[t.id]?.count || 0,
    total_views: teacherStatsMap[t.id]?.views || 0,
    total_earnings: teacherEarningsMap[t.id] || 0,
    avg_rating: teacherRatingsMap[t.id]?.count ? teacherRatingsMap[t.id].total / teacherRatingsMap[t.id].count : 0,
  })).sort((a, b) => b.total_earnings - a.total_earnings).slice(0, 10);

  // Popular content
  const { data: popularTutorials } = await authClient
    .from('tutorials')
    .select('id, title, tutorial_type, view_count, completion_count')
    .order('view_count', { ascending: false })
    .limit(10);

  const popularContent = (popularTutorials || []).map(t => ({
    id: t.id,
    title: t.title,
    type: t.tutorial_type,
    views: t.view_count || 0,
    completions: t.completion_count || 0,
    avg_rating: 0, // Would need join
  }));

  return NextResponse.json({
    totalUsers: totalUsers || 0,
    totalStudents: totalStudents || 0,
    totalTeachers: totalTeachers || 0,
    totalAdmins: totalAdmins || 0,
    totalTutorials: totalTutorials || 0,
    totalViews,
    totalCompletions,
    newUsersThisMonth: newUsersThisMonth || 0,
    topTeachers,
    popularContent,
  });
}
