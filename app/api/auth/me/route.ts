import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get tokens from cookies
    const accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

    if (!accessToken) {
      return NextResponse.json({ user: null });
    }

    // Set the session with the access token
    const { data: { user }, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });

    if (error || !user) {
      return NextResponse.json({ user: null });
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Fetch class info for the grade_level (class_id)
    let gradeLevelInfo = null;
    if (profile?.grade_level) {
      const { data: classData } = await supabase
        .from('classes')
        .select('*, levels(*)')
        .eq('id', profile.grade_level)
        .single();
      gradeLevelInfo = classData;
    }

    const profileWithGrade = {
      ...profile,
      grade_level: gradeLevelInfo
    };

    return NextResponse.json({ user, profile: profileWithGrade });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}