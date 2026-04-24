import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const path = request.nextUrl.pathname;

  const publicRoutes = ['/', '/login', '/signup'];
  const isPublicRoute = publicRoutes.includes(path) || path.startsWith('/api/auth') || path.startsWith('/_next');

  // Get session from cookie
  const accessToken = request.cookies.get('sb-access-token')?.value;
  const refreshToken = request.cookies.get('sb-refresh-token')?.value;

  if (!accessToken && !refreshToken) {
    if (!isPublicRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return res;
  }

  // Try to get user with the token
  if (accessToken) {
    // Create authenticated client with user's token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false }
    });

    const { data: { user }, error } = await userClient.auth.getUser();

    if (!error && user) {
      if (path === '/login' || path === '/signup') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // Check role for protected routes
      const { data: profile } = await userClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role || 'student';

      if (path.startsWith('/admin') && role !== 'admin' && role !== 'super_admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      if (path.startsWith('/teacher') && role !== 'teacher') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      if (path.startsWith('/student') && role !== 'student') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      return res;
    }
  }

  if (!isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
