import { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { TimeseriesPoint } from "@/hooks/use-cge-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  outreach_count: {
    label: "Outreach",
    color: "hsl(var(--chart-1))",
  },
  recoveries: {
    label: "Recoveries",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

function formatDayTick(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TrendChart({ points }: { points: TimeseriesPoint[] }) {
  const reactId = useId().replace(/:/g, "");
  const outreachFill = `fillOutreach-${reactId}`;
  const recoveryFill = `fillRecoveries-${reactId}`;

  const data = useMemo(
    () =>
      points.map((p) => ({
        date: typeof p.day === "string" ? p.day.slice(0, 10) : String(p.day),
        outreach_count: Number(p.outreach_count ?? 0),
        recoveries: Number(p.recoveries ?? 0),
      })),
    [points],
  );

  return (
    <Card className="rounded-2xl pt-0 shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-col gap-1 border-b py-4 sm:py-5 p-4 sm:p-6">
        <CardTitle className="font-heading text-lg">Trend</CardTitle>
        <CardDescription>Daily outreach vs recoveries for the selected period</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No data for this period.</p>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[180px] sm:h-[250px] w-full">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={outreachFill} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-outreach_count)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-outreach_count)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id={recoveryFill} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-recoveries)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-recoveries)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={formatDayTick}
              />
              <YAxis domain={[0, "auto"]} hide allowDataOverflow={false} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => formatDayTick(String(value))}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="recoveries"
                type="monotone"
                fill={`url(#${recoveryFill})`}
                stroke="var(--color-recoveries)"
                strokeWidth={2}
                baseValue={0}
              />
              <Area
                dataKey="outreach_count"
                type="monotone"
                fill={`url(#${outreachFill})`}
                stroke="var(--color-outreach_count)"
                strokeWidth={2}
                baseValue={0}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
