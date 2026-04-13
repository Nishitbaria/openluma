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
  value: string | null;
  onChange: (url: string | null) => void;
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
      const file = files[0];
      if (!file) return;

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
    [startUpload],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isUploading) setIsDragging(true);
    },
    [isUploading],
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
      if (isUploading) return;
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles, isUploading],
  );

  function handlePresetSelect(url: string) {
    onChange(url);
    setDialogOpen(false);
  }

  return (
    <div className="space-y-2">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          {value ? (
            <button
              type="button"
              className="group relative block w-full overflow-hidden rounded-xl border-2 border-muted transition-colors hover:border-primary/50"
              style={{ maxWidth: 240 }}
            >
              <div style={{ paddingBottom: "100%" }} />
              <Image
                src={value}
                alt="Cover image"
                fill
                sizes="240px"
                className="object-cover"
              />
              <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-sm font-medium text-white">
                  Change Image
                </span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              className="grid w-full place-items-center rounded-xl border-2 border-dashed border-muted-foreground/25 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              style={{ maxWidth: 240, paddingTop: 40, paddingBottom: 40 }}
            >
              <div className="grid place-items-center" style={{ gap: 8 }}>
                <ImagePlus style={{ width: 32, height: 32 }} />
                <span className="text-sm font-medium">Add Cover Image</span>
                <span className="text-xs">1:1 aspect ratio</span>
              </div>
            </button>
          )}
        </DialogTrigger>

        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Choose Image</DialogTitle>
            <DialogDescription className="sr-only">
              Upload an image or choose from presets
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: "grid", gap: 16 }}>
            {/* Upload zone */}
            <button
              type="button"
              disabled={isUploading}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "grid w-full place-items-center rounded-lg border-2 border-dashed transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50",
                isUploading && "pointer-events-none opacity-60",
              )}
              style={{ padding: "24px 16px" }}
            >
              <div
                className="grid place-items-center text-center"
                style={{ gap: 8 }}
              >
                {isUploading ? (
                  <>
                    <Loader2
                      className="animate-spin text-primary"
                      style={{ width: 24, height: 24 }}
                    />
                    <span className="text-sm font-medium">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload
                      className="text-muted-foreground"
                      style={{ width: 24, height: 24 }}
                    />
                    <span className="text-sm font-medium">
                      Drag & drop or click to upload
                    </span>
                    <span className="text-xs text-muted-foreground">
                      1:1 aspect ratio recommended. Max 4MB.
                    </span>
                  </>
                )}
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = "";
              }}
            />

            {/* Divider */}
            <div
              className="grid items-center"
              style={{
                gridTemplateColumns: "1fr auto 1fr",
                gap: 12,
              }}
            >
              <div className="h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px bg-border" />
            </div>

            {/* Presets */}
            <div style={{ display: "grid", gap: 8 }}>
              <span className="text-sm font-medium">Choose a preset</span>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                }}
              >
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      "relative block overflow-hidden rounded-lg border-2 transition-colors",
                      value === preset
                        ? "border-primary"
                        : "border-transparent hover:border-muted-foreground/25",
                    )}
                  >
                    <div style={{ paddingBottom: "100%" }} />
                    <Image
                      src={preset}
                      alt="Preset cover"
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => onChange(null)}
        >
          <Trash2 className="mr-1.5" style={{ width: 14, height: 14 }} />
          Remove image
        </Button>
      )}
    </div>
  );
}
