import Link from "next/link";
import { cn } from "@/lib/utils";

interface EventTabsNavProps {
  activeTab: string;
  canManage: boolean;
  eventId: string;
}

const tabs = [
  { key: "overview", label: "Overview", requiresManage: false },
  { key: "guests", label: "Guests", requiresManage: true },
  { key: "questions", label: "Questions", requiresManage: true },
  { key: "insights", label: "Insights", requiresManage: true },
  { key: "more", label: "More", requiresManage: true },
];

export function EventTabsNav({
  eventId,
  canManage,
  activeTab,
}: EventTabsNavProps) {
  const visibleTabs = tabs.filter((t) => !t.requiresManage || canManage);

  return (
    <div className="border-b">
      <nav className="-mb-px flex gap-6">
        {visibleTabs.map((tab) => (
          <Link
            className={cn(
              "relative pb-3 font-medium text-sm transition-colors hover:text-foreground",
              activeTab === tab.key
                ? "text-foreground"
                : "text-muted-foreground"
            )}
            href={
              tab.key === "overview"
                ? `/dashboard/events/${eventId}`
                : `/dashboard/events/${eventId}?tab=${tab.key}`
            }
            key={tab.key}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground" />
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
