// Tab + panel registry shared by the shell and the route pages.

export const TABS = [
  "dashboard",
  "timesheet",
  "calendar",
  "leave",
  "settings",
] as const;
export type Tab = (typeof TABS)[number];

export const TAB_CODES: Record<Tab, string> = {
  dashboard: "DSH",
  timesheet: "TSH",
  calendar: "CAL",
  leave: "LVE",
  settings: "SET",
};

export const TAB_ROUTE: Record<Tab, string> = {
  dashboard: "/dashboard",
  timesheet: "/timesheet",
  calendar: "/calendar",
  leave: "/leave",
  settings: "/settings",
};

export type Panel = { id: string; code: string; label: string };

export const PANELS: Record<Tab, Panel[]> = {
  dashboard: [
    { id: "balances", code: "ba", label: "balances" },
    { id: "thisweek", code: "dt", label: "thisweek" },
  ],
  timesheet: [
    { id: "week1", code: "w1", label: "week1" },
    { id: "week2", code: "w2", label: "week2" },
    { id: "totals", code: "tt", label: "totals" },
  ],
  calendar: [{ id: "month", code: "mo", label: "month" }],
  leave: [
    { id: "balances", code: "ba", label: "balances" },
    { id: "transactions", code: "tx", label: "transactions" },
    { id: "adjust", code: "aj", label: "adjust" },
  ],
  settings: [{ id: "form", code: "fm", label: "settings" }],
};

export function tabFromPath(pathname: string): Tab {
  const t = TABS.find((tab) => pathname.startsWith(TAB_ROUTE[tab]));
  return t ?? "dashboard";
}

export function resolveTab(part: string): Tab | null {
  return (
    TABS.find(
      (t) => t === part || TAB_CODES[t].toLowerCase() === part || t[0] === part
    ) ?? null
  );
}

export function resolvePanel(tab: Tab, part: string): Panel | null {
  return (
    (PANELS[tab] ?? []).find(
      (p) =>
        p.code === part ||
        p.id === part ||
        p.label.replace(/\s/g, "") === part ||
        p.id[0] === part
    ) ?? null
  );
}
