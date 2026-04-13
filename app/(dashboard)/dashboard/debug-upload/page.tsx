"use client";

import { Loader2, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useUploadThing } from "@/lib/uploadthing-client";

export default function DebugUploadPage() {
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { startUpload: uploadAvatar, isUploading: avatarUploading } =
    useUploadThing("profileAvatar", {
      onClientUploadComplete: (res) => {
        if (res?.[0]) {
          setUrls((prev) => [...prev, res[0].ufsUrl]);
          setError(null);
        }
      },
      onUploadError: (err) => {
        setError(`Avatar upload: ${err.message}`);
      },
    });

  const { startUpload: uploadCover, isUploading: coverUploading } =
    useUploadThing("eventCoverImage", {
      onClientUploadComplete: (res) => {
        if (res?.[0]) {
          setUrls((prev) => [...prev, res[0].ufsUrl]);
          setError(null);
        }
      },
      onUploadError: (err) => {
        setError(`Cover upload: ${err.message}`);
      },
    });

  return (
    <div className="mx-auto max-w-xl space-y-8 p-8">
      <h1 className="text-2xl font-bold">Upload Debug</h1>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Profile Avatar</h2>
        <Button
          variant="outline"
          disabled={avatarUploading}
          onClick={() => avatarInputRef.current?.click()}
        >
          {avatarUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {avatarUploading ? "Uploading..." : "Upload Avatar"}
        </Button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadAvatar([file]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Event Cover Image</h2>
        <Button
          variant="outline"
          disabled={coverUploading}
          onClick={() => coverInputRef.current?.click()}
        >
          {coverUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {coverUploading ? "Uploading..." : "Upload Cover"}
        </Button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadCover([file]);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      )}

      {urls.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Uploaded Files</h2>
          {urls.map((url) => (
            <div key={url} className="space-y-1">
              <p className="break-all text-xs text-muted-foreground">{url}</p>
              <Image
                src={url}
                alt="Uploaded"
                width={128}
                height={128}
                className="h-32 w-32 rounded-lg object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
