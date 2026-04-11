"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Calendar, Download, MapPin, Ticket, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface TicketData {
  eventId: string;
  eventTitle: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  userName: string;
  userEmail: string;
  rsvpId: string;
  qrCode: string;
}

export default function TicketPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/events/${eventId}/ticket`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message ?? "Failed to load ticket");
        }
        return res.json();
      })
      .then((data) => setTicket(data.ticket))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Loading your ticket...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30">
        <Ticket className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          {error ?? "Ticket not available"}
        </p>
        <Button asChild variant="outline">
          <Link href={`/events/${eventId}`}>Back to Event</Link>
        </Button>
      </div>
    );
  }

  const startTime = new Date(ticket.startTime);
  const endTime = ticket.endTime ? new Date(ticket.endTime) : null;

  function handleDownload() {
    if (!ticket) return;
    const link = document.createElement("a");
    link.href = ticket.qrCode;
    link.download = `ticket-${ticket.eventTitle.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.click();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/events/${eventId}`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Event
            </Link>
          </Button>
        </div>

        <Card className="overflow-hidden shadow-xl">
          <div className="bg-primary px-6 py-5 text-center">
            <p className="text-primary-foreground/70 text-xs font-medium uppercase tracking-wider">
              OpenLuma Event Ticket
            </p>
            <h1 className="text-primary-foreground text-2xl font-bold mt-2">
              {ticket.eventTitle}
            </h1>
          </div>

          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  {format(startTime, "EEEE, MMMM d, yyyy")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(startTime, "h:mm a")}
                  {endTime && ` - ${format(endTime, "h:mm a")}`}
                </p>
              </div>
            </div>

            {ticket.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm font-medium">{ticket.location}</p>
              </div>
            )}

            <Separator />

            <div className="text-center space-y-1">
              <p className="font-semibold text-lg">{ticket.userName}</p>
              <p className="text-sm text-muted-foreground">
                {ticket.userEmail}
              </p>
            </div>

            <div className="flex justify-center py-4">
              <img
                src={ticket.qrCode}
                alt="Ticket QR Code"
                className="rounded-lg border p-3 bg-white"
                width={260}
                height={260}
              />
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Present this QR code at the event for check-in
            </p>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleDownload}
        >
          <Download className="mr-2 h-4 w-4" />
          Download QR Code
        </Button>
      </div>
    </div>
  );
}
