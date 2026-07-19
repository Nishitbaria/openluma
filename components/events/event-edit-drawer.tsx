"use client";

import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { EventCoverImagePicker } from "@/components/events/event-cover-image-picker";
import { EventLocationToggle } from "@/components/events/event-location-toggle";
import { RichTextEditor } from "@/components/events/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

interface EventEditDrawerProps {
  event: {
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
  trigger?: React.ReactNode;
}

export function EventEditDrawer({ event, trigger }: EventEditDrawerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(event.coverImage);
  const [slug, setSlug] = useState(event.slug ?? "");
  const [richDescription, setRichDescription] = useState(event.richDescription ?? "");
  const [plainDescription, setPlainDescription] = useState(event.description ?? "");

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
      ...(slug ? { slug } : {}),
    };

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update event");
      }

      toast.success("Event updated!");
      setOpen(false);
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? <Button variant="outline">Edit Event</Button>}
      </SheetTrigger>
      <SheetContent side="right" size="lg" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Event</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-4 pb-4">
          {/* Cover Image */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Cover Image</h3>
            <EventCoverImagePicker
              value={coverImage}
              onChange={setCoverImage}
            />
          </div>

          {/* Basic Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Basic Info</h3>
            <Input
              name="title"
              placeholder="Event name"
              required
              defaultValue={event.title}
            />
            <div className="mt-2 space-y-1.5">
              <Label className="text-sm text-muted-foreground">Event URL</Label>
              <div className="flex items-center gap-2">
                <Input
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
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Description</h3>
            <RichTextEditor
              content={richDescription}
              onChange={(json, plain) => {
                setRichDescription(json);
                setPlainDescription(plain);
              }}
              placeholder="Who should come? What's the event about?"
            />
          </div>

          <Separator />

          {/* Time */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Time</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="drawer-startTime"
                  className="text-sm text-muted-foreground"
                >
                  Start
                </Label>
                <Input
                  id="drawer-startTime"
                  name="startTime"
                  type="datetime-local"
                  required
                  defaultValue={
                    event.startTime
                      ? new Date(event.startTime).toISOString().slice(0, 16)
                      : ""
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="drawer-endTime"
                  className="text-sm text-muted-foreground"
                >
                  End
                </Label>
                <Input
                  id="drawer-endTime"
                  name="endTime"
                  type="datetime-local"
                  defaultValue={
                    event.endTime
                      ? new Date(event.endTime).toISOString().slice(0, 16)
                      : ""
                  }
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
            <input
              type="hidden"
              name="timezone"
              value={Intl.DateTimeFormat().resolvedOptions().timeZone}
            />
          </div>

          <Separator />

          {/* Location */}
          <EventLocationToggle
            defaultType={event.type}
            defaultLocation={event.location}
            defaultLocationDetails={event.locationDetails}
          />

          <Separator />

          {/* Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Settings</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">
                  Visibility
                </Label>
                <Select
                  name="visibility"
                  defaultValue={event.visibility ?? "public"}
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
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">
                  Capacity
                </Label>
                <Input
                  name="capacity"
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  defaultValue={event.capacity ?? ""}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Switch
                id="drawer-requiresApproval"
                name="requiresApproval"
                defaultChecked={event.requiresApproval ?? false}
              />
              <Label
                htmlFor="drawer-requiresApproval"
                className="text-sm text-muted-foreground"
              >
                Require approval for RSVPs
              </Label>
            </div>
          </div>

          {/* Submit */}
          <Button type="submit" disabled={loading} className="w-full">
            <CheckCircle className="mr-2 h-4 w-4" />
            {loading ? "Updating..." : "Update Event"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
