import { formatInTimeZone } from "date-fns-tz";
import { Calendar, Globe, Lock, MapPin, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

interface EventCardProps {
  event: {
    id: string;
    slug?: string;
    title: string;
    description: string | null;
    coverImage: string | null;
    startTime: Date | string;
    timezone?: string;
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
    <Link
      href={href ?? (event.slug ? `/e/${event.slug}` : `/events/${event.id}`)}
    >
      <Card className="overflow-hidden transition-shadow hover:shadow-lg">
        {event.coverImage ? (
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={event.coverImage}
              alt={event.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-primary/20 via-muted to-primary/5">
            <Calendar className="h-10 w-10 text-muted-foreground/50" />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Badge
              variant={event.visibility === "public" ? "default" : "secondary"}
            >
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
            <span>
              {formatInTimeZone(
                startTime,
                event.timezone ?? "UTC",
                "EEE, MMM d 'at' h:mm a",
              )}
            </span>
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
            <div className="ml-auto flex items-center gap-1.5">
              <Avatar size="sm">
                <AvatarImage src={event.host.image ?? undefined} />
                <AvatarFallback>
                  {event.host.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>by {event.host.name}</span>
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
