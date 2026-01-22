import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface FieldSale {
  id: string;
  sale_number: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal_pkr: number;
  discount_pkr: number;
  total_pkr: number;
  currency: string;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'mobile_wallet';
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface FieldSaleInput {
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  items: {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number; // In original currency
  }[];
  currency: 'PKR' | 'SAR' | 'AED';
  discount?: number; // In original currency
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'mobile_wallet';
  notes?: string;
}

// Fetch my field sales
export function useMyFieldSales(month?: Date) {
  const targetMonth = month || new Date();
  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);

  return useQuery({
    queryKey: ['my-field-sales', monthStart.toISOString()],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('created_by', user.id)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FieldSale[];
    },
  });
}

// Create a field sale
export function useCreateFieldSale() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: FieldSaleInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get exchange rate for currency conversion
      let exchangeRate = 1;
      if (input.currency !== 'PKR') {
        const { data: currencyData, error: currencyError } = await supabase
          .from('currency_settings')
          .select('exchange_rate_to_pkr')
          .eq('currency_code', input.currency)
          .eq('is_active', true)
          .single();

        if (currencyError) throw new Error(`Currency ${input.currency} not found or inactive`);
        exchangeRate = Number(currencyData.exchange_rate_to_pkr);
      }

      // Calculate totals in original currency
      const subtotalOriginal = input.items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0
      );
      const discountOriginal = input.discount || 0;
      const totalOriginal = subtotalOriginal - discountOriginal;

      // Convert to PKR
      const subtotalPKR = subtotalOriginal * exchangeRate;
      const discountPKR = discountOriginal * exchangeRate;
      const totalPKR = totalOriginal * exchangeRate;

      // Generate sale number
      const { data: saleNumber, error: saleNumError } = await supabase.rpc('generate_sale_number');
      if (saleNumError) throw saleNumError;

      // Insert sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          sale_number: saleNumber,
          customer_id: input.customer_id || null,
          customer_name: input.customer_name || null,
          customer_phone: input.customer_phone || null,
          subtotal_pkr: subtotalPKR,
          discount_pkr: discountPKR,
          total_pkr: totalPKR,
          currency: input.currency,
          payment_method: input.payment_method,
          notes: input.notes || null,
          created_by: user.id,
          status: 'completed',
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Insert sale items (converted to PKR)
      const saleItems = input.items.map((item) => ({
        sale_id: sale.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price_pkr: item.unit_price * exchangeRate,
        total_pkr: item.unit_price * item.quantity * exchangeRate,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      return { sale, exchangeRate, originalCurrency: input.currency };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-field-sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      const currencyNote = data.originalCurrency !== 'PKR' 
        ? ` (converted at ${data.exchangeRate} PKR)`
        : '';
      
      toast({ 
        title: 'Field sale recorded!',
        description: `Sale ${data.sale.sale_number} completed${currencyNote}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to record sale',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Get field sales summary for current user
export function useMyFieldSalesSummary(month?: Date) {
  const targetMonth = month || new Date();
  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);

  return useQuery({
    queryKey: ['my-field-sales-summary', monthStart.toISOString()],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sales')
        .select('total_pkr, currency, status')
        .eq('created_by', user.id)
        .eq('status', 'completed')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      if (error) throw error;

      const summary = {
        totalSales: data?.length || 0,
        totalRevenue: data?.reduce((sum, s) => sum + Number(s.total_pkr), 0) || 0,
        domesticSales: data?.filter(s => s.currency === 'PKR').length || 0,
        domesticRevenue: data?.filter(s => s.currency === 'PKR').reduce((sum, s) => sum + Number(s.total_pkr), 0) || 0,
        internationalSales: data?.filter(s => s.currency !== 'PKR').length || 0,
        internationalRevenue: data?.filter(s => s.currency !== 'PKR').reduce((sum, s) => sum + Number(s.total_pkr), 0) || 0,
      };

      return summary;
    },
  });
}
