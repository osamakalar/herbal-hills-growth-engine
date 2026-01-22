import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCommissionSummary,
  useCalculateCommissions,
  useMyCommission,
} from '@/hooks/useCommissions';
import { CommissionCard } from '@/components/commissions/CommissionCard';
import { CommissionTable } from '@/components/commissions/CommissionTable';
import { TargetSetterDialog } from '@/components/commissions/TargetSetterDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Calculator,
  Target,
  TrendingUp,
  DollarSign,
  Users,
  Flame,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { format, startOfMonth, addMonths, subMonths } from 'date-fns';

export default function Commissions() {
  const { role, loading: authLoading } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showTargetDialog, setShowTargetDialog] = useState(false);

  const isAdminOrManager = role === 'admin' || role === 'manager';

  const { data: commissionSummary, isLoading: loadingSummary } = useCommissionSummary(selectedMonth);
  const { data: myCommission, isLoading: loadingMyCommission } = useMyCommission(selectedMonth);
  const calculateCommissions = useCalculateCommissions();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Health reps can only see their own commission
  if (role === 'health_rep') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Commission</h1>
          <p className="text-muted-foreground">
            Track your sales performance and commission earnings
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

        {loadingMyCommission ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : myCommission ? (
          <CommissionCard
            fullName="Your Performance"
            domesticSales={Number(myCommission.domestic_sales_pkr)}
            internationalSales={Number(myCommission.international_sales_pkr)}
            appointmentSales={Number(myCommission.appointment_sales_pkr)}
            domesticCommission={Number(myCommission.domestic_commission_pkr)}
            internationalCommission={Number(myCommission.international_commission_pkr)}
            appointmentCommission={Number(myCommission.appointment_commission_pkr)}
            totalCommission={Number(myCommission.total_commission_pkr)}
            target={Number(myCommission.target_amount_pkr)}
            achievement={Number(myCommission.achievement_percentage)}
            isReleased={myCommission.is_released}
            isFamilyDinner={myCommission.is_family_dinner}
          />
        ) : (
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertTitle>No Data Available</AlertTitle>
            <AlertDescription>
              Commission data for this month hasn't been calculated yet.
            </AlertDescription>
          </Alert>
        )}

        {/* Commission Rates Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Commission Rates</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Domestic Sales</p>
                <p className="text-2xl font-bold text-primary">4%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-secondary/10">
                <DollarSign className="h-4 w-4 text-secondary" />
              </div>
              <div>
                <p className="font-medium">International (SAR/AED)</p>
                <p className="text-2xl font-bold text-secondary">2%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-accent/10">
                <Target className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <p className="font-medium">Appointments</p>
                <p className="text-2xl font-bold text-accent-foreground">10%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Counter staff redirects
  if (role === 'counter_staff') {
    return <Navigate to="/pos" replace />;
  }

  // Admin/Manager view
  const totalCommissions = commissionSummary?.reduce((sum, c) => sum + c.total_commission, 0) || 0;
  const releasedCommissions = commissionSummary?.filter(c => c.is_released).reduce((sum, c) => sum + c.total_commission, 0) || 0;
  const familyDinnerCount = commissionSummary?.filter(c => c.is_family_dinner).length || 0;
  const totalReps = commissionSummary?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commission Engine</h1>
          <p className="text-muted-foreground">
            Calculate and track team commissions based on performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowTargetDialog(true)}>
            <Target className="h-4 w-4 mr-2" />
            Set Target
          </Button>
          <Button 
            onClick={() => calculateCommissions.mutate(selectedMonth)}
            disabled={calculateCommissions.isPending}
          >
            {calculateCommissions.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4 mr-2" />
            )}
            Calculate
          </Button>
        </div>
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

      {/* Family Dinner Alert */}
      {familyDinnerCount > 0 && (
        <Alert className="bg-warning/10 border-warning">
          <Flame className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">Family Dinner Alert! 🎉</AlertTitle>
          <AlertDescription>
            {familyDinnerCount} representative{familyDinnerCount > 1 ? 's have' : ' has'} exceeded 150% of their target!
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₨{totalCommissions.toLocaleString('en-PK')}
            </div>
            <p className="text-xs text-muted-foreground">
              For {format(selectedMonth, 'MMMM yyyy')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Released</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              ₨{releasedCommissions.toLocaleString('en-PK')}
            </div>
            <p className="text-xs text-muted-foreground">
              Reps at 90%+ target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReps}</div>
            <p className="text-xs text-muted-foreground">
              Health representatives
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Family Dinners</CardTitle>
            <Flame className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{familyDinnerCount}</div>
            <p className="text-xs text-muted-foreground">
              At 150%+ target
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Views */}
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="cards">Card View</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <CommissionTable data={commissionSummary || []} isLoading={loadingSummary} />
        </TabsContent>

        <TabsContent value="cards">
          {loadingSummary ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : commissionSummary?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No commission data available. Calculate commissions to see results.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {commissionSummary?.map((summary) => (
                <CommissionCard
                  key={summary.user_id}
                  fullName={summary.full_name}
                  domesticSales={summary.domestic_sales}
                  internationalSales={summary.international_sales}
                  appointmentSales={summary.appointment_sales}
                  domesticCommission={summary.domestic_commission}
                  internationalCommission={summary.international_commission}
                  appointmentCommission={summary.appointment_commission}
                  totalCommission={summary.total_commission}
                  target={summary.target}
                  achievement={summary.achievement}
                  isReleased={summary.is_released}
                  isFamilyDinner={summary.is_family_dinner}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Commission Rates Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Commission Rate Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Domestic Sales (PKR)</span>
                <span className="text-2xl font-bold text-primary">4%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Standard rate for all PKR transactions
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">International (SAR/AED)</span>
                <span className="text-2xl font-bold text-secondary">2%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Reduced rate for international currency sales
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Appointments</span>
                <span className="text-2xl font-bold text-accent-foreground">10%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Premium rate for completed field appointments
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-lg bg-muted/50">
            <p className="text-sm">
              <strong>Release Threshold:</strong> Commissions are only released when a rep reaches 90% of their monthly target.
              <br />
              <strong>Family Dinner Reward:</strong> Triggered when a rep exceeds 150% of their target.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Target Setter Dialog */}
      <TargetSetterDialog
        open={showTargetDialog}
        onOpenChange={setShowTargetDialog}
        month={selectedMonth}
      />
    </div>
  );
}
