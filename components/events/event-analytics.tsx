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
  funnel: {
    totalViews: number;
    uniqueViews: number;
    totalRsvps: number;
    approved: number;
    checkedIn: number;
  };
  viewsByDay: { date: string; views: number }[];
  referrers: { name: string; count: number }[];
  dateFrom: string;
  dateTo: string;
  eventId: string;
}

const chartConfig = {
  views: {
    label: "Views",
    color: "hsl(var(--primary))",
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
      `/dashboard/events/${eventId}?tab=insights&dateFrom=${from}&dateTo=${to}`,
    );
  }

  const statCards = [
    {
      label: "Total Views",
      value: funnel.totalViews,
      icon: Eye,
      description: "All page visits",
    },
    {
      label: "Unique Views",
      value: funnel.uniqueViews,
      icon: Users,
      description: "Distinct visitors",
    },
    {
      label: "Total RSVPs",
      value: funnel.totalRsvps,
      icon: MousePointerClick,
      description: "All registrations",
    },
    {
      label: "Approved",
      value: funnel.approved,
      icon: UserCheck,
      description: "Confirmed attendees",
    },
    {
      label: "Conversion",
      value:
        funnel.totalViews > 0
          ? `${((funnel.totalRsvps / funnel.totalViews) * 100).toFixed(1)}%`
          : "0%",
      icon: TrendingUp,
      description: "Views → RSVPs",
    },
  ];

  const funnelSteps = [
    { label: "Page Views", value: funnel.totalViews, color: "bg-primary" },
    { label: "RSVPs", value: funnel.totalRsvps, color: "bg-primary/80" },
    { label: "Approved", value: funnel.approved, color: "bg-primary/60" },
    { label: "Checked In", value: funnel.checkedIn, color: "bg-primary/40" },
  ];
  const funnelMax = Math.max(funnel.totalViews, 1);

  if (funnel.totalViews === 0 && funnel.totalRsvps === 0) {
    return (
      <div className="space-y-4">
        <DateRangePicker
          from={from}
          to={to}
          setFrom={setFrom}
          setTo={setTo}
          onApply={applyDateRange}
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Eye className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No data yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
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
        to={to}
        setFrom={setFrom}
        setTo={setTo}
        onApply={applyDateRange}
      />

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {s.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Area chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Views Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <AreaChart
              data={viewsByDay}
              margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
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
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="views"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#viewsGrad)"
                dot={false}
                activeDot={{ r: 4 }}
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
            <CardTitle className="text-sm font-medium">RSVP Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnelSteps.map((step, i) => (
              <div key={step.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{step.label}</span>
                  <span className="font-medium tabular-nums">
                    {step.value}
                    {i > 0 && funnelSteps[i - 1].value > 0 && (
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                        (
                        {Math.round(
                          (step.value / funnelSteps[i - 1].value) * 100,
                        )}
                        %)
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
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
            <CardTitle className="text-sm font-medium">Top Referrers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {referrers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No referrer data yet.
              </p>
            ) : (
              referrers.map((ref) => (
                <div key={ref.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate max-w-[160px]">
                      {ref.name}
                    </span>
                    <span className="font-medium tabular-nums">
                      {ref.count}
                      <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                        (
                        {funnel.totalViews > 0
                          ? Math.round((ref.count / funnel.totalViews) * 100)
                          : 0}
                        %)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
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
        <Label className="text-xs text-muted-foreground">From</Label>
        <Input
          type="date"
          className="h-8 w-36 text-sm"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">To</Label>
        <Input
          type="date"
          className="h-8 w-36 text-sm"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <Button size="sm" className="h-8" onClick={onApply}>
        Apply
      </Button>
    </div>
  );
}
