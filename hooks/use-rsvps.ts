import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useRsvps(eventId: string) {
  return useQuery({
    enabled: !!eventId,
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/rsvp`);
      if (!res.ok) {
        throw new Error("Failed to fetch RSVPs");
      }
      return res.json();
    },
    queryKey: ["rsvps", eventId],
  });
}

export function useSubmitRsvp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      message,
    }: {
      eventId: string;
      message?: string;
    }) => {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        body: JSON.stringify({ message }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to RSVP");
      }
      return res.json();
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["rsvps", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events", eventId] });
    },
  });
}

export function useUpdateRsvpStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      rsvpId,
      status,
    }: {
      eventId: string;
      rsvpId: string;
      status: string;
    }) => {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        body: JSON.stringify({ rsvpId, status }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!res.ok) {
        throw new Error("Failed to update RSVP");
      }
      return res.json();
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["rsvps", eventId] });
    },
  });
}
