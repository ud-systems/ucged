import { useRef } from "react";
import { Link } from "react-router-dom";
import type { PerformanceActivity } from "@/hooks/use-cge-data";
import { Badge } from "@/components/ui/badge";
import { useStaggerIn } from "@/hooks/use-stagger-in";

export function ActivityFeed({ items, showCge }: { items: PerformanceActivity[]; showCge: boolean }) {
  const listRef = useRef<HTMLUListElement>(null);
  useStaggerIn(listRef, "[data-stagger-item]", [items]);

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
      <h2 className="font-heading text-lg font-semibold">Recent activity</h2>
      <p className="text-xs text-muted-foreground mb-3">Latest outreach in this period</p>
      <ul ref={listRef} className="flex flex-col gap-2 max-h-[360px] overflow-y-auto">
        {items.map((item) => (
          <li key={item.id} data-stagger-item className="rounded-xl border px-3 py-2.5 text-sm min-w-0">
            <div className="flex justify-between gap-2">
              <Link to={`/customers/${item.customer_id}`} className="font-medium hover:underline truncate min-w-0">
                {item.customer_name || "Customer"}
              </Link>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {new Date(item.created_at).toLocaleString()}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              <Badge variant="outline" className="capitalize text-[10px]">
                {item.channel}
              </Badge>
              {item.outcome && (
                <Badge variant="secondary" className="capitalize text-[10px]">
                  {item.outcome.replace("_", " ")}
                </Badge>
              )}
              {showCge && item.cge_name && (
                <span className="text-[11px] text-muted-foreground truncate">{item.cge_name}</span>
              )}
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="py-8 text-center text-sm text-muted-foreground">No activity yet.</li>
        )}
      </ul>
    </div>
  );
}
