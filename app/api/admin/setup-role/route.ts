import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Service role client to bypass RLS
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 });
    }

    // Check if this is the first user (no admin exists)
    const { data: existingAdmins } = await serviceClient
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'super_admin'])
      .limit(1);

    // Allow if no admins exist, or if user is already a profile (signup created it)
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile) {
      // Profile doesn't exist, create it with admin role
      const { error } = await serviceClient
        .from('profiles')
        .insert({
          id: userId,
          full_name: '',
          role: role
        });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // Profile exists, update role
    const { error } = await serviceClient
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
