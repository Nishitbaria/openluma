"use client";

import { Loader2Icon, MailIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function ResendVerificationButton({
  callbackURL,
  email,
}: {
  callbackURL: string;
  email: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const { error } = await authClient.sendVerificationEmail({
      callbackURL,
      email,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message ?? "Failed to send verification email");
      return;
    }
    toast.success(`Verification email sent to ${email}`);
  }

  return (
    <Button disabled={loading} onClick={handleClick} type="button">
      {loading ? (
        <Loader2Icon className="animate-spin" data-icon="inline-start" />
      ) : (
        <MailIcon data-icon="inline-start" />
      )}
      Send verification email
    </Button>
  );
}
