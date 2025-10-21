-- =========================================
-- COMPREHENSIVE RESIDENT APP SEED DATA
-- Feature 003: Household Management Mobile App
-- =========================================
-- This file creates comprehensive test data for the resident mobile app
-- including resident users, household management, guests, and mobile-specific features

-- Get the primary community ID for resident app testing
DO $$
DECLARE
  v_community_id UUID;
  v_residence_id UUID;
  v_household_id UUID;
  v_household_head_id UUID;
  v_resident_user_id UUID := '33333333-3333-3333-3333-333333333333';
  v_spouse_user_id UUID := '44444444-4444-4444-4444-444444444444';
  v_gate_id UUID;
BEGIN
  -- Get Green Valley Estates community
  SELECT id INTO v_community_id FROM communities WHERE name = 'Green Valley Estates' LIMIT 1;

  IF v_community_id IS NULL THEN
    RAISE EXCEPTION 'Green Valley Estates community not found. Please run seed.sql and hoa_admin_seed.sql first.';
  END IF;

  RAISE NOTICE 'Using community ID: %', v_community_id;

  -- Get a residence for the resident user
  SELECT id INTO v_residence_id FROM residences WHERE tenant_id = v_community_id AND unit_number = 'A-101' LIMIT 1;

  IF v_residence_id IS NULL THEN
    -- Create a specific residence for resident testing if not found
    INSERT INTO residences (tenant_id, unit_number, type, max_occupancy, floor_area)
    VALUES (v_community_id, 'RES-001', 'condo', 4, 120.0)
    ON CONFLICT (tenant_id, unit_number) DO NOTHING
    RETURNING id INTO v_residence_id;

    IF v_residence_id IS NULL THEN
      SELECT id INTO v_residence_id FROM residences WHERE tenant_id = v_community_id AND unit_number = 'RES-001' LIMIT 1;
    END IF;
  END IF;

  -- Get main gate ID for gate entries
  SELECT id INTO v_gate_id FROM gates WHERE tenant_id = v_community_id AND name = 'Main Gate' LIMIT 1;

  -- =========================================
  -- CREATE RESIDENT USERS WITH AUTHENTICATION
  -- =========================================

  -- Primary resident user (household head)
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
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_resident_user_id,
    'authenticated',
    'authenticated',
    'resident.cruz@greenvalley.com',
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
      'first_name', 'Antonio',
      'last_name', 'Cruz',
      'full_name', 'Antonio Cruz',
      'phone_number', '+63 917 555 1234',
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
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

  -- Spouse user (secondary resident)
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
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_spouse_user_id,
    'authenticated',
    'authenticated',
    'maria.cruz@greenvalley.com',
    crypt('Spouse123!', gen_salt('bf')),
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
      'first_name', 'Maria',
      'last_name', 'Cruz',
      'full_name', 'Maria Cruz',
      'phone_number', '+63 917 555 1235',
      'notification_preferences', jsonb_build_object(
        'email', true,
        'push', true,
        'sms', true,
        'announcements', true,
        'fees', false,
        'guests', true,
        'security', false
      )
    ),
    false,
    ''
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

  -- =========================================
  -- CREATE HOUSEHOLD
  -- =========================================

  -- Create household for the resident users
  INSERT INTO households (
    id,
    tenant_id,
    residence_id,
    move_in_date,
    status,
    contact_email,
    contact_phone,
    notes,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_community_id,
    v_residence_id,
    '2023-01-15',
    'active',
    'resident.cruz@greenvalley.com',
    '+63 917 555 1234',
    'Has elderly parent living with them (Elena Cruz +63 917 555 9999), wheelchair accessible',
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_household_id;

  -- If household already exists, get its ID
  IF v_household_id IS NULL THEN
    SELECT id INTO v_household_id
    FROM households
    WHERE residence_id = v_residence_id AND status = 'active'
    LIMIT 1;
  END IF;

  -- =========================================
  -- CREATE HOUSEHOLD MEMBERS
  -- =========================================

  -- Create household head (primary resident)
  INSERT INTO household_members (
    id,
    tenant_id,
    household_id,
    user_id,
    first_name,
    last_name,
    relationship_to_head,
    date_of_birth,
    contact_email,
    contact_phone,
    member_type,
    status,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_community_id,
    v_household_id,
    v_resident_user_id,
    'Antonio',
    'Cruz',
    'self',
    '1985-05-15',
    'resident.cruz@greenvalley.com',
    '+63 917 555 1234',
    'resident',
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_household_head_id;

  -- Update user metadata with household_id
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('household_id', v_household_id::text)
  WHERE id = v_resident_user_id;

  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('household_id', v_household_id::text)
  WHERE id = v_spouse_user_id;

  -- Create spouse
  INSERT INTO household_members (
    tenant_id,
    household_id,
    user_id,
    first_name,
    last_name,
    relationship_to_head,
    date_of_birth,
    contact_email,
    contact_phone,
    member_type,
    status
  )
  VALUES (
    v_community_id,
    v_household_id,
    v_spouse_user_id,
    'Maria',
    'Cruz',
    'spouse',
    '1987-08-20',
    'maria.cruz@greenvalley.com',
    '+63 917 555 1235',
    'resident',
    'active'
  )
  ON CONFLICT DO NOTHING;

  -- Create children
  INSERT INTO household_members (
    tenant_id,
    household_id,
    first_name,
    last_name,
    relationship_to_head,
    date_of_birth,
    member_type,
    status
  )
  VALUES
    (v_community_id, v_household_id, 'Miguel', 'Cruz', 'child', '2015-03-10', 'resident', 'active'),
    (v_community_id, v_household_id, 'Sofia', 'Cruz', 'child', '2018-07-22', 'resident', 'active')
  ON CONFLICT DO NOTHING;

  -- Create elderly parent
  INSERT INTO household_members (
    tenant_id,
    household_id,
    first_name,
    last_name,
    relationship_to_head,
    date_of_birth,
    contact_phone,
    member_type,
    status
  )
  VALUES (
    v_community_id, v_household_id, 'Elena', 'Cruz', 'parent', '1955-11-30', '+63 917 555 9999', 'resident', 'active'
  )
  ON CONFLICT DO NOTHING;

  -- Update household with household_head_id
  UPDATE households SET household_head_id = v_household_head_id WHERE id = v_household_id;

  -- =========================================
  -- CREATE VEHICLE STICKERS
  -- =========================================

  -- Active sticker 1 - Primary vehicle
  INSERT INTO vehicle_stickers (
    tenant_id,
    household_id,
    member_id,
    vehicle_plate,
    vehicle_make,
    vehicle_model,
    vehicle_color,
    rfid_code,
    status,
    expiry_date,
    approved_at,
    approved_by,
    created_at
  )
  VALUES (
    v_community_id,
    v_household_id,
    v_household_head_id,
    'ABC 1234',
    'Toyota',
    'Camry',
    'Silver',
    'RFID001',
    'active',
    CURRENT_DATE + INTERVAL '6 months',
    NOW() - INTERVAL '1 month',
    (SELECT id FROM admin_users WHERE tenant_id = v_community_id AND role = 'admin_officer' LIMIT 1),
    NOW() - INTERVAL '2 months'
  )
  ON CONFLICT DO NOTHING;

  -- Active sticker 2 - Secondary vehicle
  INSERT INTO vehicle_stickers (
    tenant_id,
    household_id,
    member_id,
    vehicle_plate,
    vehicle_make,
    vehicle_model,
    vehicle_color,
    rfid_code,
    status,
    expiry_date,
    approved_at,
    approved_by,
    created_at
  )
  VALUES (
    v_community_id,
    v_household_id,
    v_household_head_id,
    'XYZ 5678',
    'Honda',
    'CR-V',
    'White',
    'RFID002',
    'active',
    CURRENT_DATE + INTERVAL '1 year',
    NOW() - INTERVAL '2 weeks',
    (SELECT id FROM admin_users WHERE tenant_id = v_community_id AND role = 'admin_officer' LIMIT 1),
    NOW() - INTERVAL '1 month'
  )
  ON CONFLICT DO NOTHING;

  -- Expiring soon sticker
  INSERT INTO vehicle_stickers (
    tenant_id,
    household_id,
    member_id,
    vehicle_plate,
    vehicle_make,
    vehicle_model,
    vehicle_color,
    status,
    expiry_date,
    approved_at,
    approved_by
  )
  VALUES (
    v_community_id,
    v_household_id,
    v_household_head_id,
    'DEF 9012',
    'Mitsubishi',
    'Montero',
    'Black',
    'expiring',
    CURRENT_DATE + INTERVAL '30 days',
    NOW() - INTERVAL '11 months',
    (SELECT id FROM admin_users WHERE tenant_id = v_community_id AND role = 'admin_officer' LIMIT 1)
  )
  ON CONFLICT DO NOTHING;

  -- =========================================
  -- CREATE SCHEDULED GUESTS
  -- =========================================

  -- Upcoming guests
  INSERT INTO scheduled_guests (
    tenant_id,
    household_id,
    guest_name,
    guest_phone,
    vehicle_plate,
    purpose,
    visit_type,
    arrival_date,
    departure_date,
    pass_id,
    status,
    notes,
    created_at
  )
  VALUES
    -- Guest for today
    (v_community_id, v_household_id, 'John Smith', '+63 917 888 9999', NULL, 'Business meeting', 'day_trip', NOW() + INTERVAL '2 hours', NOW() + INTERVAL '6 hours', 'PASS001', 'scheduled', 'Visitor from office', NOW()),

    -- Guest for tomorrow
    (v_community_id, v_household_id, 'Sarah Johnson', '+63 917 777 8888', NULL, 'Family dinner', 'day_trip', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '4 hours', 'PASS002', 'scheduled', 'College friend visiting', NOW() - INTERVAL '1 day'),

    -- Multi-day guest
    (v_community_id, v_household_id, 'Roberto Reyes', '+63 917 666 7777', 'XYZ 999', 'Family visit', 'multi_day', NOW() + INTERVAL '3 days', NOW() + INTERVAL '5 days', 'PASS003', 'scheduled', 'Relative from province staying for weekend', NOW() - INTERVAL '2 days'),

    -- Recurring guest (helper)
    (v_community_id, v_household_id, 'Liza Santos', '+63 917 555 6666', NULL, 'Cleaning service', 'day_trip', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '8 hours', 'PASS004', 'scheduled', 'Regular cleaning helper - every Monday', NOW() - INTERVAL '1 week'),

    -- Checked in guest today
    (v_community_id, v_household_id, 'Michael Chen', '+63 917 444 5555', 'ABC 777', 'Project discussion', 'day_trip', NOW() - INTERVAL '3 hours', NOW() + INTERVAL '5 hours', 'PASS005', 'checked_in', 'Checked in at main gate', NOW() - INTERVAL '4 hours'),

    -- Checked out guest
    (v_community_id, v_household_id, 'Ana Martinez', '+63 917 333 4444', NULL, 'Yoga class', 'day_trip', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '3 hours', 'PASS006', 'checked_out', 'Visit completed yesterday', NOW() - INTERVAL '2 days')
  ON CONFLICT DO NOTHING;

  -- =========================================
  -- CREATE ASSOCIATION FEES
  -- =========================================

  -- Unpaid current month fee
  INSERT INTO association_fees (
    tenant_id,
    household_id,
    fee_type,
    amount,
    due_date,
    payment_status,
    created_at
  )
  VALUES (
    v_community_id,
    v_household_id,
    'monthly',
    2500.00,
    CURRENT_DATE + INTERVAL '15 days',
    'unpaid',
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Overdue fee
  INSERT INTO association_fees (
    tenant_id,
    household_id,
    fee_type,
    amount,
    due_date,
    payment_status,
    created_at
  )
  VALUES (
    v_community_id,
    v_household_id,
    'monthly',
    2750.00, -- includes 250 late fee
    CURRENT_DATE - INTERVAL '10 days',
    'overdue',
    NOW() - INTERVAL '1 month'
  )
  ON CONFLICT DO NOTHING;

  -- Paid fee
  INSERT INTO association_fees (
    tenant_id,
    household_id,
    fee_type,
    amount,
    paid_amount,
    due_date,
    payment_status,
    payment_date,
    payment_method,
    created_at
  )
  VALUES (
    v_community_id,
    v_household_id,
    'monthly',
    2500.00,
    2500.00,
    CURRENT_DATE - INTERVAL '1 month',
    'paid',
    CURRENT_DATE - INTERVAL '25 days',
    'online',
    NOW() - INTERVAL '2 months'
  )
  ON CONFLICT DO NOTHING;

  -- Special assessment
  INSERT INTO association_fees (
    tenant_id,
    household_id,
    fee_type,
    amount,
    due_date,
    payment_status,
    notes,
    created_at
  )
  VALUES (
    v_community_id,
    v_household_id,
    'special_assessment',
    5000.00,
    CURRENT_DATE + INTERVAL '1 month',
    'unpaid',
    'Road repair and drainage improvement project',
    NOW() - INTERVAL '2 weeks'
  )
  ON CONFLICT DO NOTHING;

  -- =========================================
  -- CREATE CONSTRUCTION PERMIT
  -- =========================================

  INSERT INTO construction_permits (
    tenant_id,
    household_id,
    project_description,
    project_start_date,
    project_end_date,
    contractor_name,
    contractor_contact,
    contractor_license,
    road_fee_amount,
    road_fee_paid,
    status,
    approved_by,
    approved_at,
    notes,
    created_at
  )
  VALUES (
    v_community_id,
    v_household_id,
    'Kitchen renovation and cabinet installation',
    CURRENT_DATE + INTERVAL '2 weeks',
    CURRENT_DATE + INTERVAL '1 month',
    'ABC Home Builders',
    '+63 917 222 3333',
    'PCAB-12345',
    5000.00,
    false,
    'pending',
    NULL,
    NULL,
    'Complete kitchen makeover with new cabinets and countertops',
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- =========================================
  -- CREATE DELIVERIES (Security Sentinel)
  -- =========================================

  -- Pending delivery
  INSERT INTO deliveries (
    tenant_id,
    household_id,
    tracking_number,
    delivery_company,
    delivery_person_name,
    delivery_person_contact,
    recipient_name,
    household_name,
    unit_number,
    delivery_type,
    status,
    photos,
    security_officer_id,
    security_officer_name,
    created_at
  )
  VALUES (
    v_community_id,
    v_household_id,
    'LBC123456789',
    'LBC Express',
    'Juan Dela Cruz',
    '+63 917 999 8888',
    'Antonio Cruz',
    'Cruz Family',
    'A-101',
    'package',
    'pending',
    ARRAY['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
    (SELECT id FROM admin_users WHERE tenant_id = v_community_id AND role = 'security' LIMIT 1),
    'Juan Cruz',
    NOW() - INTERVAL '2 hours'
  )
  ON CONFLICT DO NOTHING;

  -- Received delivery
  INSERT INTO deliveries (
    tenant_id,
    household_id,
    tracking_number,
    delivery_company,
    delivery_person_name,
    delivery_person_contact,
    recipient_name,
    household_name,
    unit_number,
    delivery_type,
    status,
    handoff_timestamp,
    handoff_notes,
    handoff_photos,
    security_officer_id,
    security_officer_name,
    created_at
  )
  VALUES (
    v_community_id,
    v_household_id,
    'JT987654321',
    'J&T Express',
    'Maria Santos',
    '+63 917 888 7777',
    'Maria Cruz',
    'Cruz Family',
    'A-101',
    'document',
    'handed_off',
    NOW() - INTERVAL '1 day',
    'Document received by Maria Cruz',
    ARRAY['https://example.com/handoff1.jpg'],
    (SELECT id FROM admin_users WHERE tenant_id = v_community_id AND role = 'security' LIMIT 1),
    'Juan Cruz',
    NOW() - INTERVAL '1 day'
  )
  ON CONFLICT DO NOTHING;

  -- =========================================
  -- CREATE GUEST ACCESS LOGS (Security Sentinel)
  -- =========================================

  -- Get a scheduled guest to create access log for
  INSERT INTO guest_access_logs (
    guest_id,
    tenant_id,
    household_id,
    check_in_timestamp,
    security_officer_id,
    verification_method,
    verification_notes,
    verification_photos,
    created_at
  )
  SELECT
    sg.id,
    sg.tenant_id,
    sg.household_id,
    NOW() - INTERVAL '3 hours',
    (SELECT id FROM admin_users WHERE tenant_id = v_community_id AND role = 'security' LIMIT 1),
    'phone',
    'Verified by phone call with Antonio Cruz',
    ARRAY['https://example.com/guest1.jpg'],
    NOW()
  FROM scheduled_guests sg
  WHERE sg.tenant_id = v_community_id
    AND sg.household_id = v_household_id
    AND sg.guest_name = 'Michael Chen'
    AND sg.status = 'checked_in'
  LIMIT 1
  ON CONFLICT DO NOTHING;

  -- =========================================
  -- CREATE ANNOUNCEMENTS RESIDENT CAN SEE
  -- =========================================

  -- Resident-created announcement
  INSERT INTO announcements (
    tenant_id,
    created_by,
    announcement_type,
    title,
    content,
    target_audience,
    status,
    publication_date,
    published_at,
    created_at
  )
  VALUES (
    v_community_id,
    v_resident_user_id,
    'general',
    'Lost Cat - Please Help',
    'Our orange tabby cat named "Mango" has been missing since yesterday. He''s friendly and wearing a blue collar. Please contact us if you see him. Reward offered!',
    'households',
    'published',
    NOW(),
    NOW(),
    NOW() - INTERVAL '6 hours'
  )
  ON CONFLICT DO NOTHING;

  -- =========================================
  -- CREATE INCIDENT REPORT BY RESIDENT
  -- =========================================

  INSERT INTO incident_reports (
    tenant_id,
    reported_by,
    incident_timestamp,
    incident_type,
    location,
    description,
    resolution_status,
    created_at
  )
  VALUES (
    v_community_id,
    v_resident_user_id,
    CURRENT_DATE - INTERVAL '12 hours',
    'property_damage',
    'Parking Area A - Near Unit A-101',
    'Bicycle was stolen from the parking area between 8 PM and 10 PM. Black mountain bike with red handlebars.',
    'investigating',
    NOW() - INTERVAL '12 hours'
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Resident app seed data created successfully';
  RAISE NOTICE 'Primary Resident: resident.cruz@greenvalley.com';
  RAISE NOTICE 'Spouse: maria.cruz@greenvalley.com';
  RAISE NOTICE 'Household created successfully';
END $$;