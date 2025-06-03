-- Create product_orders table
CREATE TABLE IF NOT EXISTS product_orders (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_order_materials table
CREATE TABLE IF NOT EXISTS product_order_materials (
  id SERIAL PRIMARY KEY,
  product_order_id INTEGER REFERENCES product_orders(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL,
  quantity_required INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_order_history table
CREATE TABLE IF NOT EXISTS product_order_history (
  id SERIAL PRIMARY KEY,
  original_order_id INTEGER,
  product_id INTEGER NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  materials_used JSONB
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_orders_status ON product_orders(status);
CREATE INDEX IF NOT EXISTS idx_product_orders_created_at ON product_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_product_order_materials_order_id ON product_order_materials(product_order_id);
CREATE INDEX IF NOT EXISTS idx_product_order_materials_material_id ON product_order_materials(material_id);

-- Enable RLS (Row Level Security)
ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_order_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_order_history ENABLE ROW LEVEL SECURITY;

-- Create policies for product_orders
CREATE POLICY "Enable read access for all users" ON product_orders FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON product_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON product_orders FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON product_orders FOR DELETE USING (true);

-- Create policies for product_order_materials
CREATE POLICY "Enable read access for all users" ON product_order_materials FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON product_order_materials FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON product_order_materials FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON product_order_materials FOR DELETE USING (true);

-- Create policies for product_order_history
CREATE POLICY "Enable read access for all users" ON product_order_history FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON product_order_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON product_order_history FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON product_order_history FOR DELETE USING (true);
