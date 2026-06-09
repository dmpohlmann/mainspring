// Low-level HH:MM ↔ minutes conversions. Day/flex maths live in entry-calc.ts
// (the segment engine); the old single-field TOIL helpers were retired with the
// model shift to segments.

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
