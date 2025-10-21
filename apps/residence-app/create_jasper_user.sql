-- Create jasper.leoncito@988labs.com user account and household member record
-- This script fixes the "household not found" issue

-- Step 1: Create the user account in auth.users
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'jasper-user-id-' || gen_random_uuid(),
    'authenticated',
    'authenticated',
    'jasper.leoncito@988labs.com',
    '$2a$10$placeholder_hash_to_be_updated', -- This will be updated by Supabase
    NOW(),
    '{"first_name": "Jasper", "last_name": "Leoncito", "household_id": "7014fb94-d9bf-494c-b4a4-2bf228b80f2b"}',
    '{"household_id": "7014fb94-d9bf-494c-b4a4-2bf228b80f2b", "tenant_id": "b0edfe19-8dea-419a-8be1-7b78d80b378a", "role": "resident"}',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Step 2: Create household member record (this will link to the user we just created)
-- First get the user ID we just created
DO $$
DECLARE
    jasper_user_id UUID;
BEGIN
    SELECT id INTO jasper_user_id
    FROM auth.users
    WHERE email = 'jasper.leoncito@988labs.com';

    IF jasper_user_id IS NOT NULL THEN
        INSERT INTO household_members (
            id,
            tenant_id,
            household_id,
            user_id,
            first_name,
            last_name,
            relationship_to_head,
            contact_email,
            member_type,
            status,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'b0edfe19-8dea-419a-8be1-7b78d80b378a',
            '7014fb94-d9bf-494c-b4a4-2bf228b80f2b',
            jasper_user_id,
            'Jasper',
            'Leoncito',
            'self',
            'jasper.leoncito@988labs.com',
            'resident',
            'active',
            NOW(),
            NOW()
        ) ON CONFLICT (user_id) DO UPDATE SET
            contact_email = EXCLUDED.contact_email,
            updated_at = NOW();

        RAISE NOTICE '✅ Created household member for jasper.leoncito@988labs.com with user_id: %', jasper_user_id;
    ELSE
        RAISE NOTICE '❌ User jasper.leoncito@988labs.com not found';
    END IF;
END $$;

-- Step 3: Verify the records
SELECT
    u.id as user_id,
    u.email,
    u.raw_user_meta_data,
    hm.id as member_id,
    hm.household_id,
    hm.tenant_id,
    hm.first_name,
    hm.last_name,
    hm.contact_email
FROM auth.users u
LEFT JOIN household_members hm ON u.id = hm.user_id
WHERE u.email = 'jasper.leoncito@988labs.com';