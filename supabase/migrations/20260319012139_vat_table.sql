-- ==========================================
-- 9. VAT RATES (NEW)
-- ==========================================

CREATE TABLE vat_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL, -- e.g., 'Standard VAT', 'Exempt'
    rate NUMERIC(5, 2) NOT NULL CHECK (rate >= 0), -- e.g., 12.00 for 12%
    is_active BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Trigger to automatically update the timestamp when an admin edits the VAT
CREATE TRIGGER update_vat_rates_updated_at
BEFORE UPDATE ON vat_rates
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Enable Row Level Security
ALTER TABLE vat_rates ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- VAT RLS POLICIES
-- ==========================================

-- 1. Users (and anyone logged in) can view the VAT rates
CREATE POLICY "Anyone can view VAT rates" 
ON vat_rates FOR SELECT TO authenticated USING (true);

-- 2. Admins can add, edit, and delete VAT rates
-- We use 'FOR ALL' here as a clean shortcut since Admins have full CRUD access
CREATE POLICY "Admins manage VAT rates" 
ON vat_rates FOR ALL TO authenticated USING (is_admin());
