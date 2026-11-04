import { useMutation, useQuery } from "@tanstack/react-query";

import { api, BILLS_KEY, CATEGORIES_KEY, FAMILY_KEY } from "@/src/api";
import { useAuth } from "@/src/auth";
import { queryClient } from "@/src/query-client";
import type { Family } from "@/src/types";

export function useFamily() {
  return useQuery({ queryKey: FAMILY_KEY, queryFn: api.getFamily, staleTime: 30_000 });
}

/** Name of the member who owns a bill, or null when it's mine / no family. */
export function useBillOwnerName(ownerId: string): string | null {
  const { user } = useAuth();
  const { data: family } = useFamily();
  if (!family || family.members.length < 2 || ownerId === user?.id) return null;
  return family.members.find((m) => m.id === ownerId)?.name.split(" ")[0] ?? "Outro membro";
}

function afterChange(family?: Family | null) {
  queryClient.setQueryData(FAMILY_KEY, family ?? null);
  void queryClient.invalidateQueries({ queryKey: FAMILY_KEY });
  void queryClient.invalidateQueries({ queryKey: BILLS_KEY });
  void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
}

export function useCreateFamily() {
  return useMutation({ mutationFn: (name: string) => api.createFamily(name), onSuccess: afterChange });
}

export function useJoinFamily() {
  return useMutation({ mutationFn: (code: string) => api.joinFamily(code.trim().toUpperCase()), onSuccess: afterChange });
}

export function useLeaveFamily() {
  return useMutation({ mutationFn: () => api.leaveFamily(), onSuccess: () => afterChange(null) });
}

export function useRemoveFamilyMember() {
  return useMutation({ mutationFn: (memberId: string) => api.removeFamilyMember(memberId), onSuccess: afterChange });
}

export function useRegenerateFamilyCode() {
  return useMutation({ mutationFn: () => api.regenerateFamilyCode(), onSuccess: afterChange });
}
