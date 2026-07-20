"use client";

import { format } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ChevronsUpDown, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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

function getInitialEndTime(
  endTime: string | null | undefined,
  isEditing: boolean,
  timezone: string,
  defaultEnd: Date
) {
  if (endTime) {
    return formatInTimeZone(new Date(endTime), timezone, "yyyy-MM-dd'T'HH:mm");
  }
  if (isEditing) {
    return "";
  }
  return format(defaultEnd, "yyyy-MM-dd'T'HH:mm");
}

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
    event?.coverImage ?? null
  );
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [richDescription, setRichDescription] = useState(
    event?.richDescription ?? ""
  );
  const [plainDescription, setPlainDescription] = useState(
    event?.description ?? ""
  );
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

  // Preserve the event's stored timezone while editing; fall back to the
  // browser zone for new events. Wall-time inputs are interpreted in this zone.
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // biome-ignore lint/suspicious/noUnnecessaryConditions: event is optional (new-event mode has none), so this fallback is real
  const timezone = event?.timezone ?? browserTimezone;

  // Datetime-local inputs hold wall-time strings ("yyyy-MM-ddTHH:mm") in the
  // event's timezone. endTime is nullable: a stored null stays empty.
  const [startTime, setStartTime] = useState<string>(
    event?.startTime
      ? formatInTimeZone(
          new Date(event.startTime),
          timezone,
          "yyyy-MM-dd'T'HH:mm"
        )
      : format(defaultStart, "yyyy-MM-dd'T'HH:mm")
  );
  const [endTime, setEndTime] = useState<string>(
    getInitialEndTime(event?.endTime, isEditing, timezone, defaultEnd)
  );

  // Secondary/collapsed fields are held in controlled state so the submitted
  // payload is identical whether "More options" is open or closed.
  const [locationDetails, setLocationDetails] = useState(
    event?.locationDetails ?? ""
  );
  const [type, setType] = useState<"in_person" | "virtual" | "hybrid">(
    // biome-ignore lint/suspicious/noUnnecessaryConditions: event is optional (new-event mode has none), so this fallback is real
    event?.type ?? "in_person"
  );
  const [visibility, setVisibility] = useState<"public" | "private">(
    // biome-ignore lint/suspicious/noUnnecessaryConditions: event is optional (new-event mode has none), so this fallback is real
    event?.visibility ?? "public"
  );
  const [capacity, setCapacity] = useState(`${event?.capacity ?? ""}`);
  const [requiresApproval, setRequiresApproval] = useState(
    // biome-ignore lint/suspicious/noUnnecessaryConditions: event is optional (new-event mode has none), so this fallback is real
    event?.requiresApproval ?? false
  );
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(isEditing);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: submit handler validates and assembles the full event payload across many optional fields; extracting pieces would obscure the linear create/edit flow
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      capacity: capacity ? Number(capacity) : undefined,
      coverImage: coverImage || undefined,
      description: plainDescription || undefined,
      endTime: endTime
        ? fromZonedTime(endTime, timezone).toISOString()
        : undefined,
      location: (formData.get("location") as string) || undefined,
      locationDetails: locationDetails || undefined,
      requiresApproval,
      richDescription: richDescription || undefined,
      startTime: fromZonedTime(startTime, timezone).toISOString(),
      timezone,
      title: formData.get("title") as string,
      type,
      visibility,
      ...(isEditing && slug ? { slug } : {}),
    };

    try {
      const url = isEditing ? `/api/events/${event.id}` : "/api/events";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        method,
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
            origin: { y: 0.6 },
            particleCount: 150,
            spread: 80,
          })
        );
      }
      router.push(`/dashboard/events/${result.id ?? event?.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  const submitButtonLabel = (() => {
    if (loading) {
      return "Saving...";
    }
    return isEditing ? "Update Event" : "Create Event";
  })();

  return (
    <Card>
      <CardContent className="pt-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              defaultValue={event?.title}
              id="title"
              name="title"
              placeholder="My awesome event"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Cover Image</Label>
            <EventCoverImagePicker
              onChange={setCoverImage}
              value={coverImage}
            />
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="slug">Event URL</Label>
              <Input
                id="slug"
                onChange={(e) =>
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "")
                      .replace(/-+/g, "-")
                  )
                }
                placeholder="custom-url"
                value={slug}
              />
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
                onChange={(e) => setStartTime(e.target.value)}
                required
                type="datetime-local"
                value={startTime}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Date & Time</Label>
              <Input
                id="endTime"
                onChange={(e) => setEndTime(e.target.value)}
                type="datetime-local"
                value={endTime}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <Globe className="size-3.5" />
            {timezone}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              defaultValue={event?.location ?? ""}
              id="location"
              name="location"
              placeholder="123 Main St, City or https://zoom.us/..."
            />
          </div>

          <Collapsible onOpenChange={setMoreOptionsOpen} open={moreOptionsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                className="h-auto gap-1.5 px-0 text-muted-foreground text-sm hover:bg-transparent hover:text-foreground"
                type="button"
                variant="ghost"
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
                  onChange={(e) => setLocationDetails(e.target.value)}
                  placeholder="Room 101, 2nd floor"
                  value={locationDetails}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="type">Event Type</Label>
                  <Select
                    onValueChange={(v) =>
                      setType(v as "in_person" | "virtual" | "hybrid")
                    }
                    value={type}
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
                    onValueChange={(v) =>
                      setVisibility(v as "public" | "private")
                    }
                    value={visibility}
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
                    min={1}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="Unlimited"
                    type="number"
                    value={capacity}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={requiresApproval}
                  id="requiresApproval"
                  onCheckedChange={setRequiresApproval}
                />
                <Label htmlFor="requiresApproval">
                  Require approval for RSVPs
                </Label>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-3">
            <Button disabled={loading} type="submit">
              {submitButtonLabel}
            </Button>
            <Button
              onClick={() => router.back()}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
