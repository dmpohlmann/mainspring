-- Enable RLS on all tables
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- timesheet_entries policies
CREATE POLICY "Users can view their own timesheet entries"
  ON timesheet_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timesheet entries"
  ON timesheet_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timesheet entries"
  ON timesheet_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timesheet entries"
  ON timesheet_entries FOR DELETE
  USING (auth.uid() = user_id);

-- leave_balances policies
CREATE POLICY "Users can view their own leave balances"
  ON leave_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leave balances"
  ON leave_balances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leave balances"
  ON leave_balances FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leave balances"
  ON leave_balances FOR DELETE
  USING (auth.uid() = user_id);

-- leave_transactions policies
CREATE POLICY "Users can view their own leave transactions"
  ON leave_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leave transactions"
  ON leave_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leave transactions"
  ON leave_transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leave transactions"
  ON leave_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- settings policies
CREATE POLICY "Users can view their own settings"
  ON settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON settings FOR DELETE
  USING (auth.uid() = user_id);
