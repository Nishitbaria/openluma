"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface CheckinRecord {
  id: string;
  userId: string;
  checkedInAt: string;
  user: { id: string; name: string; email: string };
}

export default function CheckInPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [scanning, setScanning] = useState(false);
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrScannerRef = useRef<unknown>(null);

  // Load existing check-ins
  useEffect(() => {
    fetch(`/api/events/${eventId}/check-in`)
      .then((res) => res.json())
      .then((data) => setCheckins(data.checkins ?? []))
      .catch(() => {});
  }, [eventId]);

  const handleCheckIn = useCallback(
    async (userId: string) => {
      if (loading) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/events/${eventId}/check-in`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        const data = await res.json();

        if (res.ok || data.message === "Already checked in") {
          const isAlready = data.message === "Already checked in";
          setLastResult({
            success: true,
            message: isAlready
              ? "Already checked in"
              : "Checked in successfully!",
          });
          toast.success(
            isAlready ? "Already checked in" : "Checked in successfully!",
          );

          // Refresh check-in list
          const listRes = await fetch(`/api/events/${eventId}/check-in`);
          const listData = await listRes.json();
          setCheckins(listData.checkins ?? []);
        } else {
          setLastResult({ success: false, message: data.message });
          toast.error(data.message);
        }
      } catch {
        setLastResult({ success: false, message: "Check-in failed" });
        toast.error("Check-in failed");
      } finally {
        setLoading(false);
        // Clear result after 3s
        setTimeout(() => setLastResult(null), 3000);
      }
    },
    [eventId, loading],
  );

  async function startScanner() {
    setScanning(true);
    // Dynamic import to avoid SSR issues
    const { Html5Qrcode } = await import("html5-qrcode");

    const scanner = new Html5Qrcode("qr-reader");
    html5QrScannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          try {
            const payload = JSON.parse(decodedText);
            if (payload.userId && payload.eventId === eventId) {
              handleCheckIn(payload.userId);
              // Pause briefly to prevent duplicate scans
              scanner.pause(true);
              setTimeout(() => {
                try {
                  scanner.resume();
                } catch {
                  // scanner may have been stopped
                }
              }, 2000);
            } else {
              toast.error("Invalid QR code for this event");
            }
          } catch {
            toast.error("Invalid QR code format");
          }
        },
        () => {
          // Ignore scan failures (no QR detected)
        },
      );
    } catch (err) {
      toast.error("Could not access camera. Please allow camera permissions.");
      setScanning(false);
    }
  }

  async function stopScanner() {
    const scanner = html5QrScannerRef.current as {
      stop: () => Promise<void>;
    } | null;
    if (scanner) {
      try {
        await scanner.stop();
      } catch {
        // already stopped
      }
    }
    html5QrScannerRef.current = null;
    setScanning(false);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const scanner = html5QrScannerRef.current as {
        stop: () => Promise<void>;
      } | null;
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/dashboard/events/${eventId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Ticket Scanner
          </h1>
          <p className="text-muted-foreground">
            Scan attendee QR codes to check them in
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              QR Scanner
              <Button
                variant={scanning ? "destructive" : "default"}
                size="sm"
                onClick={scanning ? stopScanner : startScanner}
              >
                {scanning ? (
                  <>
                    <CameraOff className="mr-2 h-4 w-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Start Scanner
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              id="qr-reader"
              ref={scannerRef}
              className="overflow-hidden rounded-lg bg-muted"
              style={{ minHeight: scanning ? 300 : 0 }}
            />

            {!scanning && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  Click &quot;Start Scanner&quot; to open the camera and scan
                  attendee QR codes
                </p>
              </div>
            )}

            {/* Scan result feedback */}
            {lastResult && (
              <div
                className={`mt-4 flex items-center gap-3 rounded-lg border p-4 ${
                  lastResult.success
                    ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                    : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
                }`}
              >
                {lastResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <p
                  className={`text-sm font-medium ${
                    lastResult.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {lastResult.message}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Check-in list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Checked In
              </span>
              <Badge variant="secondary">{checkins.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checkins.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No one checked in yet.
              </p>
            ) : (
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {checkins.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {c.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.user.email}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(c.checkedInAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
