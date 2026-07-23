import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface EventFilters {
  hostId?: string;
  limit?: number;
  offset?: number;
  search?: string;
  startAfter?: string;
  visibility?: string;
}

export function useEvents(filters?: EventFilters) {
  const params = new URLSearchParams();
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }
  }

  return useQuery({
    queryFn: async () => {
      const res = await fetch(`/api/events?${params}`);
      if (!res.ok) {
        throw new Error("Failed to fetch events");
      }
      return res.json();
    },
    queryKey: ["events", filters],
  });
}

export function useEvent(eventId: string) {
  return useQuery({
    enabled: !!eventId,
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch event");
      }
      return res.json();
    },
    queryKey: ["events", eventId],
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete event");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
