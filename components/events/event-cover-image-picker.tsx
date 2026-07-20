"use client";

import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUploadThing } from "@/lib/uploadthing-client";
import { cn } from "@/lib/utils";

const PRESET_IMAGES = [
  "/presets/abstract-1.svg",
  "/presets/abstract-2.svg",
  "/presets/abstract-3.svg",
  "/presets/abstract-4.svg",
  "/presets/abstract-5.svg",
  "/presets/abstract-6.svg",
];

interface EventCoverImagePickerProps {
  onChange: (url: string | null) => void;
  value: string | null;
}

export function EventCoverImagePicker({
  value,
  onChange,
}: EventCoverImagePickerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("eventCoverImage", {
    onClientUploadComplete: (res) => {
      if (res?.[0]) {
        onChange(res[0].ufsUrl);
        setDialogOpen(false);
        toast.success("Image uploaded!");
      }
    },
    onUploadError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const [file] = files;
      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      if (file.size > 4 * 1024 * 1024) {
        toast.error("Image must be under 4MB");
        return;
      }

      startUpload([file]);
    },
    [startUpload]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isUploading) {
        setIsDragging(true);
      }
    },
    [isUploading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (isUploading) {
        return;
      }
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles, isUploading]
  );

  function handlePresetSelect(url: string) {
    onChange(url);
    setDialogOpen(false);
  }

  return (
    <div className="space-y-2">
      <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
        <DialogTrigger asChild>
          {value ? (
            <button
              className="group relative block w-full overflow-hidden rounded-xl border-2 border-muted transition-colors hover:border-primary/50"
              style={{ maxWidth: 240 }}
              type="button"
            >
              <div style={{ paddingBottom: "100%" }} />
              <Image
                alt="Cover image"
                className="object-cover"
                fill
                sizes="240px"
                src={value}
              />
              <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="font-medium text-sm text-white">
                  Change Image
                </span>
              </div>
            </button>
          ) : (
            <button
              className="grid w-full place-items-center rounded-xl border-2 border-muted-foreground/25 border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              style={{ maxWidth: 240, paddingBottom: 40, paddingTop: 40 }}
              type="button"
            >
              <div className="grid place-items-center" style={{ gap: 8 }}>
                <ImagePlus style={{ height: 32, width: 32 }} />
                <span className="font-medium text-sm">Add Cover Image</span>
                <span className="text-xs">1:1 aspect ratio</span>
              </div>
            </button>
          )}
        </DialogTrigger>

        <DialogContent aria-describedby={undefined} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Image</DialogTitle>
            <DialogDescription className="sr-only">
              Upload an image or choose from presets
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: "grid", gap: 16 }}>
            {/* Upload zone */}
            <button
              className={cn(
                "grid w-full place-items-center rounded-lg border-2 border-dashed transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50",
                isUploading && "pointer-events-none opacity-60"
              )}
              disabled={isUploading}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              style={{ padding: "24px 16px" }}
              type="button"
            >
              <div
                className="grid place-items-center text-center"
                style={{ gap: 8 }}
              >
                {isUploading ? (
                  <>
                    <Loader2
                      className="animate-spin text-primary"
                      style={{ height: 24, width: 24 }}
                    />
                    <span className="font-medium text-sm">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload
                      className="text-muted-foreground"
                      style={{ height: 24, width: 24 }}
                    />
                    <span className="font-medium text-sm">
                      Drag & drop or click to upload
                    </span>
                    <span className="text-muted-foreground text-xs">
                      1:1 aspect ratio recommended. Max 4MB.
                    </span>
                  </>
                )}
              </div>
            </button>

            <input
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  handleFiles(e.target.files);
                }
                e.target.value = "";
              }}
              ref={fileInputRef}
              type="file"
            />

            {/* Divider */}
            <div
              className="grid items-center"
              style={{
                gap: 12,
                gridTemplateColumns: "1fr auto 1fr",
              }}
            >
              <div className="h-px bg-border" />
              <span className="text-muted-foreground text-xs">or</span>
              <div className="h-px bg-border" />
            </div>

            {/* Presets */}
            <div style={{ display: "grid", gap: 8 }}>
              <span className="font-medium text-sm">Choose a preset</span>
              <div
                className="grid"
                style={{
                  gap: 8,
                  gridTemplateColumns: "repeat(3, 1fr)",
                }}
              >
                {PRESET_IMAGES.map((preset) => (
                  <button
                    className={cn(
                      "relative block overflow-hidden rounded-lg border-2 transition-colors",
                      value === preset
                        ? "border-primary"
                        : "border-transparent hover:border-muted-foreground/25"
                    )}
                    key={preset}
                    onClick={() => handlePresetSelect(preset)}
                    type="button"
                  >
                    <div style={{ paddingBottom: "100%" }} />
                    <Image
                      alt="Preset cover"
                      className="object-cover"
                      fill
                      sizes="120px"
                      src={preset}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {value ? (
        <Button
          className="text-muted-foreground"
          onClick={() => onChange(null)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Trash2 className="mr-1.5" style={{ height: 14, width: 14 }} />
          Remove image
        </Button>
      ) : null}
    </div>
  );
}
