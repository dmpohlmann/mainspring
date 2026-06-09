-- Per-user settings (one row per user).
CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  standard_day_minutes integer DEFAULT 450,
  default_lunch_duration_minutes integer DEFAULT 60,
  annual_leave_days_per_year decimal(5, 2) DEFAULT 20,
  personal_leave_days_per_year decimal(5, 2) DEFAULT 10,
  financial_year_start_month integer DEFAULT 7,
  pay_fortnight_anchor_date date DEFAULT '2026-01-15',
  pay_fortnight_start_day integer DEFAULT 4,
  state text DEFAULT 'QLD', -- AU state/territory for public holidays
  updated_at timestamptz DEFAULT now()
);

-- One row per day. Segments are the source of truth; worked_minutes/flex_minutes
-- are cached (recomputed by the app on save) and entry_type is a cached
-- display/primary type for fast calendar/list rendering + filtering.
CREATE TABLE timesheet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  date date NOT NULL,
  entry_type entry_type NOT NULL DEFAULT 'work',
  note text,
  status leave_status, -- approval state for scheduled leave (null for plain work)
  worked_minutes integer NOT NULL DEFAULT 0,
  flex_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

-- Contiguous typed blocks tiling the day (work / break / leave / flex), ordered
-- by seq. start_time/end_time abut with no gaps.
CREATE TABLE timesheet_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES timesheet_entries (id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  seq integer NOT NULL,
  type segment_type NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL
);
CREATE INDEX idx_segments_entry ON timesheet_segments (entry_id);

-- Annual + personal leave balances. FLEX is NOT stored here — it is derived from
-- the sum of timesheet_entries.flex_minutes.
CREATE TABLE leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  leave_type leave_type NOT NULL,
  balance_hours decimal(8, 2) DEFAULT 0,
  accrual_rate_hours_per_fortnight decimal(6, 2) DEFAULT 0,
  last_accrual_date date,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, leave_type)
);

-- Audit trail: accruals (+), debits (−), and manual adjustments.
CREATE TABLE leave_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  leave_type leave_type NOT NULL,
  date date NOT NULL,
  hours decimal(6, 2) NOT NULL,
  description text NOT NULL,
  linked_entry_id uuid REFERENCES timesheet_entries (id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_leave_tx_user_date ON leave_transactions (user_id, date DESC);

-- Shared public-holiday reference (auto-populated from a verified source).
-- region is 'national' or a state code (e.g. 'QLD'); the app shows holidays for
-- the user's settings.state plus national.
CREATE TABLE public_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  name text NOT NULL,
  region text NOT NULL DEFAULT 'national',
  UNIQUE (date, region)
);
CREATE INDEX idx_holidays_date ON public_holidays (date);
