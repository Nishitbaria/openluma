"use client";

import { useRedirectIfAuthenticated } from "@/hooks/use-auth";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isPending } = useRedirectIfAuthenticated("/dashboard");

  if (isPending || isAuthenticated) return null;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/50 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            OL
          </div>
          OpenLuma
        </a>
        {children}
      </div>
    </div>
  );
}
