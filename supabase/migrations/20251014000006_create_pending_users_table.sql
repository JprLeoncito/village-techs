-- Create pending_users table for user registration waiting list
CREATE TABLE IF NOT EXISTS pending_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  registration_data JSONB, -- Store additional registration info
  admin_notes TEXT, -- Notes added by reviewing admin
  reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_pending_users_email ON pending_users(email);
CREATE INDEX idx_pending_users_status ON pending_users(status);
CREATE INDEX idx_pending_users_created_at ON pending_users(created_at);
CREATE INDEX idx_pending_users_auth_user_id ON pending_users(auth_user_id);

-- Enable RLS
ALTER TABLE pending_users ENABLE ROW LEVEL SECURITY;

-- RLS policies: Super admins can do everything, others have no access
CREATE POLICY "Super admins full access to pending users" ON pending_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
      AND admin_users.role = 'superadmin'
      AND admin_users.status = 'active'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_pending_users_updated_at
    BEFORE UPDATE ON pending_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();