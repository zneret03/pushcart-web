CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE, -- Allows sub-categories
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(name, parent_id) 
);

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" 
ON categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage categories" 
ON categories FOR ALL TO authenticated USING (is_admin());

ALTER TABLE products 
ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE RESTRICT;

