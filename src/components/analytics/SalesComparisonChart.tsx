import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DailySalesData } from '@/hooks/useAnalytics';
import { format, parseISO } from 'date-fns';

interface SalesComparisonChartProps {
  data: DailySalesData[];
  isLoading: boolean;
}

export function SalesComparisonChart({ data, isLoading }: SalesComparisonChartProps) {
  const formatPrice = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const chartData = data.map((item) => ({
    ...item,
    date: format(parseISO(item.date), 'MMM d'),
  }));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Comparison</CardTitle>
          <CardDescription>Counter vs Field Sales</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Comparison</CardTitle>
        <CardDescription>Counter vs Field Sales (last 30 days)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="counterGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fieldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tickFormatter={formatPrice}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `PKR ${value.toLocaleString()}`,
                  name === 'counter_sales' ? 'Counter Sales' : 'Field Sales',
                ]}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend
                formatter={(value) => (value === 'counter_sales' ? 'Counter Sales' : 'Field Sales')}
              />
              <Area
                type="monotone"
                dataKey="counter_sales"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#counterGradient)"
              />
              <Area
                type="monotone"
                dataKey="field_sales"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                fill="url(#fieldGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
