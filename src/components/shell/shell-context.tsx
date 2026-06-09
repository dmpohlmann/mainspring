"use client";

import { createContext, useContext } from "react";

export interface ShellState {
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (d: string) => void;
  activePanel: string | null;
  setActivePanel: (id: string | null) => void;
  editOpen: boolean;
  openEdit: (date?: string) => void;
  closeEdit: () => void;
  // A panel registers the ordered dates it drives so the shell's keyboard
  // handler can move the selected day with arrow keys. Returns a cleanup fn.
  registerPanelDates: (panelId: string, dates: string[]) => () => void;
}

const ShellCtx = createContext<ShellState | null>(null);

export function useShell(): ShellState {
  const ctx = useContext(ShellCtx);
  if (!ctx) throw new Error("useShell must be used within <AppShell>");
  return ctx;
}

export const ShellContextProvider = ShellCtx.Provider;
