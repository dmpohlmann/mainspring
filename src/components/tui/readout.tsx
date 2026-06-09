// A right-aligned key/value line for the live-calc and week-running readouts.
export function Readout({
  k,
  v,
  cls,
}: {
  k: string;
  v: string;
  cls?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-bold ${cls ?? ""}`}>{v}</span>
    </div>
  );
}
