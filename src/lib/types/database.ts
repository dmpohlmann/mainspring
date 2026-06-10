export type EntryType =
  | "work"
  | "annual_leave"
  | "personal_leave"
  | "public_holiday"
  | "flex_day"
  | "other";

// Segments additionally allow 'break' (unpaid lunch).
export type SegmentType = "work" | "break" | EntryType;

// Stored leave balances are annual/personal only. FLEX is derived, so it never
// gets a leave_balances row — but it CAN appear in the transaction ledger as a
// manual adjustment, hence the wider LedgerType.
export type LeaveType = "annual" | "personal";
export type LedgerType = LeaveType | "flex";

export type LeaveStatus = "planned" | "pending" | "approved";

// One row per day. Segments are the source of truth; worked/flex are cached.
export interface TimesheetEntry {
  id: string;
  user_id: string;
  date: string;
  entry_type: EntryType; // cached display/primary type
  note: string | null;
  status: LeaveStatus | null; // approval state for scheduled leave
  worked_minutes: number; // cached, derived from segments
  flex_minutes: number; // cached, derived from segments
  created_at: string;
  updated_at: string;
}

// A contiguous typed block within a day.
export interface TimesheetSegment {
  id: string;
  entry_id: string;
  user_id: string;
  seq: number;
  type: SegmentType;
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
}

// An entry plus its ordered segments (the shape the UI works with).
export interface DayEntry extends TimesheetEntry {
  segments: TimesheetSegment[];
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  leave_type: LeaveType;
  balance_hours: number;
  accrual_rate_hours_per_fortnight: number;
  last_accrual_date: string | null;
  updated_at: string;
}

export interface LeaveTransaction {
  id: string;
  user_id: string;
  leave_type: LedgerType; // annual / personal / flex
  date: string;
  hours: number;
  description: string;
  linked_entry_id: string | null;
  created_at: string;
}

export interface Settings {
  id: string;
  user_id: string;
  standard_day_minutes: number;
  default_lunch_duration_minutes: number;
  annual_leave_days_per_year: number;
  personal_leave_days_per_year: number;
  financial_year_start_month: number;
  pay_fortnight_anchor_date: string;
  pay_fortnight_start_day: number;
  state: string;
  updated_at: string;
}

export interface PublicHoliday {
  id: string;
  date: string;
  name: string;
  region: string; // 'national' or a state code
}

export interface Database {
  public: {
    Tables: {
      timesheet_entries: {
        Row: TimesheetEntry;
        Insert: Omit<
          TimesheetEntry,
          "id" | "created_at" | "updated_at" | "worked_minutes" | "flex_minutes"
        > & {
          id?: string;
          worked_minutes?: number;
          flex_minutes?: number;
        };
        Update: Partial<Omit<TimesheetEntry, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      timesheet_segments: {
        Row: TimesheetSegment;
        Insert: Omit<TimesheetSegment, "id"> & { id?: string };
        Update: Partial<Omit<TimesheetSegment, "id">>;
        Relationships: [];
      };
      leave_balances: {
        Row: LeaveBalance;
        Insert: Omit<LeaveBalance, "id" | "updated_at"> & { id?: string };
        Update: Partial<Omit<LeaveBalance, "id" | "updated_at">>;
        Relationships: [];
      };
      leave_transactions: {
        Row: LeaveTransaction;
        Insert: Omit<LeaveTransaction, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<LeaveTransaction, "id" | "created_at">>;
        Relationships: [];
      };
      settings: {
        Row: Settings;
        Insert: Omit<Settings, "id" | "updated_at"> & { id?: string };
        Update: Partial<Omit<Settings, "id" | "updated_at">>;
        Relationships: [];
      };
      public_holidays: {
        Row: PublicHoliday;
        Insert: Omit<PublicHoliday, "id"> & { id?: string };
        Update: Partial<Omit<PublicHoliday, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      entry_type: EntryType;
      segment_type: SegmentType;
      leave_type: LedgerType;
      leave_status: LeaveStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
