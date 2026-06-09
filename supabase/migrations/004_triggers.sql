-- updated_at maintenance. Worked/flex are computed app-side (from segments) and
-- written into the cached columns on save — no DB calc trigger (see D2 in
-- MIGRATION_PLAN.md).

-- search_path pinned to '' to harden against injection (advisor 0011);
-- now() resolves from pg_catalog regardless.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_entries_updated_at
  BEFORE UPDATE ON timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_balances_updated_at
  BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
