import { Badge } from "@/components/ui/badge";
import { formatStatusLabel, statusBadgeClass } from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusBadge({
  value,
  className,
}: {
  value?: string | null;
  className?: string;
}) {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <Badge variant="outline" className={cn("capitalize font-medium", statusBadgeClass(trimmed), className)}>
      {formatStatusLabel(trimmed)}
    </Badge>
  );
}
