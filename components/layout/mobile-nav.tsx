"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { Portal, PortalBackdrop } from "@/components/ui/portal";
import { Button } from "@/components/ui/button";
import { navLinks } from "@/components/layout/header";
import { XIcon, MenuIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  return (
    <div className="md:hidden">
      <Button
        aria-controls="mobile-menu"
        aria-expanded={open}
        aria-label="Toggle menu"
        className="md:hidden"
        onClick={() => setOpen(!open)}
        size="icon"
        variant="outline"
      >
        {open ? (
          <XIcon className="size-4.5" />
        ) : (
          <MenuIcon className="size-4.5" />
        )}
      </Button>
      {open && (
        <Portal className="top-14" id="mobile-menu">
          <PortalBackdrop />
          <div
            className={cn(
              "data-[slot=open]:zoom-in-97 ease-out data-[slot=open]:animate-in",
              "size-full p-4",
            )}
            data-slot={open ? "open" : "closed"}
          >
            <div className="grid gap-y-2">
              {navLinks.map((link) => (
                <Button
                  asChild
                  className="justify-start"
                  key={link.label}
                  variant="ghost"
                >
                  <Link href={link.href} onClick={() => setOpen(false)}>
                    {link.label}
                  </Link>
                </Button>
              ))}
            </div>
            <div className="mt-12 flex flex-col gap-2">
              {isAuthenticated ? (
                <Button asChild className="w-full">
                  <Link href="/dashboard" onClick={() => setOpen(false)}>
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/sign-in" onClick={() => setOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link href="/sign-up" onClick={() => setOpen(false)}>
                      Get Started
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
