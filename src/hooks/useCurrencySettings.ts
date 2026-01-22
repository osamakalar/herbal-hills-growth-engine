import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CurrencySetting {
  id: string;
  currency_code: string;
  currency_name: string;
  symbol: string;
  exchange_rate_to_pkr: number;
  is_active: boolean;
  updated_at: string;
  updated_by: string | null;
}

export type CurrencyUpdate = Partial<Pick<CurrencySetting, 'exchange_rate_to_pkr' | 'is_active'>> & { id: string };

export function useCurrencySettings() {
  return useQuery({
    queryKey: ['currency_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currency_settings')
        .select('*')
        .order('currency_code', { ascending: true });

      if (error) throw error;
      return data as CurrencySetting[];
    },
  });
}

export function useUpdateCurrencySetting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CurrencyUpdate) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('currency_settings')
        .update({ ...updates, updated_by: user?.id })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currency_settings'] });
      toast({
        title: 'Currency updated',
        description: 'Exchange rate has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating currency',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useConvertToPKR() {
  const { data: currencies } = useCurrencySettings();

  return (amount: number, fromCurrency: string): number => {
    if (fromCurrency === 'PKR') return amount;

    const currency = currencies?.find((c) => c.currency_code === fromCurrency && c.is_active);
    if (!currency) return amount;

    return amount * currency.exchange_rate_to_pkr;
  };
}
