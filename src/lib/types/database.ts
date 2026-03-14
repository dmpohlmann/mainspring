export type EntryType = "work" | "annual_leave" | "personal_leave" | "public_holiday" | "flex_day" | "other";
export type LeaveType = "annual" | "personal" | "toil";

export interface TimesheetEntry {
  id: string;
  user_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  worked_minutes: number;
  flex_minutes: number;
  note: string | null;
  entry_type: EntryType;
  created_at: string;
  updated_at: string;
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
  leave_type: LeaveType;
  date: string;
  hours: number;
  description: string;
  linked_timesheet_entry_id: string | null;
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
}

export interface Database {
  public: {
    Tables: {
      timesheet_entries: {
        Row: TimesheetEntry;
        Insert: Omit<TimesheetEntry, "id" | "created_at" | "updated_at" | "worked_minutes" | "flex_minutes"> & {
          id?: string;
          worked_minutes?: number;
          flex_minutes?: number;
        };
        Update: Partial<Omit<TimesheetEntry, "id" | "created_at" | "updated_at">>;
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
        Insert: Omit<Settings, "id"> & { id?: string };
        Update: Partial<Omit<Settings, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      entry_type: EntryType;
      leave_type: LeaveType;
    };
    CompositeTypes: Record<string, never>;
  };
}
