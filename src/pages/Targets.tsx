import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTargetsWithProgress,
  useQuarterlyTargets,
  useMyTarget,
  type TargetWithProgress,
} from '@/hooks/useTargets';
import { TargetCard } from '@/components/targets/TargetCard';
import { BulkTargetDialog } from '@/components/targets/BulkTargetDialog';
import { EditTargetDialog } from '@/components/targets/EditTargetDialog';
import { QuarterlyView } from '@/components/targets/QuarterlyView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Target,
  Users,
  TrendingUp,
  Trophy,
  Flame,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { format, startOfMonth, addMonths, subMonths, startOfQuarter, addQuarters, subQuarters } from 'date-fns';

export default function Targets() {
  const { role, loading: authLoading } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedQuarter, setSelectedQuarter] = useState(new Date());
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<TargetWithProgress | null>(null);

  const isAdminOrManager = role === 'admin' || role === 'manager';

  const { data: targetsWithProgress, isLoading: loadingTargets } = useTargetsWithProgress(selectedMonth);
  const { data: quarterlyData, isLoading: loadingQuarterly } = useQuarterlyTargets(selectedQuarter);
  const { data: myTarget, isLoading: loadingMyTarget } = useMyTarget(selectedMonth);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Redirect counter staff
  if (role === 'counter_staff') {
    return <Navigate to="/pos" replace />;
  }

  // Health rep view - only their own target
  if (role === 'health_rep') {
    const target = myTarget;
    const progress = target ? 0 : 0; // Would need sales data for real progress

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Target</h1>
          <p className="text-muted-foreground">
            Track your monthly sales target progress
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[150px] text-center">
            {format(selectedMonth, 'MMMM yyyy')}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            disabled={startOfMonth(selectedMonth) >= startOfMonth(new Date())}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {loadingMyTarget ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : target ? (
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Monthly Target
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">
                  ₨{Number(target.target_amount_pkr).toLocaleString('en-PK')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Target for {format(selectedMonth, 'MMMM yyyy')}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>90% Threshold (Commission Release)</span>
                  <span className="font-medium">
                    ₨{(Number(target.target_amount_pkr) * 0.9).toLocaleString('en-PK')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>150% Threshold (Family Dinner)</span>
                  <span className="font-medium text-warning">
                    ₨{(Number(target.target_amount_pkr) * 1.5).toLocaleString('en-PK')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Alert>
            <Target className="h-4 w-4" />
            <AlertTitle>No Target Set</AlertTitle>
            <AlertDescription>
              No target has been assigned for this month yet. Contact your manager.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // Admin/Manager view
  const totalReps = targetsWithProgress?.length || 0;
  const onTrack = targetsWithProgress?.filter(t => t.achievement_percentage >= 90).length || 0;
  const achieved = targetsWithProgress?.filter(t => t.achievement_percentage >= 100).length || 0;
  const familyDinners = targetsWithProgress?.filter(t => t.achievement_percentage >= 150).length || 0;
  const avgProgress = targetsWithProgress?.reduce((sum, t) => sum + t.achievement_percentage, 0) / (totalReps || 1);

  const getQuarterLabel = (date: Date) => {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `Q${quarter} ${date.getFullYear()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Targets Management</h1>
          <p className="text-muted-foreground">
            Set and track monthly sales targets for health representatives
          </p>
        </div>
        <Button onClick={() => setShowBulkDialog(true)}>
          <Users className="h-4 w-4 mr-2" />
          Bulk Assign
        </Button>
      </div>

      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Monthly
          </TabsTrigger>
          <TabsTrigger value="quarterly" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Quarterly
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-6">
          {/* Month Navigation */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[150px] text-center">
              {format(selectedMonth, 'MMMM yyyy')}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
              disabled={startOfMonth(selectedMonth) >= startOfMonth(new Date())}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reps</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalReps}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgProgress.toFixed(1)}%</div>
                <Progress value={Math.min(avgProgress, 100)} className="h-1 mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On Track (90%+)</CardTitle>
                <Target className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{onTrack}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Achieved</CardTitle>
                <Trophy className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{achieved}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Family Dinners</CardTitle>
                <Flame className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{familyDinners}</div>
              </CardContent>
            </Card>
          </div>

          {/* Target Cards */}
          {loadingTargets ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : targetsWithProgress?.length === 0 ? (
            <Alert>
              <Target className="h-4 w-4" />
              <AlertTitle>No Targets Set</AlertTitle>
              <AlertDescription>
                No targets have been assigned for this month. Use "Bulk Assign" to set targets for all representatives.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {targetsWithProgress?.map((target) => (
                <TargetCard
                  key={target.user_id}
                  target={target}
                  onEdit={setEditTarget}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="quarterly" className="space-y-6">
          {/* Quarter Navigation */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedQuarter(subQuarters(selectedQuarter, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[150px] text-center">
              {getQuarterLabel(selectedQuarter)}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedQuarter(addQuarters(selectedQuarter, 1))}
              disabled={startOfQuarter(selectedQuarter) >= startOfQuarter(new Date())}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <QuarterlyView data={quarterlyData || []} isLoading={loadingQuarterly} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <BulkTargetDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        month={selectedMonth}
      />

      <EditTargetDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        target={editTarget}
      />
    </div>
  );
}
