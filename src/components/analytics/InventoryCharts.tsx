import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';
import { InventoryStats } from '@/hooks/useAnalytics';

interface InventoryChartsProps {
  stats: InventoryStats | undefined;
  isLoading: boolean;
}

const STOCK_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
];

const CATEGORY_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142 76% 36%)',
  'hsl(var(--warning))',
  'hsl(262 83% 58%)',
  'hsl(var(--secondary))',
];

export function InventoryCharts({ stats, isLoading }: InventoryChartsProps) {
  const formatPrice = (price: number) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K`;
    return price.toString();
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stock Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By Category</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const stockData = [
    { name: 'In Stock', value: stats?.in_stock || 0 },
    { name: 'Low Stock', value: stats?.low_stock || 0 },
    { name: 'Out of Stock', value: stats?.out_of_stock || 0 },
  ].filter((item) => item.value > 0);

  const categoryData = stats?.by_category.slice(0, 6).map((cat) => ({
    name: cat.name,
    value: cat.count,
    amount: cat.value,
  })) || [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg p-2 shadow-lg">
          <p className="font-medium text-sm">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.amount ? `PKR ${formatPrice(data.amount)}` : `${data.value} products`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Stock Status Donut */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Stock Status
          </CardTitle>
          <CardDescription>Product availability overview</CardDescription>
        </CardHeader>
        <CardContent>
          {stockData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No inventory data
            </div>
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stockData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={STOCK_COLORS[index % STOCK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry: any) => (
                      <span className="text-sm">
                        {value} ({entry.payload.value})
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats?.in_stock || 0}</p>
              <p className="text-xs text-muted-foreground">In Stock</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{stats?.low_stock || 0}</p>
              <p className="text-xs text-muted-foreground">Low Stock</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{stats?.out_of_stock || 0}</p>
              <p className="text-xs text-muted-foreground">Out of Stock</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Distribution Donut */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory by Category</CardTitle>
          <CardDescription>Stock value distribution</CardDescription>
        </CardHeader>
        <CardContent>
          {categoryData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No category data
            </div>
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Total value */}
          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">Total Inventory Value</p>
            <p className="text-2xl font-bold text-primary">
              PKR {formatPrice(stats?.total_value || 0)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
