import { Badge } from "@/components/ui/badge";
import { typeBorder, typeCode, typeColor, typeLabel } from "@/lib/tui/types";

// Consistent entry/leave-type tag — same code + colour everywhere it appears.
// `type` is a DB enum value (work / annual_leave / …).
export function TypeTag({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      title={typeLabel(type)}
      className={`w-16 justify-center ${typeColor(type)} ${typeBorder(type)} ${
        className ?? ""
      }`}
    >
      {typeCode(type)}
    </Badge>
  );
}
