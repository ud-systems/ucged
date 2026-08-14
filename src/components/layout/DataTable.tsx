import { type ReactNode } from "react";
import { RecordsLoadingOverlay } from "@/components/ui/records-loading-overlay";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function DataTableShell({
  children,
  loading,
  className,
}: {
  children: ReactNode;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative rounded-2xl border bg-card overflow-hidden shadow-[var(--shadow-card)]", className)}>
      {loading ? <RecordsLoadingOverlay /> : null}
      {children}
    </div>
  );
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
