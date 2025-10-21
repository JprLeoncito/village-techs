-- =========================================
-- COMPREHENSIVE HOA ADMIN SEED DATA
-- Feature 002: HOA Administration Platform
-- =========================================
-- This file creates comprehensive test data for the HOA Administration Platform
-- including admin users, residences, households, fees, permits, and security data

-- Get the primary community ID for HOA admin testing
DO $$
DECLARE
  v_community_id UUID;
  v_residence_ids UUID[] := ARRAY[]::UUID[];
  v_household_ids UUID[] := ARRAY[]::UUID[];
  v_admin_head_user_id UUID;
  v_admin_officer_user_id UUID;
  v_security_officer_user_id UUID;
  v_member_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Get Green Valley Estates community (primary test community)
  SELECT id INTO v_community_id
  FROM communities
  WHERE name = 'Green Valley Estates'
  LIMIT 1;

  IF v_community_id IS NULL THEN
    RAISE EXCEPTION 'Green Valley Estates community not found. Please run seed.sql first.';
  END IF;

  RAISE NOTICE 'Using community ID: %', v_community_id;

  -- =========================================
  -- CREATE COMPREHENSIVE RESIDENCES
  -- =========================================

  -- Create various types of residences
  INSERT INTO residences (tenant_id, unit_number, type, max_occupancy, lot_area, floor_area)
  VALUES
    -- Condominium Units
    (v_community_id, 'A-101', 'condo', 4, 0, 120.5),
    (v_community_id, 'A-102', 'condo', 4, 0, 115.0),
    (v_community_id, 'A-201', 'condo', 4, 0, 125.0),
    (v_community_id, 'A-202', 'condo', 4, 0, 118.0),
    (v_community_id, 'B-101', 'condo', 6, 0, 150.0),
    (v_community_id, 'B-102', 'condo', 6, 0, 145.0),
    (v_community_id, 'B-201', 'condo', 6, 0, 155.0),
    (v_community_id, 'B-202', 'condo', 6, 0, 148.0),
    -- Townhouses
    (v_community_id, 'TH-001', 'townhouse', 6, 180.5, 250.0),
    (v_community_id, 'TH-002', 'townhouse', 6, 175.0, 240.0),
    (v_community_id, 'TH-003', 'townhouse', 6, 190.0, 260.0),
    -- Single Family Homes
    (v_community_id, 'SF-001', 'single_family', 8, 350.0, 450.0),
    (v_community_id, 'SF-002', 'single_family', 8, 320.0, 420.0),
    -- Apartments
    (v_community_id, 'AP-301', 'apartment', 2, 0, 65.0),
    (v_community_id, 'AP-302', 'apartment', 2, 0, 70.0),
    (v_community_id, 'AP-303', 'apartment', 3, 0, 85.0)
  ON CONFLICT (tenant_id, unit_number) DO NOTHING;

  -- Get residence IDs
  SELECT ARRAY_AGG(id ORDER BY unit_number) INTO v_residence_ids
  FROM residences
  WHERE tenant_id = v_community_id;

  RAISE NOTICE 'Created % residences', ARRAY_LENGTH(v_residence_ids, 1);

  -- =========================================
  -- CREATE HOA ADMIN USERS
  -- =========================================

  -- Admin Head
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin.head@greenvalley.com') THEN
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
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin.head@greenvalley.com',
      crypt('AdminHead123!', gen_salt('bf')),
      NOW(),
      jsonb_build_object(
        'role', 'admin_head',
        'tenant_id', v_community_id::text,
        'provider', 'email',
        'providers', ARRAY['email']::text[]
      ),
      jsonb_build_object(
        'first_name', 'Roberto',
        'last_name', 'Santos',
        'full_name', 'Roberto Santos'
      ),
      NOW(),
      NOW(),
      '',
      '',
      '',
      '',
      ''
    );
  END IF;

  -- Admin Officer
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin.officer@greenvalley.com') THEN
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
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin.officer@greenvalley.com',
      crypt('AdminOfficer123!', gen_salt('bf')),
      NOW(),
      jsonb_build_object(
        'role', 'admin_officer',
        'tenant_id', v_community_id::text,
        'provider', 'email',
        'providers', ARRAY['email']::text[]
      ),
      jsonb_build_object(
        'first_name', 'Maria',
        'last_name', 'Reyes',
        'full_name', 'Maria Reyes'
      ),
      NOW(),
      NOW(),
      '',
      '',
      '',
      '',
      ''
    );
  END IF;

  -- Security Officer
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'security.officer@greenvalley.com') THEN
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
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'security.officer@greenvalley.com',
      crypt('Security123!', gen_salt('bf')),
      NOW(),
      jsonb_build_object(
        'role', 'security',
        'tenant_id', v_community_id::text,
        'provider', 'email',
        'providers', ARRAY['email']::text[]
      ),
      jsonb_build_object(
        'first_name', 'Juan',
        'last_name', 'Cruz',
        'full_name', 'Juan Cruz'
      ),
      NOW(),
      NOW(),
      '',
      '',
      '',
      '',
      ''
    );
  END IF;

  -- Get user IDs
  SELECT id INTO v_admin_head_user_id FROM auth.users WHERE email = 'admin.head@greenvalley.com';
  SELECT id INTO v_admin_officer_user_id FROM auth.users WHERE email = 'admin.officer@greenvalley.com';
  SELECT id INTO v_security_officer_user_id FROM auth.users WHERE email = 'security.officer@greenvalley.com';

  -- Create admin_users entries
  INSERT INTO admin_users (id, tenant_id, role, first_name, last_name, phone, status)
  VALUES
    (v_admin_head_user_id, v_community_id, 'admin_head', 'Roberto', 'Santos', '+63 917 888 1234', 'active'),
    (v_admin_officer_user_id, v_community_id, 'admin_officer', 'Maria', 'Reyes', '+63 917 888 5678', 'active')
  ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    role = EXCLUDED.role,
    status = EXCLUDED.status;

  RAISE NOTICE 'HOA Admin users created successfully';

  -- =========================================
  -- CREATE COMPREHENSIVE HOUSEHOLDS
  -- =========================================

  -- Create households with diverse characteristics
  INSERT INTO households (
    tenant_id, residence_id, move_in_date, status, contact_email, contact_phone, notes
  ) VALUES
    -- Active households
    (v_community_id, v_residence_ids[1], '2023-01-15', 'active', 'cruz.family@email.com', '+63 917 123 4567', 'Has elderly resident. Emergency contact: Elena Cruz +63 917 123 4568'),
    (v_community_id, v_residence_ids[2], '2023-02-01', 'active', 'santos.family@email.com', '+63 917 234 5678', 'Has pet dog. Emergency contact: Pedro Santos +63 917 234 5679'),
    (v_community_id, v_residence_ids[3], '2023-03-10', 'active', 'reyes.family@email.com', '+63 917 345 6789', 'Has small children. Emergency contact: Ana Reyes +63 917 345 6790'),
    (v_community_id, v_residence_ids[4], '2023-04-05', 'active', 'lim.family@email.com', '+63 917 456 7890', 'No special requirements'),
    (v_community_id, v_residence_ids[5], '2023-05-12', 'active', 'garcia.family@email.com', '+63 917 567 8901', 'Has wheelchair access needs. Emergency contact: Luis Garcia +63 917 567 8902'),
    (v_community_id, v_residence_ids[6], '2023-06-20', 'active', 'fernando.family@email.com', '+63 917 678 9012', 'No special requirements. Emergency contact: Maria Fernando +63 917 678 9013'),
    (v_community_id, v_residence_ids[7], '2023-07-08', 'active', 'mendoza.family@email.com', '+63 917 789 0123', 'No special requirements. Emergency contact: Roberto Mendoza +63 917 789 0124'),
    (v_community_id, v_residence_ids[8], '2023-08-15', 'active', 'tan.family@email.com', '+63 917 890 1234', 'Speaks Mandarin. Emergency contact: Amy Tan +63 917 890 1235'),
    (v_community_id, v_residence_ids[9], '2023-09-01', 'active', 'villanueva.family@email.com', '+63 917 901 2345', 'No special requirements. Emergency contact: Jose Villanueva +63 917 901 2346'),
    (v_community_id, v_residence_ids[10], '2023-10-10', 'active', 'castillo.family@email.com', '+63 917 012 3456', 'No special requirements. Emergency contact: Rosa Castillo +63 917 012 3457'),
    -- Inactive household
    (v_community_id, v_residence_ids[11], '2022-05-01', 'inactive', 'dela.cruz.family@email.com', '+63 917 111 2222', 'Moved out. Emergency contact: Antonio Dela Cruz +63 917 111 2223'),
    -- Pending household (using 'inactive' status)
    (v_community_id, v_residence_ids[12], CURRENT_DATE + INTERVAL '1 month', 'inactive', 'new.family@email.com', '+63 917 222 3333', 'Moving in next month. Emergency contact: New Resident +63 917 222 3334')
  ON CONFLICT DO NOTHING;

  -- Get household IDs
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO v_household_ids
  FROM households
  WHERE tenant_id = v_community_id AND status = 'active';

  -- =========================================
  -- CREATE HOUSEHOLD MEMBERS
  -- =========================================

  -- Create diverse household members
  INSERT INTO household_members (
    tenant_id, household_id, first_name, last_name, relationship_to_head,
    date_of_birth, contact_email, contact_phone, member_type, status
  ) VALUES
    -- Cruz Family (Household 1)
    (v_community_id, v_household_ids[1], 'Juan', 'Cruz', 'self', '1980-05-15', 'juan.cruz@email.com', '+63 917 123 4567', 'resident', 'active'),
    (v_community_id, v_household_ids[1], 'Maria', 'Cruz', 'spouse', '1982-08-20', 'maria.cruz@email.com', '+63 917 123 4568', 'resident', 'active'),
    (v_community_id, v_household_ids[1], 'Elena', 'Cruz', 'parent', '1955-03-10', 'elena.cruz@email.com', '+63 917 123 4569', 'resident', 'active'),
    (v_community_id, v_household_ids[1], 'Juan Jr', 'Cruz', 'child', '2010-11-25', NULL, NULL, 'resident', 'active'),

    -- Santos Family (Household 2)
    (v_community_id, v_household_ids[2], 'Pedro', 'Santos', 'self', '1975-12-03', 'pedro.santos@email.com', '+63 917 234 5678', 'resident', 'active'),
    (v_community_id, v_household_ids[2], 'Ana', 'Santos', 'spouse', '1977-06-18', 'ana.santos@email.com', '+63 917 234 5679', 'resident', 'active'),
    (v_community_id, v_household_ids[2], 'Miguel', 'Santos', 'child', '2005-09-12', NULL, NULL, 'resident', 'active'),
    (v_community_id, v_household_ids[2], 'Sofia', 'Santos', 'child', '2008-04-22', NULL, NULL, 'resident', 'active'),

    -- Reyes Family (Household 3)
    (v_community_id, v_household_ids[3], 'Carlos', 'Reyes', 'self', '1985-02-28', 'carlos.reyes@email.com', '+63 917 345 6789', 'resident', 'active'),
    (v_community_id, v_household_ids[3], 'Luisa', 'Reyes', 'spouse', '1987-07-14', 'luisa.reyes@email.com', '+63 917 345 6790', 'resident', 'active'),
    (v_community_id, v_household_ids[3], 'Diego', 'Reyes', 'child', '2012-01-08', NULL, NULL, 'resident', 'active'),
    (v_community_id, v_household_ids[3], 'Isabella', 'Reyes', 'child', '2014-10-30', NULL, NULL, 'resident', 'active'),
    (v_community_id, v_household_ids[3], 'Gabriel', 'Reyes', 'child', '2016-05-20', NULL, NULL, 'resident', 'active'),

    -- Other households (simplified)
    (v_community_id, v_household_ids[4], 'Roberto', 'Lim', 'self', '1978-11-11', 'roberto.lim@email.com', '+63 917 456 7890', 'resident', 'active'),
    (v_community_id, v_household_ids[5], 'Luis', 'Garcia', 'self', '1982-04-05', 'luis.garcia@email.com', '+63 917 567 8901', 'resident', 'active'),
    (v_community_id, v_household_ids[6], 'Maria', 'Fernando', 'self', '1979-08-17', 'maria.fernando@email.com', '+63 917 678 9012', 'resident', 'active'),
    (v_community_id, v_household_ids[7], 'Roberto', 'Mendoza', 'self', '1983-01-23', 'roberto.mendoza@email.com', '+63 917 789 0123', 'resident', 'active'),
    (v_community_id, v_household_ids[8], 'Amy', 'Tan', 'self', '1986-06-09', 'amy.tan@email.com', '+63 917 890 1234', 'resident', 'active'),
    (v_community_id, v_household_ids[9], 'Jose', 'Villanueva', 'self', '1980-12-25', 'jose.villanueva@email.com', '+63 917 901 2345', 'resident', 'active'),
    (v_community_id, v_household_ids[10], 'Rosa', 'Castillo', 'self', '1984-03-14', 'rosa.castillo@email.com', '+63 917 012 3456', 'resident', 'active')
  ON CONFLICT DO NOTHING;

  -- Get member IDs for household heads
  SELECT ARRAY_AGG(id ORDER BY created_at) INTO v_member_ids
  FROM (
    SELECT hm.id, hm.created_at
    FROM household_members hm
    WHERE hm.household_id IN (
      SELECT id FROM households WHERE tenant_id = v_community_id AND status = 'active' LIMIT 10
    )
    AND hm.relationship_to_head = 'self'
    ORDER BY hm.created_at
  ) t;

  -- Update households with household heads
  UPDATE households SET household_head_id = v_member_ids[1] WHERE id = v_household_ids[1];
  UPDATE households SET household_head_id = v_member_ids[2] WHERE id = v_household_ids[2];
  UPDATE households SET household_head_id = v_member_ids[3] WHERE id = v_household_ids[3];
  UPDATE households SET household_head_id = v_member_ids[4] WHERE id = v_household_ids[4];
  UPDATE households SET household_head_id = v_member_ids[5] WHERE id = v_household_ids[5];
  UPDATE households SET household_head_id = v_member_ids[6] WHERE id = v_household_ids[6];
  UPDATE households SET household_head_id = v_member_ids[7] WHERE id = v_household_ids[7];
  UPDATE households SET household_head_id = v_member_ids[8] WHERE id = v_household_ids[8];
  UPDATE households SET household_head_id = v_member_ids[9] WHERE id = v_household_ids[9];
  UPDATE households SET household_head_id = v_member_ids[10] WHERE id = v_household_ids[10];

  -- =========================================
  -- CREATE AUTHENTICATED HOUSEHOLD HEAD USERS
  -- =========================================

  -- Create auth.users accounts for each household head for residence app access
  -- Only create if user doesn't already exist
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    lower(hm.first_name || '.' || hm.last_name || '@greenvalley.com'),
    crypt('Resident123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email']::text[],
      'role', 'resident',
      'tenant_id', v_community_id::text,
      'app_version', '1.0.0',
      'device_type', 'mobile'
    ),
    jsonb_build_object(
      'first_name', hm.first_name,
      'last_name', hm.last_name,
      'full_name', hm.first_name || ' ' || hm.last_name,
      'phone_number', hm.contact_phone,
      'notification_preferences', jsonb_build_object(
        'email', true,
        'push', true,
        'sms', false,
        'announcements', true,
        'fees', true,
        'guests', true,
        'security', true
      )
    ),
    false,
    ''
  FROM household_members hm
  WHERE hm.relationship_to_head = 'self'
  AND hm.tenant_id = v_community_id
  AND hm.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE lower(au.email) = lower(hm.first_name || '.' || hm.last_name || '@greenvalley.com')
  );

  -- Get the created user IDs for household heads and update household_members
  UPDATE household_members hm
  SET user_id = au.id
  FROM auth.users au
  WHERE hm.relationship_to_head = 'self'
  AND hm.tenant_id = v_community_id
  AND hm.status = 'active'
  AND lower(au.email) = lower(hm.first_name || '.' || hm.last_name || '@greenvalley.com');

  -- Note: Residents are not added to admin_users table as that table is only for
  -- administrative staff (superadmin, admin_head, admin_officer)
  -- Residents are managed through household_members and auth.users tables

  -- Update households metadata with household info for user context
  UPDATE auth.users au
  SET raw_app_meta_data = au.raw_app_meta_data || jsonb_build_object(
    'household_id', h.id::text,
    'residence_id', h.residence_id::text,
    'unit_number', (SELECT unit_number FROM residences WHERE id = h.residence_id)
  )
  FROM households h
  WHERE au.id IN (
    SELECT hm.user_id FROM household_members hm
    WHERE hm.relationship_to_head = 'self'
    AND hm.tenant_id = v_community_id
    AND hm.status = 'active'
  )
  AND h.id = (SELECT hm.household_id FROM household_members hm WHERE hm.user_id = au.id LIMIT 1);

  RAISE NOTICE 'Created authenticated accounts for household heads for residence app access';
  RAISE NOTICE 'Demo resident login credentials (all use password: Resident123!):';
  RAISE NOTICE '  juan.cruz@greenvalley.com, pedro.santos@greenvalley.com, carlos.reyes@greenvalley.com';
  RAISE NOTICE '  roberto.lim@greenvalley.com, luis.garcia@greenvalley.com, maria.fernando@greenvalley.com';
  RAISE NOTICE '  roberto.mendoza@greenvalley.com, amy.tan@greenvalley.com, jose.villanueva@greenvalley.com, rosa.castillo@greenvalley.com';

  -- =========================================
  -- CREATE VEHICLE STICKERS
  -- =========================================

  INSERT INTO vehicle_stickers (
    tenant_id, household_id, member_id, vehicle_plate, vehicle_make, vehicle_model,
    vehicle_color, rfid_code, status, expiry_date, approved_at, approved_by,
    rejection_reason, created_at
  ) VALUES
    -- Active stickers
    (v_community_id, v_household_ids[1], v_member_ids[1], 'ABC 123', 'Toyota', 'Camry', 'Silver', 'RFID001', 'active', CURRENT_DATE + INTERVAL '6 months', NOW() - INTERVAL '1 month', v_admin_officer_user_id, NULL, NOW() - INTERVAL '2 months'),
    (v_community_id, v_household_ids[1], v_member_ids[1], 'XYZ 789', 'Honda', 'Civic', 'Blue', 'RFID002', 'active', CURRENT_DATE + INTERVAL '1 year', NOW() - INTERVAL '3 months', v_admin_officer_user_id, NULL, NOW() - INTERVAL '4 months'),
    (v_community_id, v_household_ids[2], v_member_ids[2], 'DEF 456', 'Nissan', 'Altima', 'Black', 'RFID003', 'active', CURRENT_DATE + INTERVAL '8 months', NOW() - INTERVAL '2 weeks', v_admin_officer_user_id, NULL, NOW() - INTERVAL '1 month'),

    -- Pending stickers
    (v_community_id, v_household_ids[3], v_member_ids[3], 'GHI 012', 'Ford', 'Ranger', 'Red', NULL, 'requested', NULL, NULL, NULL, NULL, NOW()),
    (v_community_id, v_household_ids[4], v_member_ids[4], 'JKL 345', 'Mitsubishi', 'Montero', 'White', NULL, 'requested', NULL, NULL, NULL, NULL, NOW() - INTERVAL '3 days'),

    -- Expiring stickers
    (v_community_id, v_household_ids[5], v_member_ids[5], 'MNO 678', 'Hyundai', 'Accent', 'Gray', 'RFID004', 'expiring', CURRENT_DATE + INTERVAL '30 days', NOW() - INTERVAL '11 months', v_admin_officer_user_id, NULL, NOW() - INTERVAL '1 year'),

    -- Expired stickers
    (v_community_id, v_household_ids[6], v_member_ids[6], 'PQR 901', 'Kia', 'Picanto', 'Yellow', 'RFID005', 'expired', CURRENT_DATE - INTERVAL '15 days', NOW() - INTERVAL '1 year', v_admin_officer_user_id, NULL, NOW() - INTERVAL '1 year'),

    -- Rejected stickers
    (v_community_id, v_household_ids[7], v_member_ids[7], 'STU 234', 'BMW', 'X5', 'Black', NULL, 'rejected', NULL, NULL, v_admin_officer_user_id, 'Documentation incomplete', NOW() - INTERVAL '2 weeks')
  ON CONFLICT DO NOTHING;

  -- =========================================
  -- CREATE CONSTRUCTION PERMITS
  -- =========================================

  INSERT INTO construction_permits (
    tenant_id, household_id, project_description, project_start_date, project_end_date,
    contractor_name, contractor_contact, contractor_license, road_fee_amount,
    road_fee_paid, status, approved_by, approved_at, notes, created_at
  ) VALUES
    -- Active permits
    (v_community_id, v_household_ids[1], 'Kitchen renovation and cabinet installation', CURRENT_DATE + INTERVAL '1 week', CURRENT_DATE + INTERVAL '1 month', 'ABC Contractors', '+63 917 111 2222', 'PCAB-12345', 5000.00, false, 'pending', NULL, NULL, 'Standard renovation permit', NOW()),
    (v_community_id, v_household_ids[2], 'Bathroom remodeling and waterproofing', CURRENT_DATE - INTERVAL '2 weeks', CURRENT_DATE + INTERVAL '1 week', 'XYZ Builders', '+63 917 333 4444', 'PCAB-67890', 3000.00, true, 'in_progress', v_admin_officer_user_id, NOW() - INTERVAL '3 weeks', 'Bathroom renovation with water damage repair', NOW() - INTERVAL '3 weeks'),

    -- Completed permits
    (v_community_id, v_household_ids[3], 'Bedroom addition', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE - INTERVAL '1 month', 'Reliable Construction', '+63 917 555 6666', 'PCAB-11111', 10000.00, true, 'completed', v_admin_officer_user_id, NOW() - INTERVAL '3 months', 'Master bedroom expansion', NOW() - INTERVAL '3 months'),

    -- Pending permits
    (v_community_id, v_household_ids[4], 'Gazebo construction in backyard', CURRENT_DATE + INTERVAL '2 weeks', CURRENT_DATE + INTERVAL '1 month', 'Outdoor Spaces Inc', '+63 917 777 8888', 'PCAB-22222', 2000.00, false, 'pending', NULL, NULL, 'Outdoor structure permit', NOW() - INTERVAL '1 week')
  ON CONFLICT DO NOTHING;

  -- =========================================
  -- CREATE ASSOCIATION FEES
  -- =========================================

  INSERT INTO association_fees (
    tenant_id, household_id, fee_type, amount, due_date, payment_status,
    paid_amount, payment_date, payment_method, notes, created_at
  ) VALUES
    -- Various fee statuses for different households
    (v_community_id, v_household_ids[1], 'monthly', 2500.00, CURRENT_DATE + INTERVAL '15 days', 'unpaid', 0.00, NULL, NULL, 'Monthly association dues', NOW()),
    (v_community_id, v_household_ids[1], 'monthly', 2500.00, CURRENT_DATE - INTERVAL '1 month', 'paid', 2500.00, CURRENT_DATE - INTERVAL '25 days', 'bank_transfer', 'Previous month paid', NOW() - INTERVAL '2 months'),
    (v_community_id, v_household_ids[2], 'monthly', 2500.00, CURRENT_DATE, 'paid', 2500.00, CURRENT_DATE, 'cash', 'Current month paid', NOW() - INTERVAL '1 month'),
    (v_community_id, v_household_ids[2], 'quarterly', 7000.00, CURRENT_DATE + INTERVAL '2 months', 'unpaid', 0.00, NULL, NULL, 'Quarterly assessment', NOW()),
    (v_community_id, v_household_ids[3], 'monthly', 2500.00, CURRENT_DATE - INTERVAL '10 days', 'overdue', 0.00, NULL, NULL, 'Overdue payment - follow up required', NOW() - INTERVAL '1 month'),
    (v_community_id, v_household_ids[3], 'special_assessment', 5000.00, CURRENT_DATE - INTERVAL '2 weeks', 'paid', 5000.00, CURRENT_DATE - INTERVAL '5 days', 'online', 'Road repair special assessment', NOW() - INTERVAL '3 weeks'),
    (v_community_id, v_household_ids[4], 'monthly', 2500.00, CURRENT_DATE + INTERVAL '1 week', 'paid', 2500.00, CURRENT_DATE, 'online', 'Early payment', NOW() - INTERVAL '2 weeks'),
    (v_community_id, v_household_ids[5], 'monthly', 2500.00, CURRENT_DATE - INTERVAL '5 days', 'partial', 1250.00, CURRENT_DATE - INTERVAL '5 days', 'cash', 'Partial payment made', NOW() - INTERVAL '1 month'),
    (v_community_id, v_household_ids[6], 'annual', 28000.00, CURRENT_DATE + INTERVAL '3 months', 'unpaid', 0.00, NULL, NULL, 'Annual dues for 2024', NOW()),
    (v_community_id, v_household_ids[7], 'monthly', 2500.00, CURRENT_DATE - INTERVAL '2 days', 'paid', 2500.00, CURRENT_DATE - INTERVAL '2 days', 'bank_transfer', 'On-time payment', NOW() - INTERVAL '1 month')
  ON CONFLICT DO NOTHING;

  -- =========================================
  -- CREATE ANNOUNCEMENTS
  -- =========================================

  INSERT INTO announcements (
    tenant_id, created_by, announcement_type, title, content, target_audience,
    status, publication_date, published_at, expiry_date, created_at
  ) VALUES
    -- Urgent announcements
    (v_community_id, v_admin_head_user_id, 'urgent', 'Scheduled Water Interruption', 'Water supply will be interrupted on Saturday from 9 AM to 3 PM for maintenance work. Please store water in advance.', 'all', 'published', NOW(), NOW(), NOW() + INTERVAL '3 days', NOW()),

    -- General announcements
    (v_community_id, v_admin_officer_user_id, 'general', 'Community Meeting Schedule', 'The monthly community meeting will be held next Saturday at 3 PM in the clubhouse. Agenda includes security updates and facility improvements.', 'all', 'published', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '1 month', NOW() - INTERVAL '3 days'),

    -- Maintenance announcements
    (v_community_id, v_admin_officer_user_id, 'maintenance', 'Elevator Maintenance Notice', 'Building A elevator will undergo maintenance on Monday and Tuesday. Please use the stairs or Building B elevator.', 'households', 'published', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 week', NOW()),

    -- Event announcements
    (v_community_id, v_admin_head_user_id, 'event', 'Community Christmas Party', 'Join us for our annual Christmas party on December 15 at 6 PM in the community center. Please RSVP by December 10.', 'all', 'published', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', NOW() + INTERVAL '2 weeks', NOW() - INTERVAL '1 week'),

    -- Draft announcements
    (v_community_id, v_admin_officer_user_id, 'general', 'New Security Measures', 'We are implementing enhanced security measures including additional CCTV cameras and visitor registration system.', 'all', 'draft', NULL, NULL, NULL, NOW() - INTERVAL '3 days')
  ON CONFLICT DO NOTHING;

  -- =========================================
  -- CREATE INCIDENT REPORTS
  -- =========================================

  INSERT INTO incident_reports (
    tenant_id, reported_by, incident_timestamp, incident_type, location,
    description, resolution_status, resolved_by, resolved_at,
    resolution_notes, created_at
  ) VALUES
    -- Resolved incidents
    (v_community_id, v_security_officer_user_id, CURRENT_DATE - INTERVAL '2 days', 'suspicious_activity', 'Parking Area B', 'Unidentified person loitering near parked vehicles for extended period.', 'resolved', v_security_officer_user_id, CURRENT_DATE - INTERVAL '2 days', 'Person was a visitor waiting for resident, no issue found.', NOW() - INTERVAL '2 days'),
    (v_community_id, v_admin_officer_user_id, CURRENT_DATE - INTERVAL '5 days', 'disturbance', 'Building A Lobby', 'Noise complaint from residents about loud gathering in lobby area.', 'resolved', v_admin_officer_user_id, CURRENT_DATE - INTERVAL '5 days', 'Residents were asked to keep noise levels down and complied.', NOW() - INTERVAL '5 days'),

    -- Investigating incidents
    (v_community_id, v_security_officer_user_id, CURRENT_DATE - INTERVAL '1 day', 'property_damage', 'Community Garden', 'Graffiti found on garden wall. Unknown perpetrators.', 'investigating', NULL, NULL, 'Reviewing CCTV footage, speaking with residents.', NOW() - INTERVAL '1 day'),

    -- High priority incident
    (v_community_id, v_security_officer_user_id, CURRENT_DATE - INTERVAL '3 hours', 'unauthorized_entry', 'Building B - 2nd Floor', 'Attempted break-in detected on apartment B-205. Lock damaged but entry prevented.', 'investigating', NULL, NULL, 'Security increased, police notified, investigation ongoing.', NOW() - INTERVAL '3 hours')
  ON CONFLICT DO NOTHING;

  -- =========================================
  -- CREATE SECURITY SHIFTS
  -- =========================================

  INSERT INTO security_shifts (
    tenant_id, officer_id, gate_id, shift_start, shift_end, status, notes
  ) VALUES
    -- Active shifts
    (v_community_id, v_security_officer_user_id, (SELECT id FROM gates WHERE tenant_id = v_community_id AND name = 'Main Gate' LIMIT 1), CURRENT_DATE - INTERVAL '8 hours', CURRENT_DATE + INTERVAL '16 hours', 'active', 'Regular day shift'),

    -- Completed shifts
    (v_community_id, v_security_officer_user_id, (SELECT id FROM gates WHERE tenant_id = v_community_id AND name = 'Main Gate' LIMIT 1), CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '1 day', 'completed', 'Normal shift - no incidents'),

    -- Future shifts
    (v_community_id, v_security_officer_user_id, (SELECT id FROM gates WHERE tenant_id = v_community_id AND name = 'Main Gate' LIMIT 1), CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '2 days', 'active', 'Scheduled day shift')
  ON CONFLICT DO NOTHING;

  -- =========================================
  -- CREATE GATE ENTRIES
  -- =========================================

  INSERT INTO gate_entries (
    tenant_id, gate_id, entry_timestamp, entry_type, vehicle_plate,
    sticker_id, household_id, security_officer_id, notes, created_at
  ) VALUES
    -- Recent resident entry
    (v_community_id, (SELECT id FROM gates WHERE tenant_id = v_community_id AND name = 'Main Gate' LIMIT 1), NOW() - INTERVAL '30 minutes', 'vehicle', 'ABC 123', (SELECT id FROM vehicle_stickers WHERE tenant_id = v_community_id AND vehicle_plate = 'ABC 123' LIMIT 1), (SELECT id FROM households WHERE tenant_id = v_community_id AND contact_email = 'cruz.family@email.com' LIMIT 1), v_security_officer_user_id, 'Resident entry - Antonio Cruz', NOW() - INTERVAL '30 minutes'),

    -- Visitor entry
    (v_community_id, (SELECT id FROM gates WHERE tenant_id = v_community_id AND name = 'Main Gate' LIMIT 1), NOW() - INTERVAL '2 hours', 'visitor', NULL, NULL, (SELECT id FROM households WHERE tenant_id = v_community_id AND contact_email = 'santos.family@email.com' LIMIT 1), v_security_officer_user_id, 'Visitor - John Doe visiting Santos Family', NOW() - INTERVAL '2 hours'),

    -- Delivery entry
    (v_community_id, (SELECT id FROM gates WHERE tenant_id = v_community_id AND name = 'Main Gate' LIMIT 1), NOW() - INTERVAL '4 hours', 'delivery', NULL, NULL, NULL, v_security_officer_user_id, 'LBC Express delivery', NOW() - INTERVAL '4 hours')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'HOA Admin seed data created successfully!';
  RAISE NOTICE 'HOA Admin login credentials:';
  RAISE NOTICE '  Admin Head: admin.head@greenvalley.com / AdminHead123!';
  RAISE NOTICE '  Admin Officer: admin.officer@greenvalley.com / AdminOfficer123!';
  RAISE NOTICE '  Security Officer: security.officer@greenvalley.com / Security123!';
  RAISE NOTICE 'Created households: %, Members: %, Vehicle stickers: %',
    ARRAY_LENGTH(v_household_ids, 1),
    (SELECT COUNT(*) FROM household_members WHERE tenant_id = v_community_id),
    (SELECT COUNT(*) FROM vehicle_stickers WHERE tenant_id = v_community_id);
END $$;