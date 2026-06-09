import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { TerminalFrame } from "@/components/tui/terminal-frame";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function signInWithGithub() {
    "use server";
    const supabase = await createClient();
    const headersList = await headers();
    const origin =
      headersList.get("origin") ||
      headersList.get("x-forwarded-host") ||
      "http://localhost:3000";
    const redirectTo = origin.startsWith("http")
      ? `${origin}/auth/callback`
      : `https://${origin}/auth/callback`;

    const { data } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
    });

    if (data.url) {
      redirect(data.url);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md">
        <TerminalFrame title="mainspring — ~/login">
          <div className="space-y-4 text-sm">
            <div className="flex items-baseline gap-2">
              <span className="text-secondary">▰▰</span>
              <span className="font-bold tracking-tight">mainspring</span>
            </div>
            <p className="text-muted-foreground">
              the mechanism behind your working hours
            </p>

            {error && (
              <p className="text-[var(--c-neg)]">
                <span className="text-secondary">$</span> sign-in failed — try
                again
              </p>
            )}

            <p className="text-muted-foreground">
              <span className="text-secondary">$</span> authenticate to continue
            </p>
            <form action={signInWithGithub}>
              <button
                type="submit"
                className="w-full border border-border px-3 py-1.5 text-left hover:bg-muted"
              >
                <span className="text-secondary">→</span> sign in with GitHub
              </button>
            </form>
          </div>
        </TerminalFrame>
      </div>
    </div>
  );
}
