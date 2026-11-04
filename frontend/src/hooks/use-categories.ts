import { useMutation, useQuery } from "@tanstack/react-query";

import { api, BILLS_KEY, CATEGORIES_KEY, CUSTOM_CATEGORIES_KEY } from "@/src/api";
import { queryClient } from "@/src/query-client";
import { CATEGORIES } from "@/src/types";

/** Default + custom category names, in display order. Falls back to defaults while offline. */
export function useCategories(): string[] {
  const { data } = useQuery({ queryKey: CATEGORIES_KEY, queryFn: api.listCategories, staleTime: 60_000 });
  return data ?? [...CATEGORIES];
}

export function useCustomCategories() {
  return useQuery({ queryKey: CUSTOM_CATEGORIES_KEY, queryFn: api.listCustomCategories });
}

function invalidateAll() {
  void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
  void queryClient.invalidateQueries({ queryKey: BILLS_KEY });
}

export function useCreateCategory() {
  return useMutation({ mutationFn: (name: string) => api.createCategory(name), onSuccess: invalidateAll });
}

export function useRenameCategory() {
  return useMutation({ mutationFn: ({ id, name }: { id: string; name: string }) => api.renameCategory(id, name), onSuccess: invalidateAll });
}

export function useDeleteCategory() {
  return useMutation({ mutationFn: (id: string) => api.deleteCategory(id), onSuccess: invalidateAll });
}
