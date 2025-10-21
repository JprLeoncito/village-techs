-- ===========================================
-- RLS POLICY TESTS
-- Village Tech - Multi-Tenant HOA Management
-- ===========================================

BEGIN;

-- Clean up any existing test data
DELETE FROM tenants WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
);

-- Create test tenants
INSERT INTO tenants (id, name, slug, status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Test Tenant A', 'tenant-a', 'active'),
    ('22222222-2222-2222-2222-222222222222', 'Test Tenant B', 'tenant-b', 'active');

-- Create test residences
INSERT INTO residences (id, tenant_id, unit_number) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'A-101'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'B-101');

\echo '=========================================='
\echo 'TEST 1: Tenant A user can only see Tenant A data'
\echo '=========================================='

-- Simulate user from Tenant A
SET LOCAL "request.jwt.claims" TO '{"tenant_id": "11111111-1111-1111-1111-111111111111", "role": "admin_head"}';

-- This should return only A-101
SELECT
    CASE
        WHEN COUNT(*) = 1 AND MAX(unit_number) = 'A-101'
        THEN 'PASS: Tenant isolation working correctly'
        ELSE 'FAIL: Expected 1 row (A-101), got ' || COUNT(*) || ' rows'
    END AS test_result
FROM residences;

\echo ''
\echo '=========================================='
\echo 'TEST 2: Superadmin can see all data'
\echo '=========================================='

-- Simulate superadmin user
SET LOCAL "request.jwt.claims" TO '{"role": "superadmin"}';

-- This should return both A-101 and B-101
SELECT
    CASE
        WHEN COUNT(*) = 2
        THEN 'PASS: Superadmin can see all tenants'
        ELSE 'FAIL: Expected 2 rows, got ' || COUNT(*) || ' rows'
    END AS test_result
FROM residences
ORDER BY unit_number;

\echo ''
\echo '=========================================='
\echo 'TEST 3: User without tenant_id cannot see data'
\echo '=========================================='

-- Simulate user without tenant_id
SET LOCAL "request.jwt.claims" TO '{"role": "household_head"}';

-- This should return 0 rows
SELECT
    CASE
        WHEN COUNT(*) = 0
        THEN 'PASS: User without tenant_id blocked correctly'
        ELSE 'FAIL: Expected 0 rows, got ' || COUNT(*) || ' rows'
    END AS test_result
FROM residences;

\echo ''
\echo '=========================================='
\echo 'TEST 4: Cross-tenant data access prevention'
\echo '=========================================='

-- Tenant A user tries to access data
SET LOCAL "request.jwt.claims" TO '{"tenant_id": "11111111-1111-1111-1111-111111111111", "role": "admin_head"}';

-- Should NOT see Tenant B's residence
SELECT
    CASE
        WHEN COUNT(*) = 0
        THEN 'PASS: Tenant A cannot see Tenant B data'
        ELSE 'FAIL: Tenant isolation breach! Tenant A saw Tenant B data'
    END AS test_result
FROM residences
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

\echo ''
\echo '=========================================='
\echo 'All RLS tests completed!'
\echo '=========================================='

-- Clean up
ROLLBACK;
