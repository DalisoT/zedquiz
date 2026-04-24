import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAuthClient(request: NextRequest) {
  const accessToken = request.cookies.get('sb-access-token')?.value;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false }
  });
}

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('sb-access-token')?.value;
  if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const authClient = getAuthClient(request);
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Use service key for admin operations
  const serviceClient = createClient(supabaseUrl, serviceKey);
  const { data: authUsers } = await serviceClient.auth.admin.listUsers();
  const { data: profiles } = await serviceClient.from('profiles').select('*').order('created_at', { ascending: false });

  const usersWithEmail = profiles?.map(p => {
    const authUser = authUsers?.users.find(u => u.id === p.id);
    return { ...p, email: authUser?.email || '' };
  }) || [];

  return NextResponse.json({ users: usersWithEmail });
}

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('sb-access-token')?.value;
  if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const authClient = getAuthClient(request);
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const serviceClient = createClient(supabaseUrl, serviceKey);

  try {
    const { email, password, full_name, role } = await request.json();

    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (!['student', 'teacher', 'admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });
    if (!newUser.user) return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });

    // Use upsert to handle case where trigger already created profile
    const { error: profileError } = await serviceClient
      .from('profiles')
      .upsert({ id: newUser.user.id, full_name, role }, { onConflict: 'id' });

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

    return NextResponse.json({ user: newUser.user, message: 'User created successfully' });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
