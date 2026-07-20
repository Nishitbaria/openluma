"use client";

import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CloneEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClone() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/clone`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Failed to duplicate event");
      }
      const { id } = await res.json();
      toast.success("Event duplicated! Set new dates before publishing.");
      router.push(`/dashboard/events/${id}/edit`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button disabled={loading} onClick={handleClone} variant="outline">
      <Copy className="mr-2 h-4 w-4" />
      {loading ? "Duplicating..." : "Duplicate"}
    </Button>
  );
}
