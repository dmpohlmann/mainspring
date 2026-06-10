-- FLEX manual adjustments (incl. opening balance) live in the leave ledger
-- (leave_transactions) so they carry history and surface in the transactions
-- panel. The running FLEX balance = Σ timesheet_entries.flex_minutes + Σ flex
-- adjustments. No leave_balances row is created for flex (it stays derived).
ALTER TYPE leave_type ADD VALUE IF NOT EXISTS 'flex';
