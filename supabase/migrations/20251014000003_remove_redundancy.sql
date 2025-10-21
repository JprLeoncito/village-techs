-- =========================================
-- REMOVE DATABASE REDUNDANCY
-- Fix redundant columns and add sync triggers
-- =========================================

-- =========================================
-- 1. REMOVE REDUNDANT EMAIL FROM ADMIN_USERS
-- =========================================

-- Drop dependent views first
DROP VIEW IF EXISTS admin_users_with_community CASCADE;

-- Drop unique constraint on email first (this will also drop the index)
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_email_key;

-- Drop email column (truly redundant with auth.users.email)
ALTER TABLE admin_users DROP COLUMN IF EXISTS email;

-- =========================================
-- 2. SYNC TRIGGER FOR ADMIN_USERS
-- =========================================
-- Auto-update admin_users first_name, last_name, phone
-- when auth.users.raw_user_meta_data changes

CREATE OR REPLACE FUNCTION sync_admin_users_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if user exists in admin_users
  IF EXISTS (SELECT 1 FROM public.admin_users WHERE id = NEW.id) THEN
    UPDATE public.admin_users SET
      first_name = COALESCE(NEW.raw_user_meta_data ->> 'first_name', first_name),
      last_name = COALESCE(NEW.raw_user_meta_data ->> 'last_name', last_name),
      phone = COALESCE(NEW.raw_user_meta_data ->> 'phone', phone),
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS sync_admin_users_trigger ON auth.users;
CREATE TRIGGER sync_admin_users_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_admin_users_from_auth();

-- =========================================
-- 3. SYNC TRIGGER FOR HOUSEHOLD_MEMBERS
-- =========================================
-- Auto-update household_members first_name, last_name, contact_email, contact_phone
-- when auth.users data changes (only when user_id is set)

CREATE OR REPLACE FUNCTION sync_household_members_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all household_members linked to this user
  UPDATE public.household_members SET
    first_name = COALESCE(NEW.raw_user_meta_data ->> 'first_name', first_name),
    last_name = COALESCE(NEW.raw_user_meta_data ->> 'last_name', last_name),
    contact_email = NEW.email,
    contact_phone = COALESCE(NEW.raw_user_meta_data ->> 'phone', contact_phone),
    updated_at = NOW()
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS sync_household_members_trigger ON auth.users;
CREATE TRIGGER sync_household_members_trigger
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_household_members_from_auth();

-- =========================================
-- 4. REVERSE SYNC TRIGGER FOR HOUSEHOLD_MEMBERS
-- =========================================
-- When household_members.user_id is set, pull data from auth.users
-- This handles the case when user_id is initially NULL then later set

CREATE OR REPLACE FUNCTION sync_household_member_on_user_link()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_phone TEXT;
BEGIN
  -- Only sync if user_id was just set (changed from NULL or changed to different user)
  IF NEW.user_id IS NOT NULL AND (OLD.user_id IS NULL OR OLD.user_id != NEW.user_id) THEN
    -- Fetch user data from auth.users
    SELECT
      email,
      raw_user_meta_data ->> 'first_name',
      raw_user_meta_data ->> 'last_name',
      raw_user_meta_data ->> 'phone'
    INTO v_user_email, v_first_name, v_last_name, v_phone
    FROM auth.users
    WHERE id = NEW.user_id;

    -- Update household_member with user data
    NEW.contact_email := COALESCE(v_user_email, NEW.contact_email);
    NEW.first_name := COALESCE(v_first_name, NEW.first_name);
    NEW.last_name := COALESCE(v_last_name, NEW.last_name);
    NEW.contact_phone := COALESCE(v_phone, NEW.contact_phone);
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on household_members
DROP TRIGGER IF EXISTS sync_on_user_link_trigger ON household_members;
CREATE TRIGGER sync_on_user_link_trigger
  BEFORE UPDATE ON household_members
  FOR EACH ROW
  EXECUTE FUNCTION sync_household_member_on_user_link();

-- =========================================
-- 5. UPDATE EXISTING DATA
-- =========================================
-- Sync existing admin_users with current auth.users data

DO $$
BEGIN
  UPDATE public.admin_users au SET
    first_name = COALESCE(u.raw_user_meta_data ->> 'first_name', au.first_name),
    last_name = COALESCE(u.raw_user_meta_data ->> 'last_name', au.last_name),
    phone = COALESCE(u.raw_user_meta_data ->> 'phone', au.phone),
    updated_at = NOW()
  FROM auth.users u
  WHERE au.id = u.id;

  RAISE NOTICE 'Synced % admin_users records', (SELECT COUNT(*) FROM public.admin_users);
END $$;

-- Sync existing household_members with user_id set

DO $$
BEGIN
  UPDATE public.household_members hm SET
    first_name = COALESCE(u.raw_user_meta_data ->> 'first_name', hm.first_name),
    last_name = COALESCE(u.raw_user_meta_data ->> 'last_name', hm.last_name),
    contact_email = u.email,
    contact_phone = COALESCE(u.raw_user_meta_data ->> 'phone', hm.contact_phone),
    updated_at = NOW()
  FROM auth.users u
  WHERE hm.user_id = u.id AND hm.user_id IS NOT NULL;

  RAISE NOTICE 'Synced % household_members records', (SELECT COUNT(*) FROM public.household_members WHERE user_id IS NOT NULL);
END $$;

-- =========================================
-- 6. CREATE RPC FUNCTIONS FOR FETCHING ADMIN USERS WITH EMAIL
-- =========================================
-- Since email is removed from admin_users table, we need to fetch it from auth.users
-- Client can't directly query auth.users, so we provide RPC functions

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
