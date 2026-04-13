"use client";

import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InviteForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"attendee" | "cohost">("attendee");
  const [loading, setLoading] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Failed to send invitation");
        return;
      }
      toast.success(
        role === "cohost"
          ? `Co-host invitation sent to ${email}`
          : `Invitation sent to ${email}`,
      );
      setEmail("");
      setRole("attendee");
      router.refresh();
    } catch {
      toast.error("Failed to send invitation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Send Invitation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInvite} className="flex gap-2">
          <Input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1"
          />
          <Select
            value={role}
            onValueChange={(v) => setRole(v as "attendee" | "cohost")}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="attendee">Attendee</SelectItem>
              <SelectItem value="cohost">Co-host</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={loading}>
            <Mail className="mr-2 h-4 w-4" />
            {loading ? "Sending..." : "Invite"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
