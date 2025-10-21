-- Fix RLS policies for pending_users table to allow user registrations
-- This allows authenticated users to insert their own registration records

-- Drop existing policy
DROP POLICY IF EXISTS "Super admins full access to pending users" ON pending_users;

-- Create policies for pending_users table

-- Policy 1: Allow users to insert their own registration record
CREATE POLICY "Users can insert their own registration" ON pending_users
  FOR INSERT WITH CHECK (
    auth.uid() = auth_user_id
  );

-- Policy 2: Super admins can do everything
CREATE POLICY "Super admins full access to pending users" ON pending_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role = 'superadmin'
      AND admin_users.status = 'active'
    )
  );

-- Policy 3: Users can view their own registration status
CREATE POLICY "Users can view their own registration" ON pending_users
  FOR SELECT USING (
    auth.uid() = auth_user_id
  );