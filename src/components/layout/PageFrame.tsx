import { type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";
import { usePageEnter } from "@/hooks/use-page-enter";

export function PageFrame({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  usePageEnter(ref);

  return (
    <div ref={ref} className={cn("p-4 sm:p-6 lg:p-8 flex flex-col gap-5", className)}>
      {children}
    </div>
  );
}
