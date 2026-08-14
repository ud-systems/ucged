import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  count,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  count?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div data-page-header className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight">
          {title}
          {count != null && (
            <span className="text-muted-foreground font-normal text-lg sm:text-xl ml-1">{count}</span>
          )}
        </h1>
        {description ? <p className="text-sm text-muted-foreground mt-1">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">{actions}</div> : null}
    </div>
  );
}
