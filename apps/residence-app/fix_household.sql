-- SQL script to fix household member record for jasper.leoncito@988labs.com
-- First, let's find the user ID in auth.users
-- Then create the household member record
-- Finally update the user metadata

-- Step 1: Find the user ID (run this first)
SELECT id, email, user_metadata FROM auth.users WHERE email = 'jasper.leoncito@988labs.com';

-- Step 2: Create household member record (replace USER_ID with the actual ID from step 1)
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
    '821b03eb-3b83-4361-907f-63ddd87c3865',
    '93c3b576-16de-4188-9e11-d980369bccd3',
    'USER_ID_HERE', -- Replace with actual user ID
    'Jasper',
    'Leoncito',
    'self',
    'jasper.leoncito@988labs.com',
    'resident',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    household_id = EXCLUDED.household_id,
    contact_email = EXCLUDED.contact_email,
    updated_at = NOW();

-- Step 3: Update user metadata (replace USER_ID with the actual ID from step 1)
UPDATE auth.users
SET
    user_metadata = jsonb_set(
        jsonb_set(user_metadata, '{household_id}', '"93c3b576-16de-4188-9e11-d980369bccd3"'),
        '{first_name}', '"Jasper"'
    ),
    app_metadata = jsonb_set(
        jsonb_set(app_metadata, '{household_id}', '"93c3b576-16de-4188-9e11-d980369bccd3"'),
        '{tenant_id}', '"821b03eb-3b83-4361-907f-63ddd87c3865"'
    )
WHERE email = 'jasper.leoncito@988labs.com';

-- Step 4: Verify the fix
SELECT
    u.id,
    u.email,
    u.user_metadata,
    u.app_metadata,
    hm.id as member_id,
    hm.household_id,
    hm.tenant_id,
    hm.first_name,
    hm.last_name
FROM auth.users u
LEFT JOIN household_members hm ON u.id = hm.user_id
WHERE u.email = 'jasper.leoncito@988labs.com';