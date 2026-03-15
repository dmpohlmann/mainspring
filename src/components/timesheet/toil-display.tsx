import { cn } from "@/lib/utils";
import { formatToilMinutes } from "@/lib/utils/format";

interface ToilDisplayProps {
  minutes: number;
  className?: string;
}

export function ToilDisplay({ minutes, className }: ToilDisplayProps) {
  return (
    <span
      className={cn(
        minutes > 0 && "text-green-600 dark:text-green-400",
        minutes < 0 && "text-red-600 dark:text-red-400",
        minutes === 0 && "text-muted-foreground",
        className
      )}
    >
      {formatToilMinutes(minutes)}
    </span>
  );
}
