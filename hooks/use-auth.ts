"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function useAuth() {
  const { data: session, isPending } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await authClient.getSession();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    session,
    user: session?.user ?? null,
    isAuthenticated: !!session?.user,
    isPending,
  };
}

export function useRedirectIfAuthenticated(redirectTo = "/dashboard") {
  const router = useRouter();

  const { data, isPending } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await authClient.getSession();
      if (data?.user) {
        router.replace(redirectTo);
      }
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    isAuthenticated: !!data?.user,
    isPending,
  };
}
