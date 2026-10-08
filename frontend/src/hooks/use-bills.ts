import { useMutation, useQuery } from "@tanstack/react-query";

import { api, BILLS_KEY } from "@/src/api";
import { haptic, useToast } from "@/src/components/ui";
import { confirm } from "@/src/confirm";
import { queryClient } from "@/src/query-client";
import type { Bill } from "@/src/types";

export function useBills() {
  return useQuery({ queryKey: BILLS_KEY, queryFn: api.listBills });
}

export function useTogglePaid() {
  const toast = useToast();
  return useMutation({
    mutationFn: ({ bill, paid }: { bill: Bill; paid: boolean }) => api.setPaid(bill.id, paid),
    onMutate: async ({ bill, paid }) => {
      haptic("medium");
      await queryClient.cancelQueries({ queryKey: BILLS_KEY });
      const prev = queryClient.getQueryData<Bill[]>(BILLS_KEY);
      queryClient.setQueryData<Bill[]>(BILLS_KEY, (old) => old?.map((b) => (b.id === bill.id ? { ...b, paid } : b)));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(BILLS_KEY, ctx.prev);
      toast((e as Error).message, "error");
    },
    onSuccess: (res) => {
      toast(
        res.bill.paid
          ? res.next_bill
            ? "Conta paga! Próximo mês já foi criado"
            : "Conta marcada como paga"
          : "Conta marcada como pendente",
        res.bill.paid ? "success" : "info",
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: BILLS_KEY }),
  });
}

export function useDeleteBill(onDone?: () => void) {
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: (id: string) => api.deleteBill(id),
    onSuccess: () => {
      haptic("warning");
      toast("Conta excluída", "error");
      onDone?.();
    },
    onError: (e) => toast((e as Error).message, "error"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: BILLS_KEY }),
  });
  const ask = async (bill: Bill) => {
    if (await confirm("Excluir conta", `Deseja realmente excluir a conta "${bill.name}"?`, "Excluir")) {
      mutation.mutate(bill.id);
    }
  };
  return { ask, isPending: mutation.isPending };
}
