import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Customer {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  loyalty_tier: LoyaltyTier;
  loyalty_points: number;
  total_purchases_pkr: number;
  total_orders: number;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'loyalty_tier' | 'loyalty_points' | 'total_purchases_pkr' | 'total_orders'>;
export type CustomerUpdate = Partial<CustomerInsert> & { id: string };

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Customer | null;
    },
    enabled: !!id,
  });
}

export function useCustomerPurchaseHistory(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customers', customerId, 'purchases'],
    queryFn: async () => {
      if (!customerId) return [];
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (customer: CustomerInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...customer, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: 'Customer created',
        description: 'New customer has been added successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating customer',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...customer }: CustomerUpdate) => {
      const { data, error } = await supabase
        .from('customers')
        .update(customer)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: 'Customer updated',
        description: 'Customer details have been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating customer',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: 'Customer deleted',
        description: 'Customer has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting customer',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useSearchCustomers(query: string) {
  return useQuery({
    queryKey: ['customers', 'search', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, phone, loyalty_tier')
        .or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      return data as Pick<Customer, 'id' | 'full_name' | 'phone' | 'loyalty_tier'>[];
    },
    enabled: query.trim().length >= 2,
  });
}
