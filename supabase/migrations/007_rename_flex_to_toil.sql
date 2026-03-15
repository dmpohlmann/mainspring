-- Rename flex_day enum value to toil_day
ALTER TYPE entry_type RENAME VALUE 'flex_day' TO 'toil_day';

-- Rename flex_minutes column to toil_minutes
ALTER TABLE timesheet_entries RENAME COLUMN flex_minutes TO toil_minutes;

-- Recreate trigger function with updated column name
CREATE OR REPLACE FUNCTION calculate_worked_flex()
RETURNS TRIGGER AS $$
DECLARE
  total_interval interval;
  lunch_interval interval;
  total_minutes integer;
  lunch_minutes integer;
BEGIN
  IF NEW.entry_type = 'work' THEN
    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
      total_interval := NEW.end_time - NEW.start_time;
      total_minutes := EXTRACT(HOUR FROM total_interval) * 60 + EXTRACT(MINUTE FROM total_interval);

      IF NEW.lunch_start IS NOT NULL AND NEW.lunch_end IS NOT NULL THEN
        lunch_interval := NEW.lunch_end - NEW.lunch_start;
        lunch_minutes := EXTRACT(HOUR FROM lunch_interval) * 60 + EXTRACT(MINUTE FROM lunch_interval);
      ELSE
        lunch_minutes := 0;
      END IF;

      NEW.worked_minutes := total_minutes - lunch_minutes;
      NEW.toil_minutes := NEW.worked_minutes - 450;
    ELSE
      NEW.worked_minutes := 0;
      NEW.toil_minutes := 0;
    END IF;

  ELSIF NEW.entry_type IN ('annual_leave', 'personal_leave', 'public_holiday') THEN
    NEW.worked_minutes := 450;
    NEW.toil_minutes := 0;
    NEW.start_time := NULL;
    NEW.end_time := NULL;
    NEW.lunch_start := NULL;
    NEW.lunch_end := NULL;

  ELSIF NEW.entry_type = 'toil_day' THEN
    NEW.worked_minutes := 0;
    NEW.toil_minutes := -450;
    NEW.start_time := NULL;
    NEW.end_time := NULL;
    NEW.lunch_start := NULL;
    NEW.lunch_end := NULL;

  ELSIF NEW.entry_type = 'other' THEN
    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
      total_interval := NEW.end_time - NEW.start_time;
      total_minutes := EXTRACT(HOUR FROM total_interval) * 60 + EXTRACT(MINUTE FROM total_interval);

      IF NEW.lunch_start IS NOT NULL AND NEW.lunch_end IS NOT NULL THEN
        lunch_interval := NEW.lunch_end - NEW.lunch_start;
        lunch_minutes := EXTRACT(HOUR FROM lunch_interval) * 60 + EXTRACT(MINUTE FROM lunch_interval);
      ELSE
        lunch_minutes := 0;
      END IF;

      NEW.worked_minutes := total_minutes - lunch_minutes;
      NEW.toil_minutes := 0;
    ELSE
      NEW.worked_minutes := 0;
      NEW.toil_minutes := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate cashout RPC with updated column name
CREATE OR REPLACE FUNCTION insert_flex_cashout(
  p_user_id uuid,
  p_date date,
  p_flex_minutes integer,
  p_note text
) RETURNS void AS $$
BEGIN
  ALTER TABLE timesheet_entries DISABLE TRIGGER trigger_calculate_worked_flex;

  INSERT INTO timesheet_entries (user_id, date, entry_type, worked_minutes, toil_minutes, note)
  VALUES (p_user_id, p_date, 'other', 0, p_flex_minutes, p_note)
  ON CONFLICT (user_id, date) DO UPDATE
    SET toil_minutes = timesheet_entries.toil_minutes + p_flex_minutes,
        note = COALESCE(timesheet_entries.note || '; ', '') || p_note,
        updated_at = now();

  ALTER TABLE timesheet_entries ENABLE TRIGGER trigger_calculate_worked_flex;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
