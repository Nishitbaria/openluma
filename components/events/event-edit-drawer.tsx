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
  const [richDescription, setRichDescription] = useState(
    event.richDescription ?? ""
  );
  const [plainDescription, setPlainDescription] = useState(
    event.description ?? ""
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      capacity: formData.get("capacity")
        ? Number(formData.get("capacity"))
        : undefined,
      coverImage: coverImage || undefined,
      description: plainDescription || undefined,
      endTime: (formData.get("endTime") as string) || undefined,
      location: (formData.get("location") as string) || undefined,
      locationDetails: (formData.get("locationDetails") as string) || undefined,
      requiresApproval: formData.get("requiresApproval") === "on",
      richDescription: richDescription || undefined,
      startTime: formData.get("startTime") as string,
      timezone: formData.get("timezone") as string,
      title: formData.get("title") as string,
      type: formData.get("type") as "in_person" | "virtual" | "hybrid",
      visibility: formData.get("visibility") as "public" | "private",
      ...(slug ? { slug } : {}),
    };

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
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
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        {trigger ?? <Button variant="outline">Edit Event</Button>}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto" side="right" size="lg">
        <SheetHeader>
          <SheetTitle>Edit Event</SheetTitle>
        </SheetHeader>

        <form className="flex flex-col gap-6 px-4 pb-4" onSubmit={handleSubmit}>
          {/* Cover Image */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Cover Image</h3>
            <EventCoverImagePicker
              onChange={setCoverImage}
              value={coverImage}
            />
          </div>

          {/* Basic Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Basic Info</h3>
            <Input
              defaultValue={event.title}
              name="title"
              placeholder="Event name"
              required
            />
            <div className="mt-2 space-y-1.5">
              <Label className="text-muted-foreground text-sm">Event URL</Label>
              <div className="flex items-center gap-2">
                <Input
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
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Description</h3>
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
            <h3 className="font-semibold text-sm">Time</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  className="text-muted-foreground text-sm"
                  htmlFor="drawer-startTime"
                >
                  Start
                </Label>
                <Input
                  defaultValue={
                    event.startTime
                      ? new Date(event.startTime).toISOString().slice(0, 16)
                      : ""
                  }
                  id="drawer-startTime"
                  name="startTime"
                  required
                  type="datetime-local"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  className="text-muted-foreground text-sm"
                  htmlFor="drawer-endTime"
                >
                  End
                </Label>
                <Input
                  defaultValue={
                    event.endTime
                      ? new Date(event.endTime).toISOString().slice(0, 16)
                      : ""
                  }
                  id="drawer-endTime"
                  name="endTime"
                  type="datetime-local"
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </p>
            <input
              name="timezone"
              type="hidden"
              value={Intl.DateTimeFormat().resolvedOptions().timeZone}
            />
          </div>

          <Separator />

          {/* Location */}
          <EventLocationToggle
            defaultLocation={event.location}
            defaultLocationDetails={event.locationDetails}
            defaultType={event.type}
          />

          <Separator />

          {/* Settings */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Settings</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-sm">
                  Visibility
                </Label>
                <Select defaultValue={event.visibility} name="visibility">
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
                <Label className="text-muted-foreground text-sm">
                  Capacity
                </Label>
                <Input
                  defaultValue={event.capacity ?? ""}
                  min={1}
                  name="capacity"
                  placeholder="Unlimited"
                  type="number"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Switch
                defaultChecked={event.requiresApproval}
                id="drawer-requiresApproval"
                name="requiresApproval"
              />
              <Label
                className="text-muted-foreground text-sm"
                htmlFor="drawer-requiresApproval"
              >
                Require approval for RSVPs
              </Label>
            </div>
          </div>

          {/* Submit */}
          <Button className="w-full" disabled={loading} type="submit">
            <CheckCircle className="mr-2 h-4 w-4" />
            {loading ? "Updating..." : "Update Event"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
