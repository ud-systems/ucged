import { type HTMLAttributes } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function RecordCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <Card
      data-stagger-item
      className={cn(
        "rounded-2xl p-4 shadow-[var(--shadow-card)] min-w-0",
        "motion-safe:transition-transform motion-safe:duration-200",
        "motion-safe:active:scale-[0.98] motion-safe:hover:shadow-[var(--shadow-card-hover)]",
        props.onClick && "cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}
