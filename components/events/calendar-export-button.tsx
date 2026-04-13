"use client";

import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatICSDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function CalendarExportButton({
  event,
}: {
  event: {
    title: string;
    description: string | null;
    startTime: string;
    endTime: string | null;
    location: string | null;
    id: string;
  };
}) {
  function handleExport() {
    const start = new Date(event.startTime);
    const end = event.endTime
      ? new Date(event.endTime)
      : new Date(start.getTime() + 60 * 60 * 1000);

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//OpenLuma//Event//EN",
      "BEGIN:VEVENT",
      `DTSTART:${formatICSDate(start)}`,
      `DTEND:${formatICSDate(end)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description ?? ""}`,
      `LOCATION:${event.location ?? ""}`,
      `URL:${window.location.origin}/events/${event.id}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, "-").toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" className="w-full" onClick={handleExport}>
      <Calendar className="mr-2 h-4 w-4" />
      Add to Calendar
    </Button>
  );
}
