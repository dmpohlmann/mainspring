"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";

interface HeaderProps {
  user: {
    email?: string;
    avatar_url?: string;
    full_name?: string;
  } | null;
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <h1 className="text-lg font-bold md:hidden">Mainspring</h1>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" />}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar_url} alt={user.full_name || "User"} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {user.email}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <form action="/auth/signout" method="post" className="w-full">
                  <button type="submit" className="flex w-full items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
