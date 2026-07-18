"use client";

import { ChevronsUpDown, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DateTimePicker } from "@/components/events/date-time-picker";
import { EventCoverImagePicker } from "@/components/events/event-cover-image-picker";
import { RichTextEditor } from "@/components/events/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
    return d;
  })();
  const defaultEnd = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(20, 0, 0, 0);
    return d;
  })();

  const [startTime, setStartTime] = useState<Date>(
    event?.startTime ? new Date(event.startTime) : defaultStart,
  );
  const [endTime, setEndTime] = useState<Date>(
    event?.endTime ? new Date(event.endTime) : defaultEnd,
  );

  // Secondary/collapsed fields are held in controlled state so the submitted
  // payload is identical whether "More options" is open or closed.
  const [locationDetails, setLocationDetails] = useState(
    event?.locationDetails ?? "",
  );
  const [type, setType] = useState<"in_person" | "virtual" | "hybrid">(
    event?.type ?? "in_person",
  );
  const [visibility, setVisibility] = useState<"public" | "private">(
    event?.visibility ?? "public",
  );
  const [capacity, setCapacity] = useState(
    event?.capacity != null ? String(event.capacity) : "",
  );
  const [requiresApproval, setRequiresApproval] = useState(
    event?.requiresApproval ?? false,
  );
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(isEditing);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      description: plainDescription || undefined,
      richDescription: richDescription || undefined,
      coverImage: coverImage || undefined,
      startTime: startTime.toISOString(),
      endTime: endTime ? endTime.toISOString() : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      location: (formData.get("location") as string) || undefined,
      locationDetails: locationDetails || undefined,
      type,
      visibility,
      capacity: capacity ? Number(capacity) : undefined,
      requiresApproval,
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
            <Label htmlFor="title" className="sr-only">
              Event name
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="Event name"
              required
              defaultValue={event?.title}
              className="h-auto border-none px-0 text-3xl font-semibold tracking-tight shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
            />
          </div>

          <div className="space-y-2">
            <Label>Cover Image</Label>
            <EventCoverImagePicker
              value={coverImage}
              onChange={setCoverImage}
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
            <DateTimePicker value={startTime} onChange={setStartTime} label="Start" />
            <DateTimePicker value={endTime} onChange={setEndTime} label="End" />
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Globe className="size-3.5" />
            {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              placeholder="123 Main St, City or https://zoom.us/..."
              defaultValue={event?.location ?? ""}
            />
          </div>

          <Collapsible open={moreOptionsOpen} onOpenChange={setMoreOptionsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-auto gap-1.5 px-0 text-sm text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                <ChevronsUpDown className="size-4" />
                More options
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="locationDetails">Location Details</Label>
                <Input
                  id="locationDetails"
                  placeholder="Room 101, 2nd floor"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="type">Event Type</Label>
                  <Select
                    value={type}
                    onValueChange={(v) =>
                      setType(v as "in_person" | "virtual" | "hybrid")
                    }
                  >
                    <SelectTrigger id="type">
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
                    value={visibility}
                    onValueChange={(v) =>
                      setVisibility(v as "public" | "private")
                    }
                  >
                    <SelectTrigger id="visibility">
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
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="requiresApproval"
                  checked={requiresApproval}
                  onCheckedChange={setRequiresApproval}
                />
                <Label htmlFor="requiresApproval">
                  Require approval for RSVPs
                </Label>
              </div>
            </CollapsibleContent>
          </Collapsible>

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
