import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Sale {
  id: string;
  sale_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal_pkr: number;
  discount_pkr: number;
  total_pkr: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'mobile_wallet';
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_pkr: number;
  total_pkr: number;
  created_at: string;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_pkr: number;
  stock_quantity: number;
}

export interface CreateSaleInput {
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  discount_pkr?: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'mobile_wallet';
  notes?: string;
  items: CartItem[];
}

export function useTodaySales() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return useQuery({
    queryKey: ['sales', 'today'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Sale[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useRecentSales(limit: number = 10) {
  return useQuery({
    queryKey: ['sales', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Sale[];
    },
  });
}

export function useSaleWithItems(saleId: string | undefined) {
  return useQuery({
    queryKey: ['sales', saleId, 'items'],
    queryFn: async () => {
      if (!saleId) return null;

      const [saleResult, itemsResult] = await Promise.all([
        supabase.from('sales').select('*').eq('id', saleId).maybeSingle(),
        supabase.from('sale_items').select('*').eq('sale_id', saleId),
      ]);

      if (saleResult.error) throw saleResult.error;
      if (itemsResult.error) throw itemsResult.error;

      return {
        sale: saleResult.data as Sale | null,
        items: itemsResult.data as SaleItem[],
      };
    },
    enabled: !!saleId,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateSaleInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Calculate totals
      const subtotal = input.items.reduce(
        (sum, item) => sum + item.unit_price_pkr * item.quantity,
        0
      );
      const discount = input.discount_pkr || 0;
      const total = subtotal - discount;

      // Generate sale number
      const { data: saleNumber, error: saleNumberError } = await supabase
        .rpc('generate_sale_number');

      if (saleNumberError) throw saleNumberError;

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          sale_number: saleNumber,
          customer_id: input.customer_id || null,
          customer_name: input.customer_name || null,
          customer_phone: input.customer_phone || null,
          subtotal_pkr: subtotal,
          discount_pkr: discount,
          total_pkr: total,
          payment_method: input.payment_method,
          notes: input.notes || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = input.items.map((item) => ({
        sale_id: sale.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price_pkr: item.unit_price_pkr,
        total_pkr: item.unit_price_pkr * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      return sale as Sale;
    },
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Sale completed!',
        description: `Sale ${sale.sale_number} has been recorded.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating sale',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
