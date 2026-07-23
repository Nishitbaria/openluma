import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Cover image */}
      <Skeleton className="mb-8 aspect-video w-full rounded-xl" />

      {/* Badges */}
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      {/* Title */}
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="mt-2 h-5 w-40" />

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardContent className="space-y-4 pt-6">
              {Array.from({ length: 3 }, (_, i) => `sk-${i}`).map((k) => (
                <div className="flex items-center gap-3" key={k}>
                  <Skeleton className="size-5 rounded" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
