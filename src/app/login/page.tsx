import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  async function signInWithGithub() {
    "use server";
    const supabase = await createClient();
    const headersList = await headers();
    const origin = headersList.get("origin") || headersList.get("x-forwarded-host") || "http://localhost:3000";
    const redirectTo = origin.startsWith("http") ? `${origin}/auth/callback` : `https://${origin}/auth/callback`;

    const { data } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo,
      },
    });

    if (data.url) {
      redirect(data.url);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center gap-3 pb-2">
          <Image
            src="/logo-lockup.svg"
            alt="Mainspring"
            width={220}
            height={80}
            priority
            className="dark:hidden"
          />
          <Image
            src="/logo-lockup.svg"
            alt="Mainspring"
            width={220}
            height={80}
            priority
            className="hidden dark:block invert"
          />
          <CardDescription className="text-center">
            The mechanism behind your working hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signInWithGithub}>
            <Button type="submit" className="w-full" size="lg">
              Sign in with GitHub
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
