import Link from "next/link";
import { cn } from "@/lib/utils";

interface EventTabsNavProps {
  eventId: string;
  canManage: boolean;
  activeTab: string;
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
            key={tab.key}
            href={
              tab.key === "overview"
                ? `/dashboard/events/${eventId}`
                : `/dashboard/events/${eventId}?tab=${tab.key}`
            }
            className={cn(
              "relative pb-3 text-sm font-medium transition-colors hover:text-foreground",
              activeTab === tab.key
                ? "text-foreground"
                : "text-muted-foreground",
            )}
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
