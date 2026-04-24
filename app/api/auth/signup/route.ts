import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { full_name, email, password, grade_level } = await request.json();
    if (!full_name || !email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Update profile with grade_level if provided
    if (data.user && grade_level) {
      await supabase
        .from('profiles')
        .update({ grade_level })
        .eq('id', data.user.id);
    }

    // Set cookies if we have a session
    if (data.session?.access_token) {
      const response = NextResponse.json({ user: data.user, session: data.session });
      response.cookies.set('sb-access-token', data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      if (data.session.refresh_token) {
        response.cookies.set('sb-refresh-token', data.session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        });
      }
      return response;
    }

    return NextResponse.json({ user: data.user });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}