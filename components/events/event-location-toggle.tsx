"use client";

import { Check, Globe, MapPin } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface EventLocationToggleProps {
  defaultLocation?: string | null;
  defaultLocationDetails?: string | null;
  defaultType: "in_person" | "virtual" | "hybrid";
}

export function EventLocationToggle({
  defaultType,
  defaultLocation,
  defaultLocationDetails,
}: EventLocationToggleProps) {
  const [locationType, setLocationType] = useState<"in_person" | "virtual">(
    defaultType === "virtual" ? "virtual" : "in_person"
  );

  return (
    <div className="space-y-3">
      <Label>Location</Label>

      <div className="grid grid-cols-2 gap-3">
        <button
          className={cn(
            "relative flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors",
            locationType === "in_person"
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-muted-foreground/25"
          )}
          onClick={() => setLocationType("in_person")}
          type="button"
        >
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              locationType === "in_person"
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            <MapPin className="h-5 w-5" />
          </div>
          <span className="font-medium text-sm">In Person</span>
          {locationType === "in_person" && (
            <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
          )}
        </button>

        <button
          className={cn(
            "relative flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors",
            locationType === "virtual"
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-muted-foreground/25"
          )}
          onClick={() => setLocationType("virtual")}
          type="button"
        >
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              locationType === "virtual"
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Globe className="h-5 w-5" />
          </div>
          <span className="font-medium text-sm">Virtual</span>
          {locationType === "virtual" && (
            <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
          )}
        </button>
      </div>

      <input name="type" type="hidden" value={locationType} />

      {locationType === "in_person" ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-sm" htmlFor="location">
              Event Location
            </Label>
            <Input
              defaultValue={
                defaultType === "virtual" ? "" : (defaultLocation ?? "")
              }
              id="location"
              name="location"
              placeholder="What's the address?"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              className="text-muted-foreground text-sm"
              htmlFor="locationDetails"
            >
              Location Details
            </Label>
            <Input
              defaultValue={
                defaultType === "virtual" ? "" : (defaultLocationDetails ?? "")
              }
              id="locationDetails"
              name="locationDetails"
              placeholder="Room 101, 2nd floor"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-sm" htmlFor="location">
            Join URL
          </Label>
          <Input
            defaultValue={
              defaultType === "virtual" ? (defaultLocation ?? "") : ""
            }
            id="location"
            name="location"
            placeholder="https://meet.google.com/abc-defg-hij"
          />
        </div>
      )}
    </div>
  );
}
