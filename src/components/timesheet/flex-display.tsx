import { cn } from "@/lib/utils";
import { formatFlexMinutes } from "@/lib/utils/format";

interface FlexDisplayProps {
  minutes: number;
  className?: string;
}

export function FlexDisplay({ minutes, className }: FlexDisplayProps) {
  return (
    <span
      className={cn(
        minutes > 0 && "text-green-600 dark:text-green-400",
        minutes < 0 && "text-red-600 dark:text-red-400",
        minutes === 0 && "text-muted-foreground",
        className
      )}
    >
      {formatFlexMinutes(minutes)}
    </span>
  );
}
