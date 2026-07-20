"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function useAuth() {
  const { data: session, isPending } = useQuery({
    queryFn: async () => {
      const { data } = await authClient.getSession();
      return data;
    },
    queryKey: ["auth-session"],
    staleTime: 5 * 60 * 1000,
  });

  return {
    isAuthenticated: !!session?.user,
    isPending,
    session,
    user: session?.user ?? null,
  };
}

export function useRedirectIfAuthenticated(redirectTo = "/dashboard") {
  const router = useRouter();

  const { data, isPending } = useQuery({
    queryFn: async () => {
      const { data: sessionData } = await authClient.getSession();
      if (sessionData?.user) {
        router.replace(redirectTo);
      }
      return sessionData;
    },
    queryKey: ["auth-session"],
    staleTime: 5 * 60 * 1000,
  });

  return {
    isAuthenticated: !!data?.user,
    isPending,
  };
}
