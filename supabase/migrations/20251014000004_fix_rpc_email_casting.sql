-- =========================================
-- FIX RPC FUNCTIONS EMAIL CASTING
-- Fix type mismatch in RPC functions by casting email to TEXT
-- =========================================

-- Fix the email type casting issue in get_admin_users_with_email
CREATE OR REPLACE FUNCTION get_admin_users_with_email(p_tenant_id UUID)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  email TEXT,
  role TEXT,
  status TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.tenant_id,
    u.email::TEXT,
    au.role,
    au.status,
    au.first_name,
    au.last_name,
    au.phone,
    au.created_at,
    au.updated_at
  FROM public.admin_users au
  INNER JOIN auth.users u ON u.id = au.id
  WHERE au.tenant_id = p_tenant_id
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the email type casting issue in get_admin_user_with_email
CREATE OR REPLACE FUNCTION get_admin_user_with_email(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  email TEXT,
  role TEXT,
  status TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.tenant_id,
    u.email::TEXT,
    au.role,
    au.status,
    au.first_name,
    au.last_name,
    au.phone,
    au.created_at,
    au.updated_at
  FROM public.admin_users au
  INNER JOIN auth.users u ON u.id = au.id
  WHERE au.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;