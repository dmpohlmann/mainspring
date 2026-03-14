-- Function to automatically set updated_at on row update
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to timesheet_entries
CREATE TRIGGER trigger_set_updated_at_timesheet_entries
  BEFORE UPDATE ON timesheet_entries
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Apply updated_at trigger to leave_balances
CREATE TRIGGER trigger_set_updated_at_leave_balances
  BEFORE UPDATE ON leave_balances
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Function to calculate worked_minutes and flex_minutes
CREATE OR REPLACE FUNCTION calculate_worked_flex()
RETURNS TRIGGER AS $$
DECLARE
  total_interval interval;
  lunch_interval interval;
  total_minutes integer;
  lunch_minutes integer;
BEGIN
  IF NEW.entry_type = 'work' THEN
    -- Calculate total work time minus lunch
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
      NEW.flex_minutes := NEW.worked_minutes - 450;
    ELSE
      NEW.worked_minutes := 0;
      NEW.flex_minutes := 0;
    END IF;

  ELSIF NEW.entry_type IN ('annual_leave', 'personal_leave', 'public_holiday') THEN
    -- Full day leave counts as a standard day
    NEW.worked_minutes := 450;
    NEW.flex_minutes := 0;
    NEW.start_time := NULL;
    NEW.end_time := NULL;
    NEW.lunch_start := NULL;
    NEW.lunch_end := NULL;

  ELSIF NEW.entry_type = 'flex_day' THEN
    -- Flex day consumes flex balance
    NEW.worked_minutes := 0;
    NEW.flex_minutes := -450;
    NEW.start_time := NULL;
    NEW.end_time := NULL;
    NEW.lunch_start := NULL;
    NEW.lunch_end := NULL;

  ELSIF NEW.entry_type = 'other' THEN
    -- Keep times if provided, calculate if possible
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
      NEW.flex_minutes := 0;
    ELSE
      NEW.worked_minutes := 0;
      NEW.flex_minutes := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply calculate_worked_flex trigger to timesheet_entries
CREATE TRIGGER trigger_calculate_worked_flex
  BEFORE INSERT OR UPDATE ON timesheet_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_worked_flex();
