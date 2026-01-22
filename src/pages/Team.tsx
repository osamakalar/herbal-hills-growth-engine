import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  Shield,
  UserCheck,
  Search,
  Info,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTeamMembers,
  useUpdateUserRole,
  useUpdateUserStatus,
  TeamMember,
  AppRole,
  roleLabels,
  roleDescriptions,
} from '@/hooks/useTeamMembers';

const roleColors: Record<AppRole, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  manager: 'bg-warning/10 text-warning-foreground border-warning/20',
  counter_staff: 'bg-accent/10 text-accent-foreground border-accent/20',
  health_rep: 'bg-primary/10 text-primary border-primary/20',
};

export default function Team() {
  const { role: currentUserRole, user } = useAuth();
  const { data: teamMembers, isLoading, error } = useTeamMembers();
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [roleChangeDialog, setRoleChangeDialog] = useState<{
    member: TeamMember;
    newRole: AppRole;
  } | null>(null);

  // Only admins can access this page
  if (currentUserRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredMembers = teamMembers?.filter((member) => {
    const matchesSearch =
      !searchQuery ||
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || member.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const stats = {
    total: teamMembers?.length || 0,
    active: teamMembers?.filter((m) => m.is_active).length || 0,
    admins: teamMembers?.filter((m) => m.role === 'admin').length || 0,
    managers: teamMembers?.filter((m) => m.role === 'manager').length || 0,
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleRoleChange = (member: TeamMember, newRole: AppRole) => {
    if (newRole !== member.role) {
      setRoleChangeDialog({ member, newRole });
    }
  };

  const confirmRoleChange = async () => {
    if (!roleChangeDialog) return;
    await updateRole.mutateAsync({
      userId: roleChangeDialog.member.user_id,
      newRole: roleChangeDialog.newRole,
    });
    setRoleChangeDialog(null);
  };

  const handleStatusChange = async (member: TeamMember, isActive: boolean) => {
    await updateStatus.mutateAsync({
      userId: member.user_id,
      isActive,
    });
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error loading team members: {error.message}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">Manage team members and their access roles</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold">{stats.total}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <UserCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold text-primary">{stats.active}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Shield className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold">{stats.admins}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Managers</CardTitle>
              <UserCheck className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold">{stats.managers}</div>}
            </CardContent>
          </Card>
        </div>

        {/* Role Info */}
        <Card className="bg-muted/30">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4" />
              Role Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(roleLabels) as AppRole[]).map((role) => (
                <div key={role} className="flex items-start gap-2 p-2 rounded-lg bg-background">
                  <Badge variant="outline" className={roleColors[role]}>
                    {roleLabels[role]}
                  </Badge>
                  <p className="text-xs text-muted-foreground">{roleDescriptions[role]}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              {isLoading
                ? 'Loading team members...'
                : `Showing ${filteredMembers?.length || 0} of ${teamMembers?.length || 0} members`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="counter_staff">Counter Staff</SelectItem>
                  <SelectItem value="health_rep">Health Rep</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!filteredMembers || filteredMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No team members found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMembers.map((member) => {
                        const isCurrentUser = member.user_id === user?.id;
                        return (
                          <TableRow key={member.profile_id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={member.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(member.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {member.full_name}
                                    {isCurrentUser && (
                                      <span className="text-xs text-muted-foreground ml-2">(You)</span>
                                    )}
                                  </p>
                                  {member.phone && (
                                    <p className="text-xs text-muted-foreground">{member.phone}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={member.role}
                                onValueChange={(value) => handleRoleChange(member, value as AppRole)}
                                disabled={isCurrentUser || updateRole.isPending}
                              >
                                <SelectTrigger className="w-[150px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="counter_staff">Counter Staff</SelectItem>
                                  <SelectItem value="health_rep">Health Rep</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Switch
                                  checked={member.is_active}
                                  onCheckedChange={(checked) => handleStatusChange(member, checked)}
                                  disabled={isCurrentUser || updateStatus.isPending}
                                />
                                <Badge variant={member.is_active ? 'default' : 'secondary'}>
                                  {member.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(member.created_at)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Role Change Confirmation Dialog */}
      <Dialog open={!!roleChangeDialog} onOpenChange={() => setRoleChangeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Role Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change {roleChangeDialog?.member.full_name}'s role from{' '}
              <strong>{roleLabels[roleChangeDialog?.member.role || 'health_rep']}</strong> to{' '}
              <strong>{roleLabels[roleChangeDialog?.newRole || 'health_rep']}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium mb-1">New permissions:</p>
            <p className="text-muted-foreground">
              {roleDescriptions[roleChangeDialog?.newRole || 'health_rep']}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeDialog(null)}>
              Cancel
            </Button>
            <Button onClick={confirmRoleChange} disabled={updateRole.isPending}>
              {updateRole.isPending ? 'Updating...' : 'Confirm Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
