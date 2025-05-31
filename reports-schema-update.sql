-- Create reports table if it doesn't exist (safe update that won't affect existing tables)
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('inventory-summary', 'low-stock', 'stock-movement')),
    content JSONB NOT NULL,
    generated_by VARCHAR(255),
    date_range_start DATE,
    date_range_end DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- Add RLS (Row Level Security) if not already enabled
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Create policy for reports if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reports' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON reports FOR SELECT USING (true);
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reports' AND policyname = 'Enable insert access for all users'
    ) THEN
        CREATE POLICY "Enable insert access for all users" ON reports FOR INSERT WITH CHECK (true);
    END IF;
END
$$;
