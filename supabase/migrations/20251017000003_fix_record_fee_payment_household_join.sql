-- Fix record_fee_payment function to properly handle household-tenant relationship
-- The function should find fees by joining through households to verify tenant access
-- This fixes the issue where existing fees couldn't be found due to incorrect tenant filtering

-- Drop the existing function
DROP FUNCTION IF EXISTS record_fee_payment(UUID, DECIMAL(10,2), DATE, TEXT);

-- Create the function with proper household-tenant JOIN logic
CREATE OR REPLACE FUNCTION record_fee_payment(
  p_fee_id UUID,
  p_amount DECIMAL(10,2),
  p_payment_date DATE,
  p_payment_method TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_fee RECORD;
  v_new_status TEXT;
  v_debug_info JSONB;
BEGIN
  -- Get tenant_id as UUID
  v_tenant_id := (auth.jwt() ->> 'tenant_id')::UUID;

  -- Create debug info
  v_debug_info := jsonb_build_object(
    'p_fee_id', p_fee_id,
    'v_tenant_id', v_tenant_id,
    'auth_uid', auth.uid()
  );

  -- Log debug info
  RAISE NOTICE 'DEBUG: Searching for fee with ID % and tenant_id % (through household relationship)', p_fee_id, v_tenant_id;

  -- Find the fee using proper household-tenant relationship JOIN
  SELECT f.* INTO v_fee FROM association_fees f
  JOIN households h ON f.household_id = h.id
  WHERE f.id = p_fee_id AND h.tenant_id = v_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Let's check if the fee exists at all (without tenant filter)
    DECLARE
      v_fee_any_tenant RECORD;
      v_fee_household RECORD;
    BEGIN
      -- Check if fee exists regardless of tenant
      SELECT * INTO v_fee_any_tenant FROM association_fees WHERE id = p_fee_id;

      IF v_fee_any_tenant IS NOT NULL THEN
        -- Get household info for this fee
        SELECT h.*, c.name as community_name INTO v_fee_household
        FROM households h
        JOIN communities c ON h.tenant_id = c.id
        WHERE h.id = v_fee_any_tenant.household_id;

        RAISE EXCEPTION 'Fee found but tenant mismatch. Fee ID: %, Fee household_id: %, Fee household tenant_id: %, User tenant_id: %. Debug info: %',
          p_fee_id, v_fee_any_tenant.household_id, v_fee_household.tenant_id, v_tenant_id, v_debug_info;
      ELSE
        RAISE EXCEPTION 'Fee not found in any tenant: %', p_fee_id;
      END IF;
    END;
  END IF;

  -- Calculate new status
  IF v_fee.paid_amount + p_amount >= v_fee.amount THEN
    v_new_status := 'paid';
  ELSE
    v_new_status := 'partial';
  END IF;

  -- Update the fee
  UPDATE association_fees
  SET
    paid_amount = paid_amount + p_amount,
    payment_status = v_new_status,
    payment_date = p_payment_date,
    payment_method = p_payment_method,
    recorded_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_fee_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'new_status', v_new_status,
    'total_paid', v_fee.paid_amount + p_amount,
    'fee_id', p_fee_id,
    'household_id', v_fee.household_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION record_fee_payment IS 'Records payment for association fees with proper household-tenant relationship JOIN to verify tenant access';