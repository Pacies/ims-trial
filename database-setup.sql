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

-- Create user_passwords table
CREATE TABLE IF NOT EXISTS user_passwords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_items table
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create raw_materials table
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create fixed_prices table for raw materials and products
CREATE TABLE IF NOT EXISTS fixed_prices (
    id BIGSERIAL PRIMARY KEY,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('raw_material', 'product')),
    category VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(item_type, category, item_name)
);

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create auth_user_mapping table (for future use)
CREATE TABLE IF NOT EXISTS auth_user_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID NOT NULL,
    app_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_passwords_user_id ON user_passwords(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_raw_materials_sku ON raw_materials(sku);
CREATE INDEX IF NOT EXISTS idx_fixed_prices_type_category ON fixed_prices(item_type, category);
CREATE INDEX IF NOT EXISTS idx_fixed_prices_active ON fixed_prices(is_active);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);

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

-- Insert sample inventory items
INSERT INTO inventory_items (name, category, price, stock, sku, status) VALUES
('T-Shirt', 'Top', 200.00, 50, 'PRD-0001', 'in-stock'),
('Pajama', 'Bottom', 150.00, 50, 'PRD-0002', 'in-stock'),
('Polo Shirt', 'Top', 300.00, 25, 'PRD-0003', 'in-stock'),
('Shorts', 'Bottom', 150.00, 15, 'PRD-0004', 'in-stock'),
('Blouse', 'Top', 200.00, 8, 'PRD-0005', 'low-stock'),
('Pants', 'Bottom', 400.00, 0, 'PRD-0006', 'out-of-stock');

-- Insert sample raw materials
INSERT INTO raw_materials (name, category, quantity, unit, cost_per_unit, supplier, sku, status) VALUES
('Cotton Fabric', 'Fabric', 100, 'rolls', 1000.00, 'Textile Co.', 'RAW-0001', 'in-stock'),
('Denim Fabric', 'Fabric', 75, 'rolls', 2000.00, 'Denim Supply', 'RAW-0002', 'in-stock'),
('Polyester Thread', 'Sewing', 200, 'pieces', 40.00, 'Thread Works', 'RAW-0003', 'in-stock'),
('Buttons', 'Sewing', 500, 'pieces', 5.00, 'Button Factory', 'RAW-0004', 'in-stock'),
('Zippers', 'Sewing', 50, 'pieces', 5.00, 'Zip Co.', 'RAW-0005', 'in-stock');

-- Insert sample fixed prices for raw materials
INSERT INTO fixed_prices (item_type, category, item_name, price, is_active) VALUES
('raw_material', 'Fabric', 'Cotton Fabric', 1000.00, true),
('raw_material', 'Fabric', 'Denim Fabric', 2000.00, true),
('raw_material', 'Fabric', 'Polyester Fabric', 1500.00, true),
('raw_material', 'Sewing', 'Buttons', 5.00, true),
('raw_material', 'Sewing', 'Thread', 40.00, true),
('raw_material', 'Sewing', 'Zipper', 5.00, true),
('raw_material', 'Sewing', 'Needle', 5.00, true),
('raw_material', 'Sewing', 'Scissors', 20.00, true),
('product', 'Top', 'T-Shirt', 200.00, true),
('product', 'Top', 'Polo Shirt', 300.00, true),
('product', 'Top', 'Blouse', 200.00, true),
('product', 'Bottom', 'Pajama', 150.00, true),
('product', 'Bottom', 'Shorts', 150.00, true),
('product', 'Bottom', 'Pants', 400.00, true);

-- Insert sample activities
INSERT INTO activities (user_id, action, description) 
SELECT u.id, 'system', 'Database initialized with sample data'
FROM users u WHERE u.username = 'admin';

-- Update timestamps
UPDATE users SET updated_at = NOW();
UPDATE inventory_items SET updated_at = NOW();
UPDATE raw_materials SET updated_at = NOW();
UPDATE fixed_prices SET updated_at = NOW();
