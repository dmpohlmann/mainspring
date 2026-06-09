// Box-drawing window chrome. A panel is a TerminalFrame with a panelId so it can
// be navigated + highlighted. Presentational only (usable in server or client).

export function TerminalFrame({
  title,
  children,
  panelId,
  active,
}: {
  title: string;
  children: React.ReactNode;
  panelId?: string;
  active?: boolean;
}) {
  return (
    <div
      id={panelId ? `panel-${panelId}` : undefined}
      className={`border bg-card ${
        active ? "border-secondary ring-1 ring-secondary/50" : "border-border"
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b px-3 py-1.5 ${
          active
            ? "border-secondary/50 bg-secondary/10 text-foreground"
            : "border-border bg-muted text-muted-foreground"
        }`}
      >
        <span className="text-red-500">●</span>
        <span className="text-yellow-500">●</span>
        <span className="text-green-500">●</span>
        <span className="ml-2 truncate">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
