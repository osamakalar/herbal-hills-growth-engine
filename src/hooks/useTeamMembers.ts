import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type AppRole = 'admin' | 'manager' | 'counter_staff' | 'health_rep';

export interface TeamMember {
  profile_id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role: AppRole;
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team_members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      return data as TeamMember[];
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase.rpc('update_user_role', {
        _user_id: userId,
        _new_role: newRole,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      toast({
        title: 'Role updated',
        description: 'User role has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating role',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      toast({
        title: isActive ? 'User activated' : 'User deactivated',
        description: `User has been ${isActive ? 'activated' : 'deactivated'} successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  counter_staff: 'Counter Staff',
  health_rep: 'Health Rep',
};

export const roleDescriptions: Record<AppRole, string> = {
  admin: 'Full system access, can manage users and settings',
  manager: 'Can view analytics, manage inventory and team performance',
  counter_staff: 'POS access for in-store sales only',
  health_rep: 'Field sales, appointments, and customer management',
};
