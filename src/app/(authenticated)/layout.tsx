import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/app-shell";
import { appToday } from "@/lib/utils/today";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = appToday();

  return (
    <AppShell user={user ? { email: user.email ?? undefined } : null} today={today}>
      {children}
    </AppShell>
  );
}
