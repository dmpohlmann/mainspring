-- Add pay fortnight columns to settings table
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS pay_fortnight_anchor_date date DEFAULT '2026-01-15',
  ADD COLUMN IF NOT EXISTS pay_fortnight_start_day integer DEFAULT 4;

COMMENT ON COLUMN settings.pay_fortnight_anchor_date IS 'A known pay period start date used to calculate all fortnights';
COMMENT ON COLUMN settings.pay_fortnight_start_day IS 'ISO day-of-week for pay period start: 1=Mon, 4=Thu, 7=Sun';
