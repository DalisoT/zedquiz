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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tutorialId } = await params;
  const authClient = getAuthClient(request);
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role === 'admin' || profile?.role === 'super_admin') {
    return NextResponse.json({ error: 'Admins cannot rate tutorials' }, { status: 403 });
  }

  try {
    const { rating, review } = await request.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    // Upsert rating (one rating per user per tutorial)
    const { data, error } = await authClient
      .from('tutorial_ratings')
      .upsert({
        tutorial_id: tutorialId,
        user_id: user.id,
        rating,
        review,
      }, { onConflict: 'tutorial_id,user_id' })
      .select()
      .single();

    if (error) return NextResponse.json({ error }, { status: 500 });

    // Update tutorial average rating
    const { data: ratings } = await authClient
      .from('tutorial_ratings')
      .select('rating')
      .eq('tutorial_id', tutorialId);

    if (ratings) {
      const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      await authClient
        .from('tutorials')
        .update({
          // Could add avg_rating column if needed
        })
        .eq('id', tutorialId);
    }

    // Award points for rating (first time rating gives points)
    const { data: existingRating } = await authClient
      .from('tutorial_ratings')
      .select('id')
      .eq('tutorial_id', tutorialId)
      .eq('user_id', user.id)
      .single();

    // Only give points once per tutorial rated
    if (!existingRating || (existingRating && review)) {
      await authClient.from('points_history').insert({
        user_id: user.id,
        points: 5,
        reason: `Rated a tutorial ${review ? 'with review' : ''}`,
      });
      await authClient.rpc('increment_points', {
        user_id_input: user.id,
        points_input: 5
      });
    }

    return NextResponse.json({ rating: data });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tutorialId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');

  const authClient = getAuthClient(request);
  const { data: { user } } = await authClient.auth.getUser();

  let query = authClient
    .from('tutorial_ratings')
    .select('*, user:profiles(full_name, avatar_url)')
    .eq('tutorial_id', tutorialId)
    .order('created_at', { ascending: false })
    .limit(limit);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error }, { status: 500 });

  // Calculate average
  const { data: allRatings } = await authClient
    .from('tutorial_ratings')
    .select('rating')
    .eq('tutorial_id', tutorialId);

  const avgRating = allRatings?.length
    ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
    : 0;

  return NextResponse.json({
    ratings: data,
    averageRating: avgRating.toFixed(1),
    totalRatings: allRatings?.length || 0
  });
}
