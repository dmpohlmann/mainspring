import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/app-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Today in the app's timezone (en-CA formats as YYYY-MM-DD).
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
  }).format(new Date());

  return (
    <AppShell user={user ? { email: user.email ?? undefined } : null} today={today}>
      {children}
    </AppShell>
  );
}
