import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, format } from 'date-fns';

// Commission rates
const DOMESTIC_RATE = 0.04; // 4%
const INTERNATIONAL_RATE = 0.02; // 2%
const APPOINTMENT_RATE = 0.10; // 10%
const RELEASE_THRESHOLD = 0.90; // 90%
const FAMILY_DINNER_THRESHOLD = 1.50; // 150%

export interface Commission {
  id: string;
  user_id: string;
  month: string;
  domestic_sales_pkr: number;
  international_sales_pkr: number;
  appointment_sales_pkr: number;
  domestic_commission_pkr: number;
  international_commission_pkr: number;
  appointment_commission_pkr: number;
  total_commission_pkr: number;
  target_amount_pkr: number;
  achieved_amount_pkr: number;
  achievement_percentage: number;
  is_released: boolean;
  is_family_dinner: boolean;
  created_at: string;
  updated_at: string;
}

export interface Target {
  id: string;
  user_id: string;
  month: string;
  target_amount_pkr: number;
  created_at: string;
  updated_at: string;
}

export interface CommissionSummary {
  user_id: string;
  full_name: string;
  domestic_sales: number;
  international_sales: number;
  appointment_sales: number;
  total_sales: number;
  domestic_commission: number;
  international_commission: number;
  appointment_commission: number;
  total_commission: number;
  target: number;
  achievement: number;
  is_released: boolean;
  is_family_dinner: boolean;
}

// Fetch all commissions for current month (admin/manager view)
export function useMonthlyCommissions(month?: Date) {
  const targetMonth = month || new Date();
  const monthStart = format(startOfMonth(targetMonth), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['commissions', monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .eq('month', monthStart)
        .order('total_commission_pkr', { ascending: false });

      if (error) throw error;
      return data as Commission[];
    },
  });
}

// Fetch current user's commission
export function useMyCommission(month?: Date) {
  const targetMonth = month || new Date();
  const monthStart = format(startOfMonth(targetMonth), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['my-commission', monthStart],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', monthStart)
        .maybeSingle();

      if (error) throw error;
      return data as Commission | null;
    },
  });
}

// Fetch targets
export function useTargets(month?: Date) {
  const targetMonth = month || new Date();
  const monthStart = format(startOfMonth(targetMonth), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['targets', monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('targets')
        .select('*')
        .eq('month', monthStart);

      if (error) throw error;
      return data as Target[];
    },
  });
}

// Set target for a user
export function useSetTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, month, targetAmount }: { 
      userId: string; 
      month: Date; 
      targetAmount: number;
    }) => {
      const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('targets')
        .upsert({
          user_id: userId,
          month: monthStart,
          target_amount_pkr: targetAmount,
        }, {
          onConflict: 'user_id,month',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] });
      toast({ title: 'Target updated successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update target',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Calculate and update commissions for all health reps
export function useCalculateCommissions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (month?: Date) => {
      const targetMonth = month || new Date();
      const monthStart = startOfMonth(targetMonth);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);
      const monthString = format(monthStart, 'yyyy-MM-dd');

      // Get all health reps
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('*')
        .eq('role', 'health_rep');

      if (teamError) throw teamError;

      // Get all completed sales for the month
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('status', 'completed')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      if (salesError) throw salesError;

      // Get all completed appointments for the month
      const { data: appointments, error: appError } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'completed')
        .gte('scheduled_at', monthStart.toISOString())
        .lte('scheduled_at', monthEnd.toISOString());

      if (appError) throw appError;

      // Get targets for the month
      const { data: targets, error: targetError } = await supabase
        .from('targets')
        .select('*')
        .eq('month', monthString);

      if (targetError) throw targetError;

      // Calculate commissions for each health rep
      const commissions: Omit<Commission, 'id' | 'created_at' | 'updated_at'>[] = [];

      for (const member of teamMembers || []) {
        if (!member.user_id) continue;

        const userSales = sales?.filter(s => s.created_by === member.user_id) || [];
        const userAppointments = appointments?.filter(a => a.user_id === member.user_id) || [];
        const userTarget = targets?.find(t => t.user_id === member.user_id);

        // Calculate sales by currency type
        const domesticSales = userSales
          .filter(s => s.currency === 'PKR')
          .reduce((sum, s) => sum + Number(s.total_pkr), 0);

        const internationalSales = userSales
          .filter(s => s.currency !== 'PKR')
          .reduce((sum, s) => sum + Number(s.total_pkr), 0);

        const appointmentSales = userAppointments
          .filter(a => a.sale_id)
          .reduce((sum, a) => sum + Number(a.commission_pkr || 0), 0);

        // Calculate commissions
        const domesticCommission = domesticSales * DOMESTIC_RATE;
        const internationalCommission = internationalSales * INTERNATIONAL_RATE;
        const appointmentCommission = appointmentSales * APPOINTMENT_RATE;
        const totalCommission = domesticCommission + internationalCommission + appointmentCommission;

        // Calculate achievement
        const targetAmount = userTarget?.target_amount_pkr || 100000;
        const achievedAmount = domesticSales + internationalSales + appointmentSales;
        const achievementPercentage = (achievedAmount / targetAmount) * 100;

        // Determine release and family dinner status
        const isReleased = achievementPercentage >= (RELEASE_THRESHOLD * 100);
        const isFamilyDinner = achievementPercentage >= (FAMILY_DINNER_THRESHOLD * 100);

        commissions.push({
          user_id: member.user_id,
          month: monthString,
          domestic_sales_pkr: domesticSales,
          international_sales_pkr: internationalSales,
          appointment_sales_pkr: appointmentSales,
          domestic_commission_pkr: domesticCommission,
          international_commission_pkr: internationalCommission,
          appointment_commission_pkr: appointmentCommission,
          total_commission_pkr: totalCommission,
          target_amount_pkr: targetAmount,
          achieved_amount_pkr: achievedAmount,
          achievement_percentage: Math.round(achievementPercentage * 100) / 100,
          is_released: isReleased,
          is_family_dinner: isFamilyDinner,
        });
      }

      // Upsert commissions
      if (commissions.length > 0) {
        const { error: upsertError } = await supabase
          .from('commissions')
          .upsert(commissions, { onConflict: 'user_id,month' });

        if (upsertError) throw upsertError;
      }

      return commissions;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast({ title: 'Commissions calculated successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to calculate commissions',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Get commission summary with team member names
export function useCommissionSummary(month?: Date) {
  const targetMonth = month || new Date();
  const monthStart = format(startOfMonth(targetMonth), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['commission-summary', monthStart],
    queryFn: async () => {
      // Get commissions
      const { data: commissions, error: commError } = await supabase
        .from('commissions')
        .select('*')
        .eq('month', monthStart)
        .order('total_commission_pkr', { ascending: false });

      if (commError) throw commError;

      // Get team members
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('*');

      if (teamError) throw teamError;

      // Combine data
      const summaries: CommissionSummary[] = (commissions || []).map(comm => {
        const member = teamMembers?.find(m => m.user_id === comm.user_id);
        return {
          user_id: comm.user_id,
          full_name: member?.full_name || 'Unknown',
          domestic_sales: Number(comm.domestic_sales_pkr),
          international_sales: Number(comm.international_sales_pkr),
          appointment_sales: Number(comm.appointment_sales_pkr),
          total_sales: Number(comm.achieved_amount_pkr),
          domestic_commission: Number(comm.domestic_commission_pkr),
          international_commission: Number(comm.international_commission_pkr),
          appointment_commission: Number(comm.appointment_commission_pkr),
          total_commission: Number(comm.total_commission_pkr),
          target: Number(comm.target_amount_pkr),
          achievement: Number(comm.achievement_percentage),
          is_released: comm.is_released,
          is_family_dinner: comm.is_family_dinner,
        };
      });

      return summaries;
    },
  });
}
