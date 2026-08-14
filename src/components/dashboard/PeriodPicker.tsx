import type { PeriodKey } from "@/lib/performance-period";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CHIPS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
];

export function PeriodPicker({
  periodKey,
  onPeriodKeyChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}: {
  periodKey: PeriodKey;
  onPeriodKeyChange: (k: PeriodKey) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onPeriodKeyChange(c.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs border transition-colors",
              periodKey === c.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      {periodKey === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            className="w-auto h-8 rounded-xl text-xs"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            className="w-auto h-8 rounded-xl text-xs"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
