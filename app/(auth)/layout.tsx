"use client";

import { useRedirectIfAuthenticated } from "@/hooks/use-auth";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isPending } =
    useRedirectIfAuthenticated("/dashboard");

  if (isPending || isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      {children}
    </div>
  );
}
