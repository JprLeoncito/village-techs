-- Sentinel Security App Database Schema
-- Initial migration for all required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security Officers Table
CREATE TABLE IF NOT EXISTS security_officers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    employee_id VARCHAR(100),
    role VARCHAR(50) DEFAULT 'officer', -- officer, head, admin
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Households Table
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    residence_number VARCHAR(50) NOT NULL,
    member_names TEXT[] DEFAULT '{}',
    contact_number VARCHAR(50),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, residence_number)
);

-- Gates Table
CREATE TABLE IF NOT EXISTS gates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Security Shifts Table
CREATE TABLE IF NOT EXISTS security_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    officer_id UUID NOT NULL REFERENCES security_officers(id) ON DELETE CASCADE,
    gate_id UUID NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
    shift_start TIMESTAMP WITH TIME ZONE NOT NULL,
    shift_end TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicle Stickers Table
CREATE TABLE IF NOT EXISTS stickers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    vehicle_plate VARCHAR(20) NOT NULL,
    rfid_code VARCHAR(255) UNIQUE,
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_color VARCHAR(50),
    member_names TEXT[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active', -- active, expired, lost, damaged
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, vehicle_plate)
);

-- Gate Entries Table
CREATE TABLE IF NOT EXISTS gate_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    gate_id UUID NOT NULL REFERENCES gates(id),
    entry_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    exit_timestamp TIMESTAMP WITH TIME ZONE,
    direction VARCHAR(10) NOT NULL, -- in, out
    entry_type VARCHAR(20) NOT NULL, -- resident, guest, delivery, construction, visitor
    vehicle_plate VARCHAR(20),
    rfid_code VARCHAR(255),
    household_name VARCHAR(255),
    visitor_name VARCHAR(255),
    contact_number VARCHAR(50),
    purpose TEXT,
    photos TEXT[] DEFAULT '{}',
    notes TEXT,
    security_officer_id UUID REFERENCES security_officers(id),
    security_officer_name VARCHAR(255),
    linked_entry_id UUID REFERENCES gate_entries(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guests Table
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households(id),
    household_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    purpose TEXT NOT NULL,
    expected_arrival TIMESTAMP WITH TIME ZONE,
    expected_departure TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, checked_in, checked_out, expired, rejected
    qr_code VARCHAR(255) UNIQUE,
    notes TEXT,
    host_name VARCHAR(255),
    verification_photos TEXT[] DEFAULT '{}',
    verified_by UUID REFERENCES security_officers(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES security_officers(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    is_walk_in BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guest Access Logs Table
CREATE TABLE IF NOT EXISTS guest_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households(id),
    check_in_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out_timestamp TIMESTAMP WITH TIME ZONE,
    security_officer_id UUID REFERENCES security_officers(id),
    verification_method VARCHAR(50), -- manual, phone, qr, walk_in
    verification_notes TEXT,
    verification_photos TEXT[] DEFAULT '{}',
    departure_notes TEXT,
    departure_photos TEXT[] DEFAULT '{}',
    checkout_officer_id UUID REFERENCES security_officers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deliveries Table
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tracking_number VARCHAR(255),
    delivery_company VARCHAR(255) NOT NULL,
    delivery_person_name VARCHAR(255) NOT NULL,
    delivery_person_contact VARCHAR(50) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    household_id UUID NOT NULL REFERENCES households(id),
    household_name VARCHAR(255) NOT NULL,
    unit_number VARCHAR(20),
    delivery_type VARCHAR(20) NOT NULL, -- package, food, document, furniture, other
    status VARCHAR(20) DEFAULT 'pending', -- pending, at_gate, handed_off, picked_up, returned
    special_instructions TEXT,
    photos TEXT[] DEFAULT '{}',
    notes TEXT,
    gate_entry_id UUID REFERENCES gate_entries(id),
    security_officer_id UUID REFERENCES security_officers(id),
    security_officer_name VARCHAR(255),

    -- Handoff information
    recipient_contact VARCHAR(50),
    recipient_relationship VARCHAR(100),
    handoff_timestamp TIMESTAMP WITH TIME ZONE,
    handoff_notes TEXT,
    handoff_photos TEXT[] DEFAULT '{}',

    -- Return information
    return_reason TEXT,
    return_timestamp TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_security_officers_tenant_id ON security_officers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_households_tenant_id ON households(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stickers_tenant_id ON stickers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stickers_rfid_code ON stickers(rfid_code);
CREATE INDEX IF NOT EXISTS idx_stickers_vehicle_plate ON stickers(vehicle_plate);
CREATE INDEX IF NOT EXISTS idx_gate_entries_tenant_id ON gate_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gate_entries_entry_timestamp ON gate_entries(entry_timestamp);
CREATE INDEX IF NOT EXISTS idx_gate_entries_vehicle_plate ON gate_entries(vehicle_plate);
CREATE INDEX IF NOT EXISTS idx_gate_entries_direction ON gate_entries(direction);
CREATE INDEX IF NOT EXISTS idx_guests_tenant_id ON guests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guests_household_id ON guests(household_id);
CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status);
CREATE INDEX IF NOT EXISTS idx_guests_contact_number ON guests(contact_number);
CREATE INDEX IF NOT EXISTS idx_guest_access_logs_guest_id ON guest_access_logs(guest_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_tenant_id ON deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_household_id ON deliveries(household_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_tracking_number ON deliveries(tracking_number);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_company ON deliveries(delivery_company);
CREATE INDEX IF NOT EXISTS idx_security_shifts_officer_id ON security_shifts(officer_id);
CREATE INDEX IF NOT EXISTS idx_security_shifts_status ON security_shifts(status);

-- RLS (Row Level Security) Policies
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (you'll need to customize these based on your security requirements)

-- Tenants: Only accessible by authenticated users from the same tenant
CREATE POLICY "Users can view own tenant" ON tenants FOR SELECT USING (id = auth.jwt() ->> 'tenant_id');
CREATE POLICY "Users can update own tenant" ON tenants FOR UPDATE USING (id = auth.jwt() ->> 'tenant_id');

-- Security Officers: Officers can view/update their own info, heads can view all from their tenant
CREATE POLICY "Officers can view own profile" ON security_officers FOR SELECT USING (id = auth.jwt() ->> 'user_id' OR tenant_id = auth.jwt() ->> 'tenant_id');
CREATE POLICY "Officers can update own profile" ON security_officers FOR UPDATE USING (id = auth.jwt() ->> 'user_id');

-- Households: Viewable by all users in the same tenant
CREATE POLICY "Users can view households in tenant" ON households FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');
CREATE POLICY "Officers can update households in tenant" ON households FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id');

-- Gates: Viewable by all users in the same tenant
CREATE POLICY "Users can view gates in tenant" ON gates FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');

-- Security Shifts: Officers can view their own shifts, heads can view all in tenant
CREATE POLICY "Officers can view own shifts" ON security_shifts FOR SELECT USING (officer_id = auth.jwt() ->> 'user_id' OR tenant_id = auth.jwt() ->> 'tenant_id');
CREATE POLICY "Officers can create shifts in tenant" ON security_shifts FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id');
CREATE POLICY "Officers can update own shifts" ON security_shifts FOR UPDATE USING (officer_id = auth.jwt() ->> 'user_id');

-- Stickers: Viewable by all users in the same tenant
CREATE POLICY "Users can view stickers in tenant" ON stickers FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');
CREATE POLICY "Officers can manage stickers in tenant" ON stickers FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id');

-- Gate Entries: Viewable by all users in the same tenant
CREATE POLICY "Users can view gate entries in tenant" ON gate_entries FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');
CREATE POLICY "Officers can create gate entries in tenant" ON gate_entries FOR INSERT WITH CHECK (tenant_id = auth.jwt() ->> 'tenant_id');
CREATE POLICY "Officers can update gate entries in tenant" ON gate_entries FOR UPDATE USING (tenant_id = auth.jwt() ->> 'tenant_id');

-- Guests: Viewable by all users in the same tenant
CREATE POLICY "Users can view guests in tenant" ON guests FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');
CREATE POLICY "Officers can manage guests in tenant" ON guests FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id');

-- Guest Access Logs: Viewable by all users in the same tenant
CREATE POLICY "Users can view guest access logs in tenant" ON guest_access_logs FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');
CREATE POLICY "Officers can manage guest access logs in tenant" ON guest_access_logs FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id');

-- Deliveries: Viewable by all users in the same tenant
CREATE POLICY "Users can view deliveries in tenant" ON deliveries FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');
CREATE POLICY "Officers can manage deliveries in tenant" ON deliveries FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id');

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_security_officers_updated_at BEFORE UPDATE ON security_officers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gates_updated_at BEFORE UPDATE ON gates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_security_shifts_updated_at BEFORE UPDATE ON security_shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stickers_updated_at BEFORE UPDATE ON stickers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gate_entries_updated_at BEFORE UPDATE ON gate_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_guest_access_logs_updated_at BEFORE UPDATE ON guest_access_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();