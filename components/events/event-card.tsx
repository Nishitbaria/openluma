import Link from "next/link";
import { format } from "date-fns";
import { Calendar, MapPin, Users, Globe, Lock } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    coverImage: string | null;
    startTime: Date | string;
    location: string | null;
    type: "in_person" | "virtual" | "hybrid";
    visibility: "public" | "private";
    host?: { name: string; image: string | null } | null;
    _count?: { rsvps: number };
  };
  href?: string;
}

export function EventCard({ event, href }: EventCardProps) {
  const startTime =
    typeof event.startTime === "string"
      ? new Date(event.startTime)
      : event.startTime;

  return (
    <Link href={href ?? `/events/${event.id}`}>
      <Card className="overflow-hidden transition-shadow hover:shadow-lg">
        {event.coverImage && (
          <div className="aspect-video overflow-hidden">
            <img
              src={event.coverImage}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Badge variant={event.visibility === "public" ? "default" : "secondary"}>
              {event.visibility === "public" ? (
                <Globe className="mr-1 h-3 w-3" />
              ) : (
                <Lock className="mr-1 h-3 w-3" />
              )}
              {event.visibility}
            </Badge>
            <Badge variant="outline">{event.type.replace("_", " ")}</Badge>
          </div>
          <h3 className="mt-2 text-lg font-semibold leading-tight line-clamp-2">
            {event.title}
          </h3>
        </CardHeader>
        <CardContent className="space-y-2 pb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(startTime, "EEE, MMM d 'at' h:mm a")}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{event._count?.rsvps ?? 0} attendees</span>
          </div>
          {event.host && (
            <span className="ml-auto">by {event.host.name}</span>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
