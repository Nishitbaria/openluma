"use client";

import {
  Eye,
  MousePointerClick,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EventAnalyticsProps {
  dateFrom: string;
  dateTo: string;
  eventId: string;
  funnel: {
    totalViews: number;
    uniqueViews: number;
    totalRsvps: number;
    approved: number;
    checkedIn: number;
  };
  referrers: { name: string; count: number }[];
  viewsByDay: { date: string; views: number }[];
}

const chartConfig = {
  views: {
    color: "hsl(var(--primary))",
    label: "Views",
  },
};

function toInputDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export function EventAnalytics({
  funnel,
  viewsByDay,
  referrers,
  dateFrom,
  dateTo,
  eventId,
}: EventAnalyticsProps) {
  const router = useRouter();
  const [from, setFrom] = useState(toInputDate(dateFrom));
  const [to, setTo] = useState(toInputDate(dateTo));

  function applyDateRange() {
    router.push(
      `/dashboard/events/${eventId}?tab=insights&dateFrom=${from}&dateTo=${to}`
    );
  }

  const statCards = [
    {
      description: "All page visits",
      icon: Eye,
      label: "Total Views",
      value: funnel.totalViews,
    },
    {
      description: "Distinct visitors",
      icon: Users,
      label: "Unique Views",
      value: funnel.uniqueViews,
    },
    {
      description: "All registrations",
      icon: MousePointerClick,
      label: "Total RSVPs",
      value: funnel.totalRsvps,
    },
    {
      description: "Confirmed attendees",
      icon: UserCheck,
      label: "Approved",
      value: funnel.approved,
    },
    {
      description: "Views → RSVPs",
      icon: TrendingUp,
      label: "Conversion",
      value:
        funnel.totalViews > 0
          ? `${((funnel.totalRsvps / funnel.totalViews) * 100).toFixed(1)}%`
          : "0%",
    },
  ];

  const funnelSteps = [
    { color: "bg-primary", label: "Page Views", value: funnel.totalViews },
    { color: "bg-primary/80", label: "RSVPs", value: funnel.totalRsvps },
    { color: "bg-primary/60", label: "Approved", value: funnel.approved },
    { color: "bg-primary/40", label: "Checked In", value: funnel.checkedIn },
  ];
  const funnelMax = Math.max(funnel.totalViews, 1);

  if (funnel.totalViews === 0 && funnel.totalRsvps === 0) {
    return (
      <div className="space-y-4">
        <DateRangePicker
          from={from}
          onApply={applyDateRange}
          setFrom={setFrom}
          setTo={setTo}
          to={to}
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Eye className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No data yet</p>
            <p className="max-w-xs text-muted-foreground text-sm">
              Share your event link to start tracking page views and
              registrations.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date range picker */}
      <DateRangePicker
        from={from}
        onApply={applyDateRange}
        setFrom={setFrom}
        setTo={setTo}
        to={to}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between px-4 pt-4 pb-1">
              <CardTitle className="font-medium text-muted-foreground text-xs">
                {s.label}
              </CardTitle>
              <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="font-bold text-2xl">{s.value}</p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                {s.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Area chart */}
      <Card>
        <CardHeader>
          <CardTitle className="font-medium text-sm">Views Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer className="h-[220px] w-full" config={chartConfig}>
            <AreaChart
              data={viewsByDay}
              margin={{ bottom: 0, left: -20, right: 8, top: 4 }}
            >
              <defs>
                <linearGradient id="viewsGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid className="stroke-border" strokeDasharray="3 3" />
              <XAxis
                axisLine={false}
                dataKey="date"
                interval="preserveStartEnd"
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Area
                activeDot={{ r: 4 }}
                dataKey="views"
                dot={false}
                fill="url(#viewsGrad)"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Funnel + Referrers */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* RSVP Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="font-medium text-sm">RSVP Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnelSteps.map((step, i) => (
              <div className="space-y-1" key={step.label}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{step.label}</span>
                  <span className="font-medium tabular-nums">
                    {step.value}
                    {i > 0 && funnelSteps[i - 1].value > 0 && (
                      <span className="ml-1.5 font-normal text-muted-foreground text-xs">
                        (
                        {Math.round(
                          (step.value / funnelSteps[i - 1].value) * 100
                        )}
                        %)
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${step.color} transition-all`}
                    style={{
                      width: `${Math.round((step.value / funnelMax) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Referrers */}
        <Card>
          <CardHeader>
            <CardTitle className="font-medium text-sm">Top Referrers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {referrers.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground text-sm">
                No referrer data yet.
              </p>
            ) : (
              referrers.map((ref) => (
                <div className="space-y-1" key={ref.name}>
                  <div className="flex justify-between text-sm">
                    <span className="max-w-[160px] truncate text-muted-foreground">
                      {ref.name}
                    </span>
                    <span className="font-medium tabular-nums">
                      {ref.count}
                      <span className="ml-1.5 font-normal text-muted-foreground text-xs">
                        (
                        {funnel.totalViews > 0
                          ? Math.round((ref.count / funnel.totalViews) * 100)
                          : 0}
                        %)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all"
                      style={{
                        width: `${funnel.totalViews > 0 ? Math.round((ref.count / funnel.totalViews) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DateRangePicker({
  from,
  to,
  setFrom,
  setTo,
  onApply,
}: {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  onApply: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-muted-foreground text-xs">From</Label>
        <Input
          className="h-8 w-36 text-sm"
          onChange={(e) => setFrom(e.target.value)}
          type="date"
          value={from}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-muted-foreground text-xs">To</Label>
        <Input
          className="h-8 w-36 text-sm"
          onChange={(e) => setTo(e.target.value)}
          type="date"
          value={to}
        />
      </div>
      <Button className="h-8" onClick={onApply} size="sm">
        Apply
      </Button>
    </div>
  );
}
