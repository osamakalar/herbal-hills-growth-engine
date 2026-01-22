import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, startOfQuarter, endOfQuarter, format, eachMonthOfInterval } from 'date-fns';

export interface Target {
  id: string;
  user_id: string;
  month: string;
  target_amount_pkr: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface TargetWithProgress extends Target {
  full_name: string;
  achieved_amount: number;
  achievement_percentage: number;
  remaining: number;
}

// Fetch all targets for a specific month
export function useMonthlyTargets(month?: Date) {
  const targetMonth = month || new Date();
  const monthStart = format(startOfMonth(targetMonth), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['targets', monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('targets')
        .select('*')
        .eq('month', monthStart)
        .order('target_amount_pkr', { ascending: false });

      if (error) throw error;
      return data as Target[];
    },
  });
}

// Fetch targets with progress data
export function useTargetsWithProgress(month?: Date) {
  const targetMonth = month || new Date();
  const monthStart = startOfMonth(targetMonth);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);
  const monthString = format(monthStart, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['targets-with-progress', monthString],
    queryFn: async () => {
      // Get all targets for the month
      const { data: targets, error: targetError } = await supabase
        .from('targets')
        .select('*')
        .eq('month', monthString);

      if (targetError) throw targetError;

      // Get all team members (not just health_rep for demo purposes)
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('*');

      if (teamError) throw teamError;

      // Get sales for the month
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('created_by, total_pkr')
        .eq('status', 'completed')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      if (salesError) throw salesError;

      // Aggregate sales by user
      const salesByUser = new Map<string, number>();
      sales?.forEach((sale) => {
        if (sale.created_by) {
          salesByUser.set(
            sale.created_by,
            (salesByUser.get(sale.created_by) || 0) + Number(sale.total_pkr)
          );
        }
      });

      // Build targets with progress
      const targetsWithProgress: TargetWithProgress[] = (teamMembers || [])
        .filter(m => m.user_id)
        .map((member) => {
          const target = targets?.find(t => t.user_id === member.user_id);
          const achieved = salesByUser.get(member.user_id!) || 0;
          const targetAmount = target?.target_amount_pkr || 100000;
          const percentage = (achieved / targetAmount) * 100;

          return {
            id: target?.id || '',
            user_id: member.user_id!,
            month: monthString,
            target_amount_pkr: targetAmount,
            created_at: target?.created_at || '',
            updated_at: target?.updated_at || '',
            created_by: target?.created_by || null,
            full_name: member.full_name || 'Unknown',
            achieved_amount: achieved,
            achievement_percentage: Math.round(percentage * 100) / 100,
            remaining: Math.max(0, targetAmount - achieved),
          };
        })
        .sort((a, b) => b.achievement_percentage - a.achievement_percentage);

      return targetsWithProgress;
    },
  });
}

// Fetch quarterly targets summary
export function useQuarterlyTargets(quarter?: Date) {
  const targetDate = quarter || new Date();
  const quarterStart = startOfQuarter(targetDate);
  const quarterEnd = endOfQuarter(targetDate);

  return useQuery({
    queryKey: ['quarterly-targets', format(quarterStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const months = eachMonthOfInterval({ start: quarterStart, end: quarterEnd });

      // Get all targets for the quarter
      const monthStrings = months.map(m => format(m, 'yyyy-MM-dd'));
      
      const { data: targets, error: targetError } = await supabase
        .from('targets')
        .select('*')
        .in('month', monthStrings);

      if (targetError) throw targetError;

      // Get all team members (not just health_rep for demo purposes)
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('*');

      if (teamError) throw teamError;

      // Get sales for the quarter
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('created_by, total_pkr, created_at')
        .eq('status', 'completed')
        .gte('created_at', quarterStart.toISOString())
        .lte('created_at', quarterEnd.toISOString());

      if (salesError) throw salesError;

      // Aggregate by user
      const userSummaries = (teamMembers || [])
        .filter(m => m.user_id)
        .map((member) => {
          const userTargets = targets?.filter(t => t.user_id === member.user_id) || [];
          const totalTarget = userTargets.reduce((sum, t) => sum + Number(t.target_amount_pkr), 0) || 300000;
          const totalAchieved = sales
            ?.filter(s => s.created_by === member.user_id)
            .reduce((sum, s) => sum + Number(s.total_pkr), 0) || 0;

          return {
            user_id: member.user_id!,
            full_name: member.full_name || 'Unknown',
            quarterly_target: totalTarget,
            quarterly_achieved: totalAchieved,
            quarterly_percentage: (totalAchieved / totalTarget) * 100,
            monthly_breakdown: months.map(month => {
              const monthStr = format(month, 'yyyy-MM-dd');
              const monthTarget = userTargets.find(t => t.month === monthStr);
              const monthSales = sales
                ?.filter(s => 
                  s.created_by === member.user_id && 
                  format(new Date(s.created_at), 'yyyy-MM-dd').startsWith(format(month, 'yyyy-MM'))
                )
                .reduce((sum, s) => sum + Number(s.total_pkr), 0) || 0;

              return {
                month: monthStr,
                target: monthTarget?.target_amount_pkr || 100000,
                achieved: monthSales,
              };
            }),
          };
        });

      return userSummaries;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('targets')
        .upsert({
          user_id: userId,
          month: monthStart,
          target_amount_pkr: targetAmount,
          created_by: user.id,
        }, {
          onConflict: 'user_id,month',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['targets'] });
      queryClient.invalidateQueries({ queryKey: ['targets-with-progress'] });
      queryClient.invalidateQueries({ queryKey: ['quarterly-targets'] });
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

// Bulk set targets for all health reps
export function useBulkSetTargets() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ month, targetAmount }: { 
      month: Date; 
      targetAmount: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get all team members (not just health_rep for demo purposes)
      const { data: healthReps, error: repError } = await supabase
        .from('team_members')
        .select('user_id');

      if (repError) throw repError;

      const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
      
      // Create targets for all reps
      const targets = (healthReps || [])
        .filter(r => r.user_id)
        .map(rep => ({
          user_id: rep.user_id!,
          month: monthStart,
          target_amount_pkr: targetAmount,
          created_by: user.id,
        }));

      if (targets.length === 0) {
        throw new Error('No health representatives found');
      }

      const { error } = await supabase
        .from('targets')
        .upsert(targets, { onConflict: 'user_id,month' });

      if (error) throw error;

      return targets.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['targets'] });
      queryClient.invalidateQueries({ queryKey: ['targets-with-progress'] });
      queryClient.invalidateQueries({ queryKey: ['quarterly-targets'] });
      toast({ title: `Targets set for ${count} representative${count > 1 ? 's' : ''}` });
    },
    onError: (error) => {
      toast({
        title: 'Failed to set bulk targets',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Get my target (for health reps)
export function useMyTarget(month?: Date) {
  const targetMonth = month || new Date();
  const monthStart = format(startOfMonth(targetMonth), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['my-target', monthStart],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', monthStart)
        .maybeSingle();

      if (error) throw error;
      return data as Target | null;
    },
  });
}
