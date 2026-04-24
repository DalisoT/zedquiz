import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Role } from '@/types/database';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function isAdmin(role: Role): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function isTeacher(role: Role): boolean {
  return role === 'teacher' || isAdmin(role);
}

export function isStudent(role: Role): boolean {
  return role === 'student';
}

export async function getAuthUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user };
}

export async function requireRole(roles: Role[]) {
  const user = await getAuthUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const profile = await getProfile(user.id);
  if (!profile || !roles.includes(profile.role as Role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user, profile };
}

export async function requireAdmin() {
  return requireRole(['admin', 'super_admin']);
}

export async function requireTeacher() {
  return requireRole(['teacher', 'admin', 'super_admin']);
}

export function errorResponse(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

export function serverError(code = 'INTERNAL_ERROR') {
  return errorResponse('An unexpected error occurred', 500, code);
}
