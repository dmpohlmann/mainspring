// "Today" as a YYYY-MM-DD string in the app's timezone. en-CA formats as
// ISO-style; Australia/Brisbane has no DST so the calendar day is unambiguous.
export function appToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
  }).format(new Date());
}
