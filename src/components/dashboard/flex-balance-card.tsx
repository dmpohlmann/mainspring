import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { formatFlexMinutes } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface FlexBalanceCardProps {
  flexMinutes: number;
}

export function FlexBalanceCard({ flexMinutes }: FlexBalanceCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Flex Balance</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-2xl font-bold",
            flexMinutes > 0 && "text-green-600 dark:text-green-400",
            flexMinutes < 0 && "text-red-600 dark:text-red-400",
            flexMinutes === 0 && "text-muted-foreground"
          )}
          aria-live="polite"
        >
          {formatFlexMinutes(flexMinutes)}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Running total</p>
      </CardContent>
    </Card>
  );
}
