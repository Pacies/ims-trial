-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create lookup tables for better normalization

-- Product categories lookup table (based on original data: 'top', 'bottom')
CREATE TABLE IF NOT EXISTS product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Raw material categories lookup table (based on original data: 'fabric', 'thread', 'hardware', 'trim')
CREATE TABLE IF NOT EXISTS raw_material_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Status lookup table (based on original data: 'in-stock', 'low-stock', 'out-of-stock')
CREATE TABLE IF NOT EXISTS item_statuses (
    id SERIAL PRIMARY KEY,
    status_code VARCHAR(20) UNIQUE NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price item types lookup table (based on original data: 'raw_material', 'product')
CREATE TABLE IF NOT EXISTS price_item_types (
    id SERIAL PRIMARY KEY,
    type_code VARCHAR(20) UNIQUE NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert lookup data exactly matching original categories
INSERT INTO product_categories (name, description) VALUES 
('top', 'Upper body clothing items'),
('bottom', 'Lower body clothing items')
ON CONFLICT (name) DO NOTHING;

INSERT INTO raw_material_categories (name, description) VALUES 
('fabric', 'Textile materials for clothing production'),
('thread', 'Thread and yarn materials'),
('hardware', 'Metal components and fasteners'),
('trim', 'Decorative and functional trim materials')
ON CONFLICT (name) DO NOTHING;

INSERT INTO item_statuses (status_code, display_name, description) VALUES 
('in-stock', 'In Stock', 'Item is available in sufficient quantity'),
('low-stock', 'Low Stock', 'Item quantity is below reorder level'),
('out-of-stock', 'Out of Stock', 'Item is not available')
ON CONFLICT (status_code) DO NOTHING;

INSERT INTO price_item_types (type_code, display_name) VALUES 
('raw_material', 'Raw Material'),
('product', 'Product')
ON CONFLICT (type_code) DO NOTHING;

-- Create users table with proper constraints
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

-- Create user_passwords table with proper foreign key constraints
CREATE TABLE IF NOT EXISTS user_passwords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id) -- Ensure one password per user
);

-- Create inventory_items table with improved normalization
CREATE TABLE IF NOT EXISTS inventory_items (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- Keep for backward compatibility
    category_id INTEGER REFERENCES product_categories(id),
    price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    sku VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'in-stock' CHECK (status IN ('in-stock', 'low-stock', 'out-of-stock')),
    status_id INTEGER REFERENCES item_statuses(id),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create raw_materials table with improved normalization
CREATE TABLE IF NOT EXISTS raw_materials (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- Keep for backward compatibility
    category_id INTEGER REFERENCES raw_material_categories(id),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit VARCHAR(50) NOT NULL DEFAULT 'units',
    cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (cost_per_unit >= 0),
    supplier VARCHAR(255),
    reorder_level INTEGER DEFAULT 10 CHECK (reorder_level >= 0),
    sku VARCHAR(50) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'in-stock' CHECK (status IN ('in-stock', 'low-stock', 'out-of-stock')),
    status_id INTEGER REFERENCES item_statuses(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create normalized fixed_prices table
CREATE TABLE IF NOT EXISTS fixed_prices (
    id BIGSERIAL PRIMARY KEY,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('raw_material', 'product')),
    item_type_id INTEGER REFERENCES price_item_types(id),
    category VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(item_type, category, item_name) -- Ensure unique combinations
);

-- Create activities table with proper constraints
CREATE TABLE IF NOT EXISTS activities (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create auth_user_mapping table for future use
CREATE TABLE IF NOT EXISTS auth_user_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID NOT NULL,
    app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(auth_user_id), -- Ensure one mapping per auth user
    UNIQUE(app_user_id)   -- Ensure one mapping per app user
);

-- Create comprehensive indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE INDEX IF NOT EXISTS idx_user_passwords_user_id ON user_passwords(user_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category_id ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status_id ON inventory_items(status_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock ON inventory_items(stock);

CREATE INDEX IF NOT EXISTS idx_raw_materials_sku ON raw_materials(sku);
CREATE INDEX IF NOT EXISTS idx_raw_materials_category ON raw_materials(category);
CREATE INDEX IF NOT EXISTS idx_raw_materials_category_id ON raw_materials(category_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_status ON raw_materials(status);
CREATE INDEX IF NOT EXISTS idx_raw_materials_status_id ON raw_materials(status_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_quantity ON raw_materials(quantity);

CREATE INDEX IF NOT EXISTS idx_fixed_prices_type_category ON fixed_prices(item_type, category);
CREATE INDEX IF NOT EXISTS idx_fixed_prices_active ON fixed_prices(is_active);
CREATE INDEX IF NOT EXISTS idx_fixed_prices_item_type_id ON fixed_prices(item_type_id);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);
CREATE INDEX IF NOT EXISTS idx_activities_action ON activities(action);

-- Create triggers to automatically maintain foreign key relationships
CREATE OR REPLACE FUNCTION update_inventory_category_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.category IS NOT NULL THEN
        SELECT id INTO NEW.category_id 
        FROM product_categories 
        WHERE name = NEW.category;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_raw_material_category_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.category IS NOT NULL THEN
        SELECT id INTO NEW.category_id 
        FROM raw_material_categories 
        WHERE name = NEW.category;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_status_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS NOT NULL THEN
        SELECT id INTO NEW.status_id 
        FROM item_statuses 
        WHERE status_code = NEW.status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_fixed_price_type_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.item_type IS NOT NULL THEN
        SELECT id INTO NEW.item_type_id 
        FROM price_item_types 
        WHERE type_code = NEW.item_type;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_inventory_category_id ON inventory_items;
CREATE TRIGGER trigger_update_inventory_category_id
    BEFORE INSERT OR UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_inventory_category_id();

DROP TRIGGER IF EXISTS trigger_update_raw_material_category_id ON raw_materials;
CREATE TRIGGER trigger_update_raw_material_category_id
    BEFORE INSERT OR UPDATE ON raw_materials
    FOR EACH ROW EXECUTE FUNCTION update_raw_material_category_id();

DROP TRIGGER IF EXISTS trigger_update_inventory_status_id ON inventory_items;
CREATE TRIGGER trigger_update_inventory_status_id
    BEFORE INSERT OR UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_status_id();

DROP TRIGGER IF EXISTS trigger_update_raw_material_status_id ON raw_materials;
CREATE TRIGGER trigger_update_raw_material_status_id
    BEFORE INSERT OR UPDATE ON raw_materials
    FOR EACH ROW EXECUTE FUNCTION update_status_id();

DROP TRIGGER IF EXISTS trigger_update_fixed_price_type_id ON fixed_prices;
CREATE TRIGGER trigger_update_fixed_price_type_id
    BEFORE INSERT OR UPDATE ON fixed_prices
    FOR EACH ROW EXECUTE FUNCTION update_fixed_price_type_id();

-- Insert sample users (delete existing first to avoid conflicts)
DELETE FROM user_passwords WHERE user_id IN (
    SELECT id FROM users WHERE username IN ('admin', 'staff')
);
DELETE FROM users WHERE username IN ('admin', 'staff');

-- Insert admin user (exactly as original)
INSERT INTO users (username, email, user_type, status) 
VALUES ('admin', 'admin@2kinventory.com', 'admin', 'active');

-- Insert staff user (exactly as original)
INSERT INTO users (username, email, user_type, status) 
VALUES ('staff', 'staff@2kinventory.com', 'staff', 'active');

-- Insert passwords for sample users (exactly as original)
INSERT INTO user_passwords (user_id, password_hash) 
SELECT id, 'admin123' FROM users WHERE username = 'admin';

INSERT INTO user_passwords (user_id, password_hash) 
SELECT id, 'staff123' FROM users WHERE username = 'staff';

-- Insert sample inventory items (exactly as original data with proper foreign key references)
INSERT INTO inventory_items (name, category, category_id, price, stock, sku, status, status_id) 
SELECT 
    'Classic T-Shirt', 
    'top', 
    pc.id, 
    19.99, 
    50, 
    'PRD-0001', 
    'in-stock',
    ist.id
FROM product_categories pc, item_statuses ist 
WHERE pc.name = 'top' AND ist.status_code = 'in-stock'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventory_items (name, category, category_id, price, stock, sku, status, status_id) 
SELECT 
    'Denim Jeans', 
    'bottom', 
    pc.id, 
    49.99, 
    30, 
    'PRD-0002', 
    'in-stock',
    ist.id
FROM product_categories pc, item_statuses ist 
WHERE pc.name = 'bottom' AND ist.status_code = 'in-stock'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventory_items (name, category, category_id, price, stock, sku, status, status_id) 
SELECT 
    'Polo Shirt', 
    'top', 
    pc.id, 
    29.99, 
    25, 
    'PRD-0003', 
    'in-stock',
    ist.id
FROM product_categories pc, item_statuses ist 
WHERE pc.name = 'top' AND ist.status_code = 'in-stock'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventory_items (name, category, category_id, price, stock, sku, status, status_id) 
SELECT 
    'Cargo Shorts', 
    'bottom', 
    pc.id, 
    34.99, 
    15, 
    'PRD-0004', 
    'in-stock',
    ist.id
FROM product_categories pc, item_statuses ist 
WHERE pc.name = 'bottom' AND ist.status_code = 'in-stock'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventory_items (name, category, category_id, price, stock, sku, status, status_id) 
SELECT 
    'Hoodie', 
    'top', 
    pc.id, 
    39.99, 
    8, 
    'PRD-0005', 
    'low-stock',
    ist.id
FROM product_categories pc, item_statuses ist 
WHERE pc.name = 'top' AND ist.status_code = 'low-stock'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventory_items (name, category, category_id, price, stock, sku, status, status_id) 
SELECT 
    'Chino Pants', 
    'bottom', 
    pc.id, 
    44.99, 
    0, 
    'PRD-0006', 
    'out-of-stock',
    ist.id
FROM product_categories pc, item_statuses ist 
WHERE pc.name = 'bottom' AND ist.status_code = 'out-of-stock'
ON CONFLICT (sku) DO NOTHING;

-- Insert sample raw materials (exactly as original data with proper foreign key references)
INSERT INTO raw_materials (name, category, category_id, quantity, unit, cost_per_unit, supplier, reorder_level, sku, status, status_id) 
SELECT 
    'Cotton Fabric', 
    'fabric', 
    rmc.id, 
    100, 
    'yards', 
    5.50, 
    'Textile Co.', 
    10,
    'RAW-0001', 
    'in-stock',
    ist.id
FROM raw_material_categories rmc, item_statuses ist 
WHERE rmc.name = 'fabric' AND ist.status_code = 'in-stock'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO raw_materials (name, category, category_id, quantity, unit, cost_per_unit, supplier, reorder_level, sku, status, status_id) 
SELECT 
    'Denim Fabric', 
    'fabric', 
    rmc.id, 
    75, 
    'yards', 
    8.00, 
    'Denim Supply', 
    10,
    'RAW-0002', 
    'in-stock',
    ist.id
FROM raw_material_categories rmc, item_statuses ist 
WHERE rmc.name = 'fabric' AND ist.status_code = 'in-stock'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO raw_materials (name, category, category_id, quantity, unit, cost_per_unit, supplier, reorder_level, sku, status, status_id) 
SELECT 
    'Polyester Thread', 
    'thread', 
    rmc.id, 
    200, 
    'spools', 
    2.25, 
    'Thread Works', 
    10,
    'RAW-0003', 
    'in-stock',
    ist.id
FROM raw_material_categories rmc, item_statuses ist 
WHERE rmc.name = 'thread' AND ist.status_code = 'in-stock'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO raw_materials (name, category, category_id, quantity, unit, cost_per_unit, supplier, reorder_level, sku, status, status_id) 
SELECT 
    'Metal Buttons', 
    'hardware', 
    rmc.id, 
    500, 
    'pieces', 
    0.15, 
    'Button Factory', 
    10,
    'RAW-0004', 
    'in-stock',
    ist.id
FROM raw_material_categories rmc, item_statuses ist 
WHERE rmc.name = 'hardware' AND ist.status_code = 'in-stock'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO raw_materials (name, category, category_id, quantity, unit, cost_per_unit, supplier, reorder_level, sku, status, status_id) 
SELECT 
    'Zippers', 
    'hardware', 
    rmc.id, 
    50, 
    'pieces', 
    1.50, 
    'Zip Co.', 
    10,
    'RAW-0005', 
    'in-stock',
    ist.id
FROM raw_material_categories rmc, item_statuses ist 
WHERE rmc.name = 'hardware' AND ist.status_code = 'in-stock'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO raw_materials (name, category, category_id, quantity, unit, cost_per_unit, supplier, reorder_level, sku, status, status_id) 
SELECT 
    'Elastic Band', 
    'trim', 
    rmc.id, 
    25, 
    'yards', 
    3.00, 
    'Elastic Supply', 
    10,
    'RAW-0006', 
    'in-stock',
    ist.id
FROM raw_material_categories rmc, item_statuses ist 
WHERE rmc.name = 'trim' AND ist.status_code = 'in-stock'
ON CONFLICT (sku) DO NOTHING;

-- Insert sample fixed prices (exactly as original data with proper foreign key references)
INSERT INTO fixed_prices (item_type, item_type_id, category, item_name, price, is_active) 
SELECT 
    'raw_material', 
    pit.id, 
    'Fabric', 
    'Cotton Fabric', 
    5.50, 
    true
FROM price_item_types pit 
WHERE pit.type_code = 'raw_material'
ON CONFLICT (item_type, category, item_name) DO NOTHING;

INSERT INTO fixed_prices (item_type, item_type_id, category, item_name, price, is_active) 
SELECT 
    'raw_material', 
    pit.id, 
    'Fabric', 
    'Denim Fabric', 
    8.00, 
    true
FROM price_item_types pit 
WHERE pit.type_code = 'raw_material'
ON CONFLICT (item_type, category, item_name) DO NOTHING;

INSERT INTO fixed_prices (item_type, item_type_id, category, item_name, price, is_active) 
SELECT 
    'raw_material', 
    pit.id, 
    'Fabric', 
    'Polyester Fabric', 
    6.25, 
    true
FROM price_item_types pit 
WHERE pit.type_code = 'raw_material'
ON CONFLICT (item_type, category, item_name) DO NOTHING;

INSERT INTO fixed_prices (item_type, item_type_id, category, item_name, price, is_active) 
SELECT 
    'raw_material', 
    pit.id, 
    'Sewing', 
    'Buttons', 
    0.15, 
    true
FROM price_item_types pit 
WHERE pit.type_code = 'raw_material'
ON CONFLICT (item_type, category, item_name) DO NOTHING;

INSERT INTO fixed_prices (item_type, item_type_id, category, item_name, price, is_active) 
SELECT 
    'raw_material', 
    pit.id, 
    'Sewing', 
    'Thread', 
    2.25, 
    true
FROM price_item_types pit 
WHERE pit.type_code = 'raw_material'
ON CONFLICT (item_type, category, item_name) DO NOTHING;

INSERT INTO fixed_prices (item_type, item_type_id, category, item_name, price, is_active) 
SELECT 
    'raw_material', 
    pit.id, 
    'Sewing', 
    'Zipper', 
    1.50, 
    true
FROM price_item_types pit 
WHERE pit.type_code = 'raw_material'
ON CONFLICT (item_type, category, item_name) DO NOTHING;

INSERT INTO fixed_prices (item_type, item_type_id, category, item_name, price, is_active) 
SELECT 
    'raw_material', 
    pit.id, 
    'Sewing', 
    'Needle', 
    0.50, 
    true
FROM price_item_types pit 
WHERE pit.type_code = 'raw_material'
ON CONFLICT (item_type, category, item_name) DO NOTHING;

INSERT INTO fixed_prices (item_type, item_type_id, category, item_name, price, is_active) 
SELECT 
    'raw_material', 
    pit.id, 
    'Sewing', 
    'Scissors', 
    12.99, 
    true
FROM price_item_types pit 
WHERE pit.type_code = 'raw_material'
ON CONFLICT (item_type, category, item_name) DO NOTHING;

INSERT INTO fixed_prices (item_type, item_type_id, category, item_name, price, is_active) 
SELECT 
    'product', 
    pit.id, 
    'top', 
    'Classic T-Shirt', 
    19.99, 
    true
FROM price_item_types pit 
WHERE pit.type_code = 'product'
ON CONFLICT (item_type, category, item_name) DO NOTHING;

INSERT INTO fixed_prices (item_type, item_type_id, category, item_name, price, is_active) 
SELECT 
    'product', 
    pit.id, 
    'top', 
    'Polo Shirt', 
    29.99, 
    true
FROM price_item_types pit 
WHERE pit.type_code = 'product'
ON CONFLICT (item_type, category, item_name) DO NOTHING;

INSERT INTO fixed_prices (item_type, item_type_id, category, item_name, price, is_active) 
SELECT 
    'product', 
    pit.id, 
    'top', 
    'Hoodie', 
    39.99, 
    true
FROM price_item_types pit 
WHERE pit.type_code = 'product'
ON CONFLICT (item_type, category, item_name) DO NOTHING;

INSERT INTO fixed_prices (item_type, item_type_id, category, item_name, price, is_active) 
SELECT 
    'product', 
    pit.id, 
    'bottom', 
    'Denim Jeans', 
    49.99, 
    true
FROM price_item_types pit 
WHERE pit.type_code = 'product'
ON CONFLICT (item_type, category, item_name) DO NOTHING;

INSERT INTO fixed_prices (item_type, item_type_id, category, item_name, price, is_active) 
SELECT 
    'product', 
    pit.id, 
    'bottom', 
    'Cargo Shorts', 
    34.99, 
    true
FROM price_item_types pit 
WHERE pit.type_code = 'product'
ON CONFLICT (item_type, category, item_name) DO NOTHING;

INSERT INTO fixed_prices (item_type, item_type_id, category, item_name, price, is_active) 
SELECT 
    'product', 
    pit.id, 
    'bottom', 
    'Chino Pants', 
    44.99, 
    true
FROM price_item_types pit 
WHERE pit.type_code = 'product'
ON CONFLICT (item_type, category, item_name) DO NOTHING;

-- Insert sample activities (exactly as original)
INSERT INTO activities (user_id, action, description) 
SELECT u.id, 'system', 'Database initialized with sample data'
FROM users u WHERE u.username = 'admin'
ON CONFLICT DO NOTHING;

-- Update timestamps (exactly as original)
UPDATE users SET updated_at = NOW();
UPDATE inventory_items SET updated_at = NOW();
UPDATE raw_materials SET updated_at = NOW();
UPDATE fixed_prices SET updated_at = NOW();
