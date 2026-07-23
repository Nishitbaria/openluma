"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./theme-toggle";

const breadcrumbMap: Record<string, string> = {
  analytics: "Analytics",
  attendees: "Attendees",
  chat: "AI Chat",
  "check-in": "Ticket Scanner",
  dashboard: "Dashboard",
  edit: "Edit",
  events: "Events",
  new: "Create Event",
  profile: "Profile",
  settings: "Settings",
  ticket: "My Ticket",
};

export function DashboardHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          {segments.slice(1).map((segment, index) => {
            const isLast = index === segments.length - 2;
            const label = breadcrumbMap[segment] ?? segment;
            const href = `/${segments.slice(0, index + 2).join("/")}`;

            return (
              <span className="contents" key={segment}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
