"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { EventCoverImagePicker } from "@/components/events/event-cover-image-picker";
import { RichTextEditor } from "@/components/events/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface EventFormProps {
  event?: {
    id: string;
    title: string;
    description: string | null;
    coverImage: string | null;
    startTime: string;
    endTime: string | null;
    timezone: string;
    location: string | null;
    locationDetails: string | null;
    type: "in_person" | "virtual" | "hybrid";
    visibility: "public" | "private";
    capacity: number | null;
    requiresApproval: boolean;
    categoryId: string | null;
    slug?: string;
    richDescription?: string | null;
  };
}

export function EventForm({ event }: EventFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(
    event?.coverImage ?? null,
  );
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [richDescription, setRichDescription] = useState(event?.richDescription ?? "");
  const [plainDescription, setPlainDescription] = useState(event?.description ?? "");
  const isEditing = !!event;

  // Default to tomorrow 6 PM – 8 PM for new events
  const defaultStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  })();
  const defaultEnd = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(20, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  })();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      description: plainDescription || undefined,
      richDescription: richDescription || undefined,
      coverImage: coverImage || undefined,
      startTime: formData.get("startTime") as string,
      endTime: (formData.get("endTime") as string) || undefined,
      timezone: formData.get("timezone") as string,
      location: (formData.get("location") as string) || undefined,
      locationDetails: (formData.get("locationDetails") as string) || undefined,
      type: formData.get("type") as "in_person" | "virtual" | "hybrid",
      visibility: formData.get("visibility") as "public" | "private",
      capacity: formData.get("capacity")
        ? Number(formData.get("capacity"))
        : undefined,
      requiresApproval: formData.get("requiresApproval") === "on",
      ...(isEditing && slug ? { slug } : {}),
    };

    try {
      const url = isEditing ? `/api/events/${event.id}` : "/api/events";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save event");
      }

      const result = await res.json();
      toast.success(isEditing ? "Event updated!" : "Event created!");
      if (!isEditing) {
        import("canvas-confetti").then((mod) =>
          mod.default({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
          }),
        );
      }
      router.push(`/dashboard/events/${result.id ?? event?.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Cover Image</Label>
            <EventCoverImagePicker
              value={coverImage}
              onChange={setCoverImage}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="My awesome event"
              required
              defaultValue={event?.title}
            />
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="slug">Event URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">
                  /e/
                </span>
                <Input
                  id="slug"
                  placeholder="custom-url"
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "")
                        .replace(/-+/g, "-"),
                    )
                  }
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Description</Label>
            <RichTextEditor
              content={richDescription}
              onChange={(json, plain) => {
                setRichDescription(json);
                setPlainDescription(plain);
              }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Date & Time</Label>
              <Input
                id="startTime"
                name="startTime"
                type="datetime-local"
                required
                defaultValue={
                  event?.startTime
                    ? new Date(event.startTime).toISOString().slice(0, 16)
                    : defaultStart
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Date & Time</Label>
              <Input
                id="endTime"
                name="endTime"
                type="datetime-local"
                defaultValue={
                  event?.endTime
                    ? new Date(event.endTime).toISOString().slice(0, 16)
                    : defaultEnd
                }
              />
            </div>
          </div>

          <input
            type="hidden"
            name="timezone"
            value={Intl.DateTimeFormat().resolvedOptions().timeZone}
          />

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              placeholder="123 Main St, City or https://zoom.us/..."
              defaultValue={event?.location ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationDetails">Location Details</Label>
            <Input
              id="locationDetails"
              name="locationDetails"
              placeholder="Room 101, 2nd floor"
              defaultValue={event?.locationDetails ?? ""}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="type">Event Type</Label>
              <Select name="type" defaultValue={event?.type ?? "in_person"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In Person</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                name="visibility"
                defaultValue={event?.visibility ?? "public"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min={1}
                placeholder="Unlimited"
                defaultValue={event?.capacity ?? ""}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="requiresApproval"
              name="requiresApproval"
              defaultChecked={event?.requiresApproval ?? false}
            />
            <Label htmlFor="requiresApproval">Require approval for RSVPs</Label>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : isEditing
                  ? "Update Event"
                  : "Create Event"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
