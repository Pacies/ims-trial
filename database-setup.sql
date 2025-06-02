-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('admin', 'staff')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_passwords table with proper foreign key
CREATE TABLE IF NOT EXISTS user_passwords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_user_passwords_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create inventory_items table with user relations
CREATE TABLE IF NOT EXISTS inventory_items (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    sku VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'in-stock' CHECK (status IN ('in-stock', 'low-stock', 'out-of-stock')),
    image_url TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_inventory_items_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_inventory_items_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_inventory_price_positive CHECK (price >= 0),
    CONSTRAINT chk_inventory_stock_positive CHECK (stock >= 0)
);

-- Create raw_materials table with user relations
CREATE TABLE IF NOT EXISTS raw_materials (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'units',
    cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
    supplier VARCHAR(255),
    reorder_level INTEGER DEFAULT 10,
    sku VARCHAR(50) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'in-stock' CHECK (status IN ('in-stock', 'low-stock', 'out-of-stock')),
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_raw_materials_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_raw_materials_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_raw_materials_quantity_positive CHECK (quantity >= 0),
    CONSTRAINT chk_raw_materials_cost_positive CHECK (cost_per_unit >= 0),
    CONSTRAINT chk_raw_materials_reorder_positive CHECK (reorder_level >= 0)
);

-- Create fixed_prices table with user relations
CREATE TABLE IF NOT EXISTS fixed_prices (
    id BIGSERIAL PRIMARY KEY,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('raw_material', 'product')),
    category VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_fixed_prices_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_fixed_prices_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_fixed_prices_price_positive CHECK (price >= 0),
    CONSTRAINT uq_fixed_prices_item UNIQUE(item_type, category, item_name)
);

-- Create activities table with proper foreign key
CREATE TABLE IF NOT EXISTS activities (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_activities_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create auth_user_mapping table with proper foreign key
CREATE TABLE IF NOT EXISTS auth_user_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID NOT NULL,
    app_user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_auth_mapping_app_user_id FOREIGN KEY (app_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_auth_mapping_auth_user UNIQUE(auth_user_id),
    CONSTRAINT uq_auth_mapping_app_user UNIQUE(app_user_id)
);

-- Create reports table with TEXT generated_by field (NO foreign key constraint)
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('inventory-summary', 'low-stock', 'stock-movement')),
    content JSONB NOT NULL,
    generated_by TEXT,
    date_range_start DATE,
    date_range_end DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comprehensive indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE INDEX IF NOT EXISTS idx_user_passwords_user_id ON user_passwords(user_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON inventory_items(name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_at ON inventory_items(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_by ON inventory_items(created_by);

CREATE INDEX IF NOT EXISTS idx_raw_materials_sku ON raw_materials(sku);
CREATE INDEX IF NOT EXISTS idx_raw_materials_category ON raw_materials(category);
CREATE INDEX IF NOT EXISTS idx_raw_materials_status ON raw_materials(status);
CREATE INDEX IF NOT EXISTS idx_raw_materials_name ON raw_materials(name);
CREATE INDEX IF NOT EXISTS idx_raw_materials_created_at ON raw_materials(created_at);
CREATE INDEX IF NOT EXISTS idx_raw_materials_created_by ON raw_materials(created_by);

CREATE INDEX IF NOT EXISTS idx_fixed_prices_type_category ON fixed_prices(item_type, category);
CREATE INDEX IF NOT EXISTS idx_fixed_prices_active ON fixed_prices(is_active);
CREATE INDEX IF NOT EXISTS idx_fixed_prices_item_name ON fixed_prices(item_name);
CREATE INDEX IF NOT EXISTS idx_fixed_prices_created_by ON fixed_prices(created_by);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);
CREATE INDEX IF NOT EXISTS idx_activities_action ON activities(action);

CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON reports(generated_by);

-- Create triggers to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to all tables with updated_at columns
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_passwords_updated_at ON user_passwords;
CREATE TRIGGER update_user_passwords_updated_at BEFORE UPDATE ON user_passwords FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_raw_materials_updated_at ON raw_materials;
CREATE TRIGGER update_raw_materials_updated_at BEFORE UPDATE ON raw_materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fixed_prices_updated_at ON fixed_prices;
CREATE TRIGGER update_fixed_prices_updated_at BEFORE UPDATE ON fixed_prices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically update inventory status based on stock
CREATE OR REPLACE FUNCTION update_inventory_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock = 0 THEN
        NEW.status = 'out-of-stock';
    ELSIF NEW.stock <= 20 THEN
        NEW.status = 'low-stock';
    ELSE
        NEW.status = 'in-stock';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply status update trigger to inventory_items
DROP TRIGGER IF EXISTS update_inventory_status_trigger ON inventory_items;
CREATE TRIGGER update_inventory_status_trigger BEFORE INSERT OR UPDATE OF stock ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_inventory_status();

-- Create function to automatically update raw materials status based on quantity and reorder level
CREATE OR REPLACE FUNCTION update_raw_materials_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantity = 0 THEN
        NEW.status = 'out-of-stock';
    ELSIF NEW.quantity <= COALESCE(NEW.reorder_level, 10) THEN
        NEW.status = 'low-stock';
    ELSE
        NEW.status = 'in-stock';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply status update trigger to raw_materials
DROP TRIGGER IF EXISTS update_raw_materials_status_trigger ON raw_materials;
CREATE TRIGGER update_raw_materials_status_trigger BEFORE INSERT OR UPDATE OF quantity, reorder_level ON raw_materials FOR EACH ROW EXECUTE FUNCTION update_raw_materials_status();

-- Create function to automatically set created_by and updated_by from current user context
CREATE OR REPLACE FUNCTION set_user_tracking_fields()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Try to get current user ID from session variable (if set by application)
    current_user_id := current_setting('app.current_user_id', true);
    
    IF TG_OP = 'INSERT' THEN
        -- Only set created_by if it's NULL and we have a current user
        IF NEW.created_by IS NULL AND current_user_id IS NOT NULL THEN
            NEW.created_by := current_user_id;
        END IF;
        
        -- Always set updated_by to current user on insert if available
        IF current_user_id IS NOT NULL THEN
            NEW.updated_by := current_user_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only update the updated_by field if we have a current user
        IF current_user_id IS NOT NULL THEN
            NEW.updated_by := current_user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply user tracking triggers to tables
DROP TRIGGER IF EXISTS set_inventory_items_user_fields ON inventory_items;
CREATE TRIGGER set_inventory_items_user_fields
BEFORE INSERT OR UPDATE ON inventory_items
FOR EACH ROW EXECUTE FUNCTION set_user_tracking_fields();

DROP TRIGGER IF EXISTS set_raw_materials_user_fields ON raw_materials;
CREATE TRIGGER set_raw_materials_user_fields
BEFORE INSERT OR UPDATE ON raw_materials
FOR EACH ROW EXECUTE FUNCTION set_user_tracking_fields();

DROP TRIGGER IF EXISTS set_fixed_prices_user_fields ON fixed_prices;
CREATE TRIGGER set_fixed_prices_user_fields
BEFORE INSERT OR UPDATE ON fixed_prices
FOR EACH ROW EXECUTE FUNCTION set_user_tracking_fields();

-- Insert sample users (delete existing first to avoid conflicts)
DELETE FROM user_passwords WHERE user_id IN (
    SELECT id FROM users WHERE username IN ('admin', 'staff')
);
DELETE FROM users WHERE username IN ('admin', 'staff');

-- Insert admin user
INSERT INTO users (username, email, user_type, status) 
VALUES ('admin', 'admin@2kinventory.com', 'admin', 'active');

-- Insert staff user
INSERT INTO users (username, email, user_type, status) 
VALUES ('staff', 'staff@2kinventory.com', 'staff', 'active');

-- Insert passwords for sample users
INSERT INTO user_passwords (user_id, password_hash) 
SELECT id, 'admin123' FROM users WHERE username = 'admin';

INSERT INTO user_passwords (user_id, password_hash) 
SELECT id, 'staff123' FROM users WHERE username = 'staff';

-- Get admin user ID for sample data
DO $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT id INTO admin_id FROM users WHERE username = 'admin';

    -- Insert sample inventory items with admin as creator
    INSERT INTO inventory_items (name, category, price, stock, sku, status, created_by) VALUES
    ('T-Shirt', 'Top', 200.00, 50, 'PRD-0001', 'in-stock', admin_id),
    ('Pajama', 'Bottom', 150.00, 50, 'PRD-0002', 'in-stock', admin_id),
    ('Polo Shirt', 'Top', 300.00, 25, 'PRD-0003', 'in-stock', admin_id),
    ('Shorts', 'Bottom', 150.00, 15, 'PRD-0004', 'low-stock', admin_id),
    ('Blouse', 'Top', 200.00, 8, 'PRD-0005', 'low-stock', admin_id),
    ('Pants', 'Bottom', 400.00, 0, 'PRD-0006', 'out-of-stock', admin_id)
    ON CONFLICT (sku) DO UPDATE SET 
        created_by = EXCLUDED.created_by,
        updated_by = EXCLUDED.created_by;

    -- Insert sample raw materials with admin as creator
    INSERT INTO raw_materials (name, category, quantity, unit, cost_per_unit, supplier, sku, status, created_by) VALUES
    ('Cotton Fabric', 'Fabric', 100, 'rolls', 1000.00, 'Textile Co.', 'RAW-0001', 'in-stock', admin_id),
    ('Denim Fabric', 'Fabric', 75, 'rolls', 2000.00, 'Denim Supply', 'RAW-0002', 'in-stock', admin_id),
    ('Polyester Thread', 'Sewing', 200, 'pieces', 40.00, 'Thread Works', 'RAW-0003', 'in-stock', admin_id),
    ('Buttons', 'Sewing', 500, 'pieces', 5.00, 'Button Factory', 'RAW-0004', 'in-stock', admin_id),
    ('Zippers', 'Sewing', 50, 'pieces', 5.00, 'Zip Co.', 'RAW-0005', 'in-stock', admin_id)
    ON CONFLICT (sku) DO UPDATE SET 
        created_by = EXCLUDED.created_by,
        updated_by = EXCLUDED.created_by;

    -- Insert sample fixed prices with admin as creator
    INSERT INTO fixed_prices (item_type, category, item_name, price, is_active, created_by) VALUES
    ('raw_material', 'Fabric', 'Cotton Fabric', 1000.00, true, admin_id),
    ('raw_material', 'Fabric', 'Denim Fabric', 2000.00, true, admin_id),
    ('raw_material', 'Fabric', 'Polyester Fabric', 1500.00, true, admin_id),
    ('raw_material', 'Sewing', 'Buttons', 5.00, true, admin_id),
    ('raw_material', 'Sewing', 'Thread', 40.00, true, admin_id),
    ('raw_material', 'Sewing', 'Zipper', 5.00, true, admin_id),
    ('raw_material', 'Sewing', 'Needle', 5.00, true, admin_id),
    ('raw_material', 'Sewing', 'Scissors', 20.00, true, admin_id),
    ('product', 'Top', 'T-Shirt', 200.00, true, admin_id),
    ('product', 'Top', 'Polo Shirt', 300.00, true, admin_id),
    ('product', 'Top', 'Blouse', 200.00, true, admin_id),
    ('product', 'Bottom', 'Pajama', 150.00, true, admin_id),
    ('product', 'Bottom', 'Shorts', 150.00, true, admin_id),
    ('product', 'Bottom', 'Pants', 400.00, true, admin_id)
    ON CONFLICT (item_type, category, item_name) DO UPDATE SET 
        created_by = EXCLUDED.created_by,
        updated_by = EXCLUDED.created_by;
END $$;

-- Insert sample activities
INSERT INTO activities (user_id, action, description) 
SELECT u.id, 'system', 'Database initialized with sample data and user relations'
FROM users u WHERE u.username = 'admin';

-- Enable Row Level Security for reports table
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Create policies for reports
DROP POLICY IF EXISTS "Allow authenticated users to read reports" ON reports;
CREATE POLICY "Allow authenticated users to read reports" ON reports
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert reports" ON reports;
CREATE POLICY "Allow authenticated users to insert reports" ON reports
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update reports" ON reports;
CREATE POLICY "Allow authenticated users to update reports" ON reports
FOR UPDATE TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete reports" ON reports;
CREATE POLICY "Allow authenticated users to delete reports" ON reports
FOR DELETE TO authenticated
USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON reports TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE reports_id_seq TO authenticated;

-- Create delete_report function for better report deletion
CREATE OR REPLACE FUNCTION delete_report(report_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM reports WHERE id = report_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for inventory summary with user information
CREATE OR REPLACE VIEW inventory_summary AS
SELECT 
    'product' as item_type,
    i.category,
    COUNT(*) as total_items,
    SUM(i.stock) as total_quantity,
    SUM(i.price * i.stock) as total_value,
    COUNT(CASE WHEN i.status = 'in-stock' THEN 1 END) as in_stock_count,
    COUNT(CASE WHEN i.status = 'low-stock' THEN 1 END) as low_stock_count,
    COUNT(CASE WHEN i.status = 'out-of-stock' THEN 1 END) as out_of_stock_count,
    u.username as created_by_user
FROM inventory_items i
LEFT JOIN users u ON i.created_by = u.id
GROUP BY i.category, u.username
UNION ALL
SELECT 
    'raw_material' as item_type,
    COALESCE(r.category, 'General') as category,
    COUNT(*) as total_items,
    SUM(r.quantity) as total_quantity,
    SUM(r.cost_per_unit * r.quantity) as total_value,
    COUNT(CASE WHEN r.status = 'in-stock' THEN 1 END) as in_stock_count,
    COUNT(CASE WHEN r.status = 'low-stock' THEN 1 END) as low_stock_count,
    COUNT(CASE WHEN r.status = 'out-of-stock' THEN 1 END) as out_of_stock_count,
    u.username as created_by_user
FROM raw_materials r
LEFT JOIN users u ON r.created_by = u.id
GROUP BY COALESCE(r.category, 'General'), u.username;

-- Create function to set current user context
CREATE OR REPLACE FUNCTION set_current_user_id(user_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::text, false);
END;
$$ LANGUAGE plpgsql;

-- Analyze tables for better query performance
ANALYZE users;
ANALYZE user_passwords;
ANALYZE inventory_items;
ANALYZE raw_materials;
ANALYZE fixed_prices;
ANALYZE activities;
ANALYZE reports;
