CREATE TABLE timesheet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  date date NOT NULL,
  start_time time,
  end_time time,
  lunch_start time,
  lunch_end time,
  worked_minutes integer NOT NULL DEFAULT 0,
  flex_minutes integer NOT NULL DEFAULT 0,
  note text,
  entry_type entry_type NOT NULL DEFAULT 'work',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  leave_type leave_type NOT NULL,
  balance_hours decimal(8,2) DEFAULT 0,
  accrual_rate_hours_per_fortnight decimal(6,2) DEFAULT 0,
  last_accrual_date date,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, leave_type)
);

CREATE TABLE leave_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  leave_type leave_type NOT NULL,
  date date NOT NULL,
  hours decimal(6,2) NOT NULL,
  description text NOT NULL,
  linked_timesheet_entry_id uuid REFERENCES timesheet_entries(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  standard_day_minutes int DEFAULT 450,
  default_lunch_duration_minutes int DEFAULT 30,
  annual_leave_days_per_year decimal(5,2) DEFAULT 20,
  personal_leave_days_per_year decimal(5,2) DEFAULT 10,
  financial_year_start_month int DEFAULT 7
);
