import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useRsvps(eventId: string) {
  return useQuery({
    queryKey: ["rsvps", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/rsvp`);
      if (!res.ok) throw new Error("Failed to fetch RSVPs");
      return res.json();
    },
    enabled: !!eventId,
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Failed to RSVP");
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
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsvpId, status }),
      });
      if (!res.ok) throw new Error("Failed to update RSVP");
      return res.json();
    },
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ["rsvps", eventId] });
    },
  });
}
