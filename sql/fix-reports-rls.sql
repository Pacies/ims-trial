-- Create function to insert reports bypassing RLS if needed
CREATE OR REPLACE FUNCTION insert_report_bypass_rls(
  report_title TEXT,
  report_type TEXT,
  report_content JSONB,
  report_generated_by TEXT DEFAULT NULL,
  report_date_start DATE DEFAULT NULL,
  report_date_end DATE DEFAULT NULL
)
RETURNS TABLE(
  id BIGINT,
  title TEXT,
  type TEXT,
  content JSONB,
  generated_by TEXT,
  date_range_start DATE,
  date_range_end DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO reports (title, type, content, generated_by, date_range_start, date_range_end)
  VALUES (report_title, report_type, report_content, report_generated_by, report_date_start, report_date_end)
  RETURNING 
    reports.id,
    reports.title,
    reports.type,
    reports.content,
    reports.generated_by,
    reports.date_range_start,
    reports.date_range_end,
    reports.created_at,
    reports.updated_at;
END;
$$;

-- Drop existing policies if they exist (no error if they don't exist)
DROP POLICY IF EXISTS "Allow authenticated users to insert reports" ON reports;
DROP POLICY IF EXISTS "Allow authenticated users to view reports" ON reports;
DROP POLICY IF EXISTS "Allow authenticated users to update reports" ON reports;
DROP POLICY IF EXISTS "Allow authenticated users to delete reports" ON reports;
DROP POLICY IF EXISTS "Users can insert their own reports" ON reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON reports;

-- Create new permissive policies
CREATE POLICY "Allow authenticated users to insert reports" ON reports
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view reports" ON reports
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update reports" ON reports
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete reports" ON reports
  FOR DELETE TO authenticated
  USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON reports TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE reports_id_seq TO authenticated;

-- Only alter table if the column exists and needs changes
DO $$
BEGIN
  -- Check if generated_by column exists and alter if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'generated_by'
  ) THEN
    -- Only alter if it's not already TEXT type
    IF (SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'reports' AND column_name = 'generated_by') != 'text' THEN
      ALTER TABLE reports ALTER COLUMN generated_by TYPE TEXT;
    END IF;
    
    -- Make sure it's nullable
    ALTER TABLE reports ALTER COLUMN generated_by DROP NOT NULL;
    ALTER TABLE reports ALTER COLUMN generated_by SET DEFAULT NULL;
  END IF;
  
  -- Ensure content is not null
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reports' AND column_name = 'content'
  ) THEN
    ALTER TABLE reports ALTER COLUMN content SET NOT NULL;
  END IF;
END $$;

-- Add indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
