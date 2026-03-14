-- RPC function to insert a flex cashout entry bypassing the calculate trigger
-- This allows setting flex_minutes directly for cashout adjustments
CREATE OR REPLACE FUNCTION insert_flex_cashout(
  p_user_id uuid,
  p_date date,
  p_flex_minutes integer,
  p_note text
) RETURNS void AS $$
BEGIN
  -- Temporarily disable the trigger
  ALTER TABLE timesheet_entries DISABLE TRIGGER trigger_calculate_worked_flex;

  -- Insert the cashout entry
  INSERT INTO timesheet_entries (user_id, date, entry_type, worked_minutes, flex_minutes, note)
  VALUES (p_user_id, p_date, 'other', 0, p_flex_minutes, p_note)
  ON CONFLICT (user_id, date) DO UPDATE
    SET flex_minutes = timesheet_entries.flex_minutes + p_flex_minutes,
        note = COALESCE(timesheet_entries.note || '; ', '') || p_note,
        updated_at = now();

  -- Re-enable the trigger
  ALTER TABLE timesheet_entries ENABLE TRIGGER trigger_calculate_worked_flex;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
