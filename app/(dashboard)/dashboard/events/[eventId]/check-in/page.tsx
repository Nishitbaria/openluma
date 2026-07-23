"use client";

import {
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CheckinRecord {
  checkedInAt: string;
  id: string;
  user: { id: string; name: string; email: string };
  userId: string;
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
      .catch(() => {
        // ignore: best-effort initial load, list stays empty
      });
  }, [eventId]);

  const handleCheckIn = useCallback(
    async (userId: string) => {
      if (loading) {
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/events/${eventId}/check-in`, {
          body: JSON.stringify({ userId }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        const data = await res.json();

        if (res.ok || data.message === "Already checked in") {
          const isAlready = data.message === "Already checked in";
          setLastResult({
            message: isAlready
              ? "Already checked in"
              : "Checked in successfully!",
            success: true,
          });
          toast.success(
            isAlready ? "Already checked in" : "Checked in successfully!"
          );

          // Refresh check-in list
          const listRes = await fetch(`/api/events/${eventId}/check-in`);
          const listData = await listRes.json();
          setCheckins(listData.checkins ?? []);
        } else {
          setLastResult({ message: data.message, success: false });
          toast.error(data.message);
        }
      } catch {
        setLastResult({ message: "Check-in failed", success: false });
        toast.error("Check-in failed");
      } finally {
        setLoading(false);
        // Clear result after 3s
        setTimeout(() => setLastResult(null), 3000);
      }
    },
    [eventId, loading]
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
        { fps: 10, qrbox: { height: 250, width: 250 } },
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
        }
      );
    } catch {
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
  useEffect(
    () => () => {
      const scanner = html5QrScannerRef.current as {
        stop: () => Promise<void>;
      } | null;
      if (scanner) {
        scanner.stop().catch(() => {
          // ignore: best-effort cleanup on unmount
        });
      }
    },
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild size="icon" variant="ghost">
          <Link href={`/dashboard/events/${eventId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Ticket Scanner</h1>
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
                onClick={scanning ? stopScanner : startScanner}
                size="sm"
                variant={scanning ? "destructive" : "default"}
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
              className="overflow-hidden rounded-lg bg-muted"
              id="qr-reader"
              ref={scannerRef}
              style={{ minHeight: scanning ? 300 : 0 }}
            />

            {!scanning && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Camera className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">
                  Click &quot;Start Scanner&quot; to open the camera and scan
                  attendee QR codes
                </p>
              </div>
            )}

            {/* Scan result feedback */}
            {lastResult ? (
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
                  className={`font-medium text-sm ${
                    lastResult.success
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {lastResult.message}
                </p>
              </div>
            ) : null}
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
              <p className="py-8 text-center text-muted-foreground text-sm">
                No one checked in yet.
              </p>
            ) : (
              <div className="max-h-[400px] divide-y overflow-y-auto">
                {checkins.map((c) => (
                  <div className="flex items-center gap-3 py-3" key={c.id}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">
                        {c.user.name}
                      </p>
                      <p className="truncate text-muted-foreground text-xs">
                        {c.user.email}
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-muted-foreground text-xs">
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
