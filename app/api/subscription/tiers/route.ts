import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  // Public endpoint - no auth required
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from('subscription_tiers')
    .select('*')
    .eq('is_active', true)
    .order('price_kwacha');

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ tiers: data });
}
