import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  // Get tokens from cookies
  const accessToken = request.cookies.get('sb-access-token')?.value;
  const refreshToken = request.cookies.get('sb-refresh-token')?.value;

  if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Set the session with the access token and get authenticated client
  const { data: { user }, error: authError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken || '',
  });

  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Create authenticated client with user's token
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false }
    }
  );

  const { data: profile } = await authClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Get all profiles
  const { data, error } = await authClient
    .from('profiles')
    .select('id, full_name, role, created_at, streak_days, total_points, grade_level')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error }, { status: 500 });

  // Get emails using service role key (bypasses RLS)
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: authUsers } = await serviceClient.auth.admin.listUsers();
  const emailMap: Record<string, string> = {};
  authUsers?.users.forEach(u => {
    emailMap[u.id] = u.email ?? '';
  });

  const usersWithEmail = data?.map(p => ({
    ...p,
    email: emailMap[p.id] || '',
  })) || [];

  return NextResponse.json({ users: usersWithEmail });
}
