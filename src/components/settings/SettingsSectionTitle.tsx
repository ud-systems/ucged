import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function SettingsSectionTitle({
  title,
  tip,
}: {
  title: string;
  tip: string;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2">
        <h2 className="font-heading font-semibold">{title}</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label={`${title} help`}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" align="center" className="max-w-xs text-xs leading-relaxed">
            {tip}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
