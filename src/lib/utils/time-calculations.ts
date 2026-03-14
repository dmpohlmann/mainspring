const STANDARD_DAY_MINUTES = 450; // 7h 30m

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function calculateWorkedMinutes(
  startTime: string,
  endTime: string,
  lunchStart: string,
  lunchEnd: string
): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const lStart = timeToMinutes(lunchStart);
  const lEnd = timeToMinutes(lunchEnd);
  const totalMinutes = end - start;
  const lunchMinutes = lEnd - lStart;
  return totalMinutes - lunchMinutes;
}

export function calculateFlexMinutes(
  workedMinutes: number,
  standardDayMinutes: number = STANDARD_DAY_MINUTES
): number {
  return workedMinutes - standardDayMinutes;
}

export function calculateLunchDuration(
  lunchStart: string,
  lunchEnd: string
): number {
  return timeToMinutes(lunchEnd) - timeToMinutes(lunchStart);
}
