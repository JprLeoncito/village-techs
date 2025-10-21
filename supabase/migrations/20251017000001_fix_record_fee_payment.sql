-- Fix the record_fee_payment function to properly handle tenant_id comparison
-- The issue is that tenant_id::TEXT comparison might not work correctly

-- Drop the existing function
DROP FUNCTION IF EXISTS record_fee_payment(UUID, DECIMAL(10,2), DATE, TEXT);

-- Create the corrected function
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
BEGIN
  -- Get tenant_id as UUID instead of TEXT
  v_tenant_id := (auth.jwt() ->> 'tenant_id')::UUID;

  -- Find the fee using UUID comparison for tenant_id
  SELECT * INTO v_fee FROM association_fees
  WHERE id = p_fee_id AND tenant_id = v_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fee not found: %', p_fee_id;
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
    'fee_id', p_fee_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION record_fee_payment IS 'Records payment for association fees with proper tenant_id UUID comparison';