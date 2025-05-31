-- Create a stored procedure to delete reports
-- This needs to be executed in your Supabase SQL editor
CREATE OR REPLACE FUNCTION delete_report(report_id INT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Delete the report with the given ID
  DELETE FROM reports WHERE id = report_id;
  
  -- Check if the deletion was successful
  IF NOT EXISTS (SELECT 1 FROM reports WHERE id = report_id) THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_report(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_report(INT) TO anon;
GRANT EXECUTE ON FUNCTION delete_report(INT) TO service_role;
