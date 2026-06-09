import { TerminalFrame } from "./terminal-frame";

// Placeholder panel — replaced by the real data-backed panel in Phase 4.
export function PanelStub({
  panelId,
  title,
  note,
}: {
  panelId: string;
  title: string;
  note: string;
}) {
  return (
    <TerminalFrame panelId={panelId} title={title}>
      <p className="text-muted-foreground">
        <span className="text-secondary">$</span> {note} — wired to Supabase in
        Phase 4.
      </p>
    </TerminalFrame>
  );
}
