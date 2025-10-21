-- =========================================
-- COMPREHENSIVE PLATFORM SEED DATA
-- Multi-Tenant Village Management System
-- =========================================
-- This file creates the foundational data needed for the entire platform
-- including superadmin, communities, gates, and basic infrastructure

-- Create superadmin user
DO $$
DECLARE
  v_superadmin_id UUID;
BEGIN
  -- Check if superadmin already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'superadmin@villagetech.com') THEN
    v_superadmin_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new,
      email_change_token_current
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_superadmin_id,
      'authenticated',
      'authenticated',
      'superadmin@villagetech.com',
      crypt('SuperAdmin123!', gen_salt('bf')),
      NOW(),
      jsonb_build_object(
        'role', 'superadmin',
        'provider', 'email',
        'providers', ARRAY['email']::text[]
      ),
      jsonb_build_object(
        'first_name', 'Super',
        'last_name', 'Admin',
        'full_name', 'Super Admin'
      ),
      NOW(),
      NOW(),
      '',
      '',
      '',
      '',
      ''
    );
    RAISE NOTICE 'Superadmin user created';
  ELSE
    -- Update existing user's role and metadata
    UPDATE auth.users
    SET
      raw_app_meta_data = jsonb_build_object(
        'role', 'superadmin',
        'provider', 'email',
        'providers', ARRAY['email']::text[]
      ),
      raw_user_meta_data = jsonb_build_object(
        'first_name', 'Super',
        'last_name', 'Admin',
        'full_name', 'Super Admin'
      ),
      encrypted_password = crypt('SuperAdmin123!', gen_salt('bf'))
    WHERE email = 'superadmin@villagetech.com';
    SELECT id INTO v_superadmin_id FROM auth.users WHERE email = 'superadmin@villagetech.com';
    RAISE NOTICE 'Superadmin user already exists, updated role and password';
  END IF;

  -- Add superadmin to admin_users table (needed for RLS policies)
  INSERT INTO admin_users (id, role, first_name, last_name, status)
  VALUES (v_superadmin_id, 'superadmin', 'Super', 'Admin', 'active')
  ON CONFLICT (id) DO UPDATE SET
    role = 'superadmin',
    status = 'active';
  RAISE NOTICE 'Superadmin added to admin_users table';
END $$;

-- Create test communities with comprehensive data
DO $$
DECLARE
  v_community1_id UUID;
  v_community2_id UUID;
  v_community3_id UUID;
BEGIN
  -- Create primary test community (if none exists)
  IF NOT EXISTS (SELECT 1 FROM communities WHERE name = 'Green Valley Estates') THEN
    INSERT INTO communities (
      name,
      location,
      contact_email,
      contact_phone,
      regional_settings,
      status
    ) VALUES (
      'Green Valley Estates',
      '123 Palm Avenue, Makati City, Metro Manila, Philippines',
      'admin@greenvalley.com',
      '+63 2 8888 1234',
      jsonb_build_object(
        'timezone', 'Asia/Manila',
        'currency', 'PHP',
        'language', 'English',
        'country', 'Philippines',
        'state_province', 'Metro Manila',
        'postal_code', '1200'
      ),
      'active'
    ) RETURNING id INTO v_community1_id;
    RAISE NOTICE 'Green Valley Estates created with ID: %', v_community1_id;
  ELSE
    SELECT id INTO v_community1_id FROM communities WHERE name = 'Green Valley Estates' LIMIT 1;
    RAISE NOTICE 'Green Valley Estates already exists with ID: %', v_community1_id;
  END IF;

  -- Create second test community
  IF NOT EXISTS (SELECT 1 FROM communities WHERE name = 'Blue Ridge Heights') THEN
    INSERT INTO communities (
      name,
      location,
      contact_email,
      contact_phone,
      regional_settings,
      status
    ) VALUES (
      'Blue Ridge Heights',
      '456 Oak Street, Quezon City, Metro Manila, Philippines',
      'admin@blueridge.com',
      '+63 2 7777 5678',
      jsonb_build_object(
        'timezone', 'Asia/Manila',
        'currency', 'PHP',
        'language', 'English',
        'country', 'Philippines',
        'state_province', 'Metro Manila',
        'postal_code', '1100'
      ),
      'active'
    ) RETURNING id INTO v_community2_id;
    RAISE NOTICE 'Blue Ridge Heights created with ID: %', v_community2_id;
  ELSE
    SELECT id INTO v_community2_id FROM communities WHERE name = 'Blue Ridge Heights' LIMIT 1;
    RAISE NOTICE 'Blue Ridge Heights already exists with ID: %', v_community2_id;
  END IF;

  -- Create third test community
  IF NOT EXISTS (SELECT 1 FROM communities WHERE name = 'Sunset Gardens') THEN
    INSERT INTO communities (
      name,
      location,
      contact_email,
      contact_phone,
      regional_settings,
      status
    ) VALUES (
      'Sunset Gardens',
      '789 Mango Drive, Taguig City, Metro Manila, Philippines',
      'admin@sunsetgardens.com',
      '+63 2 6666 9012',
      jsonb_build_object(
        'timezone', 'Asia/Manila',
        'currency', 'PHP',
        'language', 'English',
        'country', 'Philippines',
        'state_province', 'Metro Manila',
        'postal_code', '1630'
      ),
      'active'
    ) RETURNING id INTO v_community3_id;
    RAISE NOTICE 'Sunset Gardens created with ID: %', v_community3_id;
  ELSE
    SELECT id INTO v_community3_id FROM communities WHERE name = 'Sunset Gardens' LIMIT 1;
    RAISE NOTICE 'Sunset Gardens already exists with ID: %', v_community3_id;
  END IF;

  -- Create gates for each community
  -- Green Valley Estates Gates
  INSERT INTO gates (
    tenant_id, name, type, description, operating_hours, latitude, longitude, is_active
  ) VALUES
    (v_community1_id, 'Main Gate', 'vehicle', 'Primary vehicle entrance for residents and visitors',
     '[
       {"day": "monday", "open": "06:00", "close": "22:00"},
       {"day": "tuesday", "open": "06:00", "close": "22:00"},
       {"day": "wednesday", "open": "06:00", "close": "22:00"},
       {"day": "thursday", "open": "06:00", "close": "22:00"},
       {"day": "friday", "open": "06:00", "close": "22:00"},
       {"day": "saturday", "open": "07:00", "close": "22:00"},
       {"day": "sunday", "open": "07:00", "close": "22:00"}
     ]'::jsonb,
     14.5547, 121.0244, true),
    (v_community1_id, 'Pedestrian Gate A', 'pedestrian', 'Walking entrance near Tower A',
     '[
       {"day": "monday", "open": "05:30", "close": "23:00"},
       {"day": "tuesday", "open": "05:30", "close": "23:00"},
       {"day": "wednesday", "open": "05:30", "close": "23:00"},
       {"day": "thursday", "open": "05:30", "close": "23:00"},
       {"day": "friday", "open": "05:30", "close": "23:00"},
       {"day": "saturday", "open": "06:00", "close": "23:00"},
       {"day": "sunday", "open": "06:00", "close": "23:00"}
     ]'::jsonb,
     14.5548, 121.0245, true),
    (v_community1_id, 'Service Gate', 'delivery', 'Service and delivery vehicles entrance',
     '[
       {"day": "monday", "open": "08:00", "close": "18:00"},
       {"day": "tuesday", "open": "08:00", "close": "18:00"},
       {"day": "wednesday", "open": "08:00", "close": "18:00"},
       {"day": "thursday", "open": "08:00", "close": "18:00"},
       {"day": "friday", "open": "08:00", "close": "18:00"},
       {"day": "saturday", "open": "09:00", "close": "14:00"},
       {"day": "sunday", "open": "closed", "close": "closed"}
     ]'::jsonb,
     14.5546, 121.0243, true)
  ON CONFLICT DO NOTHING;

  -- Blue Ridge Heights Gates
  INSERT INTO gates (
    tenant_id, name, type, description, operating_hours, latitude, longitude, is_active
  ) VALUES
    (v_community2_id, 'North Gate', 'vehicle', 'Main vehicle entrance',
     '[
       {"day": "monday", "open": "06:00", "close": "22:00"},
       {"day": "tuesday", "open": "06:00", "close": "22:00"},
       {"day": "wednesday", "open": "06:00", "close": "22:00"},
       {"day": "thursday", "open": "06:00", "close": "22:00"},
       {"day": "friday", "open": "06:00", "close": "22:00"},
       {"day": "saturday", "open": "07:00", "close": "22:00"},
       {"day": "sunday", "open": "07:00", "close": "22:00"}
     ]'::jsonb,
     14.6760, 121.0437, true),
    (v_community2_id, 'South Gate', 'vehicle', 'Secondary vehicle entrance',
     '[
       {"day": "monday", "open": "06:30", "close": "21:00"},
       {"day": "tuesday", "open": "06:30", "close": "21:00"},
       {"day": "wednesday", "open": "06:30", "close": "21:00"},
       {"day": "thursday", "open": "06:30", "close": "21:00"},
       {"day": "friday", "open": "06:30", "close": "21:00"},
       {"day": "saturday", "open": "07:00", "close": "21:00"},
       {"day": "sunday", "open": "07:00", "close": "21:00"}
     ]'::jsonb,
     14.6755, 121.0440, true)
  ON CONFLICT DO NOTHING;

  -- Sunset Gardens Gates
  INSERT INTO gates (
    tenant_id, name, type, description, operating_hours, latitude, longitude, is_active
  ) VALUES
    (v_community3_id, 'Main Entrance', 'vehicle', 'Primary entrance',
     '[
       {"day": "monday", "open": "06:00", "close": "22:00"},
       {"day": "tuesday", "open": "06:00", "close": "22:00"},
       {"day": "wednesday", "open": "06:00", "close": "22:00"},
       {"day": "thursday", "open": "06:00", "close": "22:00"},
       {"day": "friday", "open": "06:00", "close": "22:00"},
       {"day": "saturday", "open": "07:00", "close": "22:00"},
       {"day": "sunday", "open": "07:00", "close": "22:00"}
     ]'::jsonb,
     14.5176, 121.0508, true)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Platform seed data created successfully!';
  RAISE NOTICE 'Superadmin login: superadmin@villagetech.com / SuperAdmin123!';
  RAISE NOTICE 'Communities created: Green Valley Estates, Blue Ridge Heights, Sunset Gardens';
END $$;