-- Fix: Handle NULL values in auth.users email_change column
-- This migration addresses the "converting NULL to string is unsupported" error
-- that occurs when the GoTrue auth service tries to scan the email_change column

-- First, check if the email_change column exists and update NULL values
DO $$
BEGIN
    -- Check if the email_change column exists in auth.users
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'auth'
        AND table_name = 'users'
        AND column_name = 'email_change'
    ) THEN
        -- Update NULL values to empty string to fix the scanning error
        UPDATE auth.users
        SET email_change = ''
        WHERE email_change IS NULL;

        RAISE NOTICE 'Fixed NULL values in auth.users.email_change column';
    ELSE
        RAISE NOTICE 'email_change column does not exist in auth.users table';
    END IF;
END $$;

-- Also check if there are any other problematic columns with NULL values
DO $$
BEGIN
    -- Check for other columns that might have similar issues
    -- These are common columns in auth.users that might cause scanning errors
    DECLARE
        column_names TEXT[] := ARRAY[
            'phone_change',
            'new_phone',
            'password_challenge_at',
            'recovery_token',
            'email_confirmationToken',
            'phone_confirmationToken'
        ];
        col_name TEXT;
    BEGIN
        FOREACH col_name IN ARRAY column_names
        LOOP
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'auth'
                AND table_name = 'users'
                AND column_name = col_name
            ) THEN
                EXECUTE format('UPDATE auth.users SET %I = '''' WHERE %I IS NULL', col_name, col_name);
                RAISE NOTICE 'Fixed NULL values in auth.users.% column', col_name;
            END IF;
        END LOOP;
    END;
END $$;