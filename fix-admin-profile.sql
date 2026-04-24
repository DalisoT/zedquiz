-- Fix admin profile and ensure proper RLS for admin user management

-- 1. Create or update the super_admin profile
INSERT INTO public.profiles (id, full_name, role)
VALUES ('85bee6dc-d3cc-4f76-8e36-d556a44b6ad2', 'Admin', 'super_admin')
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';

-- 2. Ensure admins can SELECT all profiles (for the /api/users endpoint)
-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Admins select all profiles" ON profiles;
CREATE POLICY "Admins select all profiles" ON profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  OR auth.uid() = id
);

-- 3. Make sure "Admins manage profiles" covers UPDATE/DELETE properly
DROP POLICY IF EXISTS "Admins manage profiles" ON profiles;
CREATE POLICY "Admins manage profiles" ON profiles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
