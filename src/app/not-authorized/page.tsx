import Link from "next/link";
import { TerminalFrame } from "@/components/tui/terminal-frame";

export default function NotAuthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md">
        <TerminalFrame title="mainspring — ~/not-authorized [403]">
          <div className="space-y-3 text-sm">
            <p className="text-[var(--c-neg)]">
              <span className="text-secondary">$</span> access denied
            </p>
            <p className="text-muted-foreground">
              This GitHub account is not authorised to access this application.
            </p>
            <Link
              href="/login"
              className="inline-block border border-border px-3 py-1.5 hover:bg-muted"
            >
              <span className="text-secondary">←</span> back to login
            </Link>
          </div>
        </TerminalFrame>
      </div>
    </div>
  );
}
