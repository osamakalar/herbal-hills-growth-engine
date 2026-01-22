import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, ShoppingBag, Users, DollarSign } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  useDailySales,
  useSalesHeatmap,
  useInventoryStats,
  useMonthlySales,
  useTopPerformers,
} from '@/hooks/useAnalytics';
import { SalesHeatmap } from '@/components/analytics/SalesHeatmap';
import { SalesComparisonChart } from '@/components/analytics/SalesComparisonChart';
import { TargetRaceTrack } from '@/components/analytics/TargetRaceTrack';
import { InventoryCharts } from '@/components/analytics/InventoryCharts';

export default function Analytics() {
  const { role } = useAuth();
  const { data: dailySales = [], isLoading: dailyLoading } = useDailySales(30);
  const { data: heatmapData = [], isLoading: heatmapLoading } = useSalesHeatmap();
  const { data: inventoryStats, isLoading: inventoryLoading } = useInventoryStats();
  const { data: monthlySales, isLoading: monthlyLoading } = useMonthlySales();
  const { data: performers = [], isLoading: performersLoading } = useTopPerformers();

  // Only admin and manager can access analytics
  if (role !== 'admin' && role !== 'manager') {
    return <Navigate to="/dashboard" replace />;
  }

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K`;
    return price.toString();
  };

  const totalSales = dailySales.reduce((sum, day) => sum + day.total, 0);
  const avgDailySales = dailySales.length > 0 ? totalSales / dailySales.length : 0;
  const monthlyProgress = monthlySales
    ? ((monthlySales.current_month / monthlySales.target) * 100).toFixed(0)
    : '0';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Sales performance and inventory insights</p>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {monthlyLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-primary">
                    PKR {formatPrice(monthlySales?.current_month || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {monthlyProgress}% of target ({formatPrice(monthlySales?.target || 0)})
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">30-Day Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {dailyLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">PKR {formatPrice(totalSales)}</div>
                  <p className="text-xs text-muted-foreground">
                    Avg. {formatPrice(avgDailySales)}/day
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {inventoryLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    PKR {formatPrice(inventoryStats?.total_value || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(inventoryStats?.in_stock || 0) + (inventoryStats?.low_stock || 0) + (inventoryStats?.out_of_stock || 0)} products
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Performers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {performersLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{performers.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {performers.filter((p) => p.percentage >= 100).length} at target
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            {/* Sales Comparison Chart */}
            <SalesComparisonChart data={dailySales} isLoading={dailyLoading} />

            {/* Sales Heatmap */}
            <SalesHeatmap data={heatmapData} isLoading={heatmapLoading} />
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {/* Target Race Track */}
            <TargetRaceTrack performers={performers} isLoading={performersLoading} />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            {/* Inventory Charts */}
            <InventoryCharts stats={inventoryStats} isLoading={inventoryLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
