import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { Header } from "./header";

interface AppShellProps {
  children: React.ReactNode;
  user: {
    email?: string;
    avatar_url?: string;
    full_name?: string;
  } | null;
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
