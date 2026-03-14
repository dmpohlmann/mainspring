import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userData = user
    ? {
        email: user.email,
        avatar_url: user.user_metadata?.avatar_url,
        full_name: user.user_metadata?.full_name,
      }
    : null;

  return <AppShell user={userData}>{children}</AppShell>;
}
