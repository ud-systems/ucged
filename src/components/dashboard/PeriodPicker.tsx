import type { PeriodKey } from "@/lib/performance-period";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
      <ToggleGroup
        type="single"
        value={periodKey}
        onValueChange={(v) => {
          if (v) onPeriodKeyChange(v as PeriodKey);
        }}
        variant="outline"
        size="sm"
        className="flex flex-wrap justify-start w-full sm:w-auto"
      >
        {CHIPS.map((c) => (
          <ToggleGroupItem
            key={c.key}
            value={c.key}
            className="rounded-full px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {c.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {periodKey === "custom" && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
          <Input
            type="date"
            className="w-full sm:w-auto h-8 rounded-xl text-xs"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
          />
          <span className="text-xs text-muted-foreground hidden sm:inline">to</span>
          <Input
            type="date"
            className="w-full sm:w-auto h-8 rounded-xl text-xs"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
