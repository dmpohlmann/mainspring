import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palmtree, Heart, ArrowRightLeft } from "lucide-react";
import type { LeaveBalance } from "@/lib/types/database";

interface LeaveBalanceCardsProps {
  balances: LeaveBalance[];
}

const leaveConfig = {
  annual: { label: "Annual Leave", icon: Palmtree, color: "text-blue-600 dark:text-blue-400" },
  personal: { label: "Personal Leave", icon: Heart, color: "text-orange-600 dark:text-orange-400" },
  toil: { label: "TOIL", icon: ArrowRightLeft, color: "text-purple-600 dark:text-purple-400" },
};

export function LeaveBalanceCards({ balances }: LeaveBalanceCardsProps) {
  const types = ["annual", "personal", "toil"] as const;

  return (
    <>
      {types.map((type) => {
        const balance = balances.find((b) => b.leave_type === type);
        const config = leaveConfig[type];
        const hours = balance?.balance_hours ?? 0;
        const days = Number(hours) / 7.5;

        return (
          <Card key={type}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
              <config.icon className={`h-4 w-4 ${config.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{days.toFixed(1)}d</div>
              <p className="text-xs text-muted-foreground mt-1">
                {Number(hours).toFixed(1)} hours
              </p>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
