import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body?.email;
    const password = body?.password;
    console.log('[login] attempt for:', email.slice(0, 3) + '***@' + email.split('@')[1]);
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing fields', received: { email, password: password ? '[set]' : '[empty]' } }, { status: 400 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 401 });

    // Create response with user data
    const response = NextResponse.json({ user: data.user, session: data.session });

    // Set HTTP-only cookie for session
    if (data.session?.access_token) {
      response.cookies.set('sb-access-token', data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60, // 1 hour - access token should be short-lived
        path: '/',
      });
    }
    if (data.session?.refresh_token) {
      response.cookies.set('sb-refresh-token', data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 1 week for refresh token
        path: '/',
      });
    }

    return response;
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}