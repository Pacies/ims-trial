-- Create a stored procedure to delete reports
-- This needs to be executed in your Supabase SQL editor
CREATE OR REPLACE FUNCTION delete_report(report_id INT)
RETURNS BOOLEAN AS $$
DECLARE
  deleted_count INT;
BEGIN
  -- Delete the report with the given ID
  DELETE FROM reports WHERE id = report_id;
  
  -- Get the number of rows affected
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Return true if at least one row was deleted
  IF deleted_count > 0 THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return false
    RAISE NOTICE 'Error deleting report %: %', report_id, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_report(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_report(INT) TO anon;
GRANT EXECUTE ON FUNCTION delete_report(INT) TO service_role;

-- Also ensure the reports table has proper RLS policies
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to delete their own reports
CREATE POLICY "Users can delete reports" ON reports
  FOR DELETE USING (true);

-- Allow authenticated users to select reports
CREATE POLICY "Users can view reports" ON reports
  FOR SELECT USING (true);

-- Allow authenticated users to insert reports
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (true);
