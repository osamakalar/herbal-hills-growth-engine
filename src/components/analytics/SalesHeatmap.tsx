import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SalesHeatmapData } from '@/hooks/useAnalytics';

interface SalesHeatmapProps {
  data: SalesHeatmapData[];
  isLoading: boolean;
}

export function SalesHeatmap({ data, isLoading }: SalesHeatmapProps) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

  const { heatmapGrid, maxValue } = useMemo(() => {
    const grid = new Map<string, number>();
    let max = 0;

    data.forEach((item) => {
      const key = `${item.day}-${item.hour}`;
      grid.set(key, item.value);
      if (item.value > max) max = item.value;
    });

    return { heatmapGrid: grid, maxValue: max };
  }, [data]);

  const getColor = (value: number) => {
    if (maxValue === 0) return 'bg-muted';
    const intensity = value / maxValue;
    
    if (intensity === 0) return 'bg-muted';
    if (intensity < 0.2) return 'bg-primary/10';
    if (intensity < 0.4) return 'bg-primary/25';
    if (intensity < 0.6) return 'bg-primary/40';
    if (intensity < 0.8) return 'bg-primary/60';
    return 'bg-primary/80';
  };

  const formatHour = (hour: number) => {
    if (hour === 12) return '12PM';
    if (hour < 12) return `${hour}AM`;
    return `${hour - 12}PM`;
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return `${(price / 1000).toFixed(0)}K`;
    }
    return price.toString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Heatmap</CardTitle>
          <CardDescription>Sales by day and hour</CardDescription>
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
        <CardTitle>Sales Heatmap</CardTitle>
        <CardDescription>Sales activity by day of week and hour (last 30 days)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="flex mb-2">
              <div className="w-12" />
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="flex-1 text-center text-xs text-muted-foreground"
                >
                  {formatHour(hour)}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            {days.map((day) => (
              <div key={day} className="flex items-center mb-1">
                <div className="w-12 text-sm font-medium text-muted-foreground">
                  {day}
                </div>
                {hours.map((hour) => {
                  const value = heatmapGrid.get(`${day}-${hour}`) || 0;
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={`flex-1 h-8 mx-0.5 rounded-sm ${getColor(value)} transition-colors hover:ring-2 hover:ring-primary/50 cursor-pointer relative group`}
                      title={`${day} ${formatHour(hour)}: PKR ${value.toLocaleString()}`}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border">
                        <div className="font-medium">{day} {formatHour(hour)}</div>
                        <div className="text-primary">PKR {value.toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center justify-end mt-4 gap-2 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-0.5">
                <div className="w-4 h-4 rounded-sm bg-muted" />
                <div className="w-4 h-4 rounded-sm bg-primary/10" />
                <div className="w-4 h-4 rounded-sm bg-primary/25" />
                <div className="w-4 h-4 rounded-sm bg-primary/40" />
                <div className="w-4 h-4 rounded-sm bg-primary/60" />
                <div className="w-4 h-4 rounded-sm bg-primary/80" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
