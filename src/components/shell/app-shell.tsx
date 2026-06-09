"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  PANELS,
  TABS,
  TAB_CODES,
  TAB_ROUTE,
  resolvePanel,
  resolveTab,
  tabFromPath,
  type Tab,
} from "@/lib/shell/nav";
import { TerminalFrame } from "@/components/tui/terminal-frame";
import { ShellContextProvider } from "@/components/shell/shell-context";
import { EditModal, type EditActions } from "@/components/shell/edit-modal";

const FKEYS: [string, string][] = [
  ["F1", "Help"],
  ["F2", "Save"],
  ["F3", "New"],
  ["F5", "Refresh"],
  ["F8", "Delete"],
  ["F10", "Quit"],
];

export function AppShell({
  user,
  today,
  children,
}: {
  user: { email?: string } | null;
  today: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const tab = tabFromPath(pathname);

  const [selectedDate, setSelectedDate] = useState(today);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdValue, setCmdValue] = useState("");
  const signoutRef = useRef<HTMLFormElement>(null);
  // The open edit modal registers its save/delete here so F2/F8 reach it.
  const editActions = useRef<EditActions | null>(null);
  const registerEditActions = useCallback(
    (a: EditActions | null) => {
      editActions.current = a;
    },
    []
  );

  const goTab = (t: Tab) => {
    const ps = PANELS[t] ?? [];
    setActivePanel(ps.length === 1 ? ps[0].id : null);
    router.push(TAB_ROUTE[t]);
  };
  const focusPanel = (panelTab: Tab, panelId: string) => {
    setActivePanel(panelId);
    if (panelTab !== tab) router.push(TAB_ROUTE[panelTab]);
  };
  const openEdit = (date?: string) => {
    if (date) setSelectedDate(date);
    setEditOpen(true);
  };

  const runFkey = (key: string) => {
    switch (key) {
      case "F1":
        return setShowHelp(true);
      case "F2":
        return editActions.current?.save(); // no-op unless the modal is open
      case "F3":
        return openEdit(today);
      case "F5":
        return router.refresh();
      case "F8":
        return editActions.current?.remove(); // no-op unless the modal is open
      case "F10":
        return signoutRef.current?.requestSubmit();
    }
  };

  const runCommand = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    setCmdOpen(false);
    setCmdValue("");
    if (!cmd) return;
    if (cmd.includes(".")) {
      const [tp, pp] = cmd.split(".");
      const t = resolveTab(tp);
      if (t) {
        const p = pp ? resolvePanel(t, pp) : null;
        if (p) focusPanel(t, p.id);
        else goTab(t);
        return;
      }
    }
    const t = resolveTab(cmd);
    if (t) return goTab(t);
    const p = resolvePanel(tab, cmd);
    if (p) return focusPanel(tab, p.id);
    switch (cmd) {
      case "edit":
      case "e":
        return openEdit();
      case "new":
      case "ne":
        return openEdit(today);
      case "save":
        return runFkey("F2");
      case "delete":
      case "del":
        return runFkey("F8");
      case "refresh":
        return runFkey("F5");
      case "help":
      case "?":
        return setShowHelp(true);
      case "quit":
      case "q":
        return runFkey("F10");
      case "light":
      case "dark":
        return setTheme(cmd);
      default:
        toast(`unknown command: ${cmd}`);
    }
  };

  // Keyboard: F-keys, "/" command line, letter tab-jumps, e/Enter edit.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      const typing =
        !!ae &&
        (ae.tagName === "INPUT" ||
          ae.tagName === "TEXTAREA" ||
          ae.tagName === "SELECT" ||
          ae.isContentEditable);

      if (e.key === "Escape") {
        setShowHelp(false);
        setCmdOpen(false);
        setEditOpen(false);
        ae?.blur();
        return;
      }
      if (FKEYS.some(([k]) => k === e.key)) {
        e.preventDefault();
        runFkey(e.key);
        return;
      }
      if (typing || cmdOpen || editOpen) return;

      if (e.key === "/") {
        e.preventDefault();
        return setCmdOpen(true);
      }
      if (e.key === "e" || e.key === "Enter") {
        e.preventDefault();
        return openEdit();
      }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = resolveTab(e.key.toLowerCase());
        if (t) goTab(t);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, cmdOpen, editOpen, tab]);

  // Scroll the active panel into view once it has rendered.
  useEffect(() => {
    if (!activePanel) return;
    document
      .getElementById(`panel-${activePanel}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activePanel, pathname]);

  return (
    <ShellContextProvider
      value={{
        selectedDate,
        setSelectedDate,
        activePanel,
        setActivePanel,
        editOpen,
        openEdit,
        closeEdit: () => setEditOpen(false),
      }}
    >
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-3xl space-y-3 p-4 text-sm sm:p-6">
          {/* top bar */}
          <header className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-secondary">▰▰</span>
              <span className="font-bold tracking-tight">mainspring</span>
              <span className="hidden text-muted-foreground sm:inline">
                {user?.email}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="border border-border px-2 py-0.5 text-muted-foreground hover:text-foreground"
              >
                {theme === "dark" ? "[ light ]" : "[ dark ]"}
              </button>
              <form ref={signoutRef} action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="border border-border px-2 py-0.5 text-muted-foreground hover:text-foreground"
                >
                  [ quit ]
                </button>
              </form>
            </div>
          </header>

          {/* nav strip */}
          <nav className="flex flex-wrap gap-2">
            {TABS.map((n) => {
              const active = tab === n;
              return (
                <button
                  key={n}
                  title={n}
                  onClick={() => goTab(n)}
                  className={
                    active
                      ? "bg-primary px-2 py-0.5 text-primary-foreground"
                      : "px-2 py-0.5 text-muted-foreground hover:text-foreground"
                  }
                >
                  {active ? `> ${TAB_CODES[n]}` : TAB_CODES[n]}
                </button>
              );
            })}
          </nav>

          {children}

          {/* function-key bar */}
          <div className="sticky bottom-0 -mx-4 mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border bg-background px-4 py-1.5 sm:-mx-6 sm:px-6">
            {FKEYS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => runFkey(k)}
                className="flex items-center gap-1"
              >
                <span className="bg-secondary px-1 text-secondary-foreground">
                  {k}
                </span>
                <span className="text-muted-foreground hover:text-foreground">
                  {label}
                </span>
              </button>
            ))}
            <span className="ml-auto text-muted-foreground/50">
              <span className="text-secondary">/</span>tab.panel · d t c l s tabs
            </span>
          </div>
        </div>

        {/* "/" command line */}
        {cmdOpen && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-secondary bg-card">
            <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-1.5 text-sm sm:px-6">
              <span className="text-secondary">/</span>
              <input
                autoFocus
                value={cmdValue}
                onChange={(e) => setCmdValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runCommand(cmdValue);
                  else if (e.key === "Escape") {
                    setCmdOpen(false);
                    setCmdValue("");
                  }
                }}
                placeholder="d.dt · t.w1 · t.tt · l.tx · edit · new · light dark"
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/40"
              />
              <span className="text-muted-foreground/60">⏎ run · esc cancel</span>
            </div>
          </div>
        )}

        {/* edit-day modal */}
        {editOpen && (
          <EditModal
            date={selectedDate}
            today={today}
            onClose={() => setEditOpen(false)}
            registerActions={registerEditActions}
          />
        )}

        {/* F1 help overlay */}
        {showHelp && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4"
            onClick={() => setShowHelp(false)}
          >
            <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <TerminalFrame title="mainspring — help [F1]">
                <div className="space-y-1 text-sm">
                  <Help k="/tab.panel" v="jump to panel (e.g. /d.dt, /t.w1)" />
                  <Help k="d t c l s" v="jump to tab" />
                  <Help k="e / ⏎" v="edit selected day" />
                  <Help k="F1..F10" v="function-key actions" />
                  <Help k="Esc" v="close / cancel" />
                </div>
              </TerminalFrame>
            </div>
          </div>
        )}
      </div>
    </ShellContextProvider>
  );
}

function Help({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-28 shrink-0 text-secondary">{k}</span>
      <span className="text-muted-foreground">{v}</span>
    </div>
  );
}
