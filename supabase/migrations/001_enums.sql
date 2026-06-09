-- Entry/segment types, leave types, and leave approval status.
-- A day is composed of segments; entry_type is a cached display/primary type.
-- TOIL is gone — FLEX is the single time balance (derived from flex_minutes).

CREATE TYPE entry_type AS ENUM (
  'work', 'annual_leave', 'personal_leave', 'public_holiday', 'flex_day', 'other'
);

-- Segments additionally allow 'break' (unpaid lunch) so the day tiles fully.
CREATE TYPE segment_type AS ENUM (
  'work', 'break', 'annual_leave', 'personal_leave', 'public_holiday', 'flex_day', 'other'
);

CREATE TYPE leave_type AS ENUM ('annual', 'personal');

CREATE TYPE leave_status AS ENUM ('planned', 'pending', 'approved');
