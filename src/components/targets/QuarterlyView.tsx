import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trophy, Flame, TrendingUp } from 'lucide-react';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';

interface MonthlyBreakdown {
  month: string;
  target: number;
  achieved: number;
}

interface QuarterlySummary {
  user_id: string;
  full_name: string;
  quarterly_target: number;
  quarterly_achieved: number;
  quarterly_percentage: number;
  monthly_breakdown: MonthlyBreakdown[];
}

interface QuarterlyViewProps {
  data: QuarterlySummary[];
  isLoading?: boolean;
}

export function QuarterlyView({ data, isLoading }: QuarterlyViewProps) {
  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatShortPKR = (amount: number) => {
    if (amount >= 100000) {
      return `₨${(amount / 100000).toFixed(1)}L`;
    }
    if (amount >= 1000) {
      return `₨${(amount / 1000).toFixed(0)}K`;
    }
    return `₨${amount}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No quarterly data available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((summary) => (
          <Card 
            key={summary.user_id}
            className={cn(
              "transition-all",
              summary.quarterly_percentage >= 150 && "ring-2 ring-warning bg-warning/5",
              summary.quarterly_percentage >= 100 && summary.quarterly_percentage < 150 && "ring-2 ring-success bg-success/5"
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">{summary.full_name}</CardTitle>
                {summary.quarterly_percentage >= 150 ? (
                  <Flame className="h-5 w-5 text-warning" />
                ) : summary.quarterly_percentage >= 100 ? (
                  <Trophy className="h-5 w-5 text-success" />
                ) : summary.quarterly_percentage >= 90 ? (
                  <TrendingUp className="h-5 w-5 text-primary" />
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quarterly Progress</span>
                  <span className="font-bold">{summary.quarterly_percentage.toFixed(1)}%</span>
                </div>
                <Progress value={Math.min(summary.quarterly_percentage, 100)} className="h-2" />
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {formatPKR(summary.quarterly_achieved)} / {formatPKR(summary.quarterly_target)}
                </span>
              </div>

              {/* Monthly Mini Chart */}
              <div className="grid grid-cols-3 gap-1 pt-2">
                {summary.monthly_breakdown.map((month) => {
                  const pct = (month.achieved / month.target) * 100;
                  return (
                    <div key={month.month} className="text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">
                        {format(parse(month.month, 'yyyy-MM-dd', new Date()), 'MMM')}
                      </p>
                      <div className="h-12 bg-muted rounded-sm relative overflow-hidden">
                        <div 
                          className={cn(
                            "absolute bottom-0 left-0 right-0 transition-all",
                            pct >= 100 ? "bg-success" : pct >= 90 ? "bg-primary" : "bg-secondary"
                          )}
                          style={{ height: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] font-medium mt-1">{pct.toFixed(0)}%</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quarterly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Representative</TableHead>
                  {data[0]?.monthly_breakdown.map((m) => (
                    <TableHead key={m.month} className="text-center">
                      {format(parse(m.month, 'yyyy-MM-dd', new Date()), 'MMM yyyy')}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Quarterly Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.user_id}>
                    <TableCell className="font-medium">{row.full_name}</TableCell>
                    {row.monthly_breakdown.map((m) => {
                      const pct = (m.achieved / m.target) * 100;
                      return (
                        <TableCell key={m.month} className="text-center">
                          <div className="text-sm">{formatShortPKR(m.achieved)}</div>
                          <div className={cn(
                            "text-xs",
                            pct >= 100 ? "text-success" : "text-muted-foreground"
                          )}>
                            {pct.toFixed(0)}%
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right">
                      <div className="font-bold">{formatPKR(row.quarterly_achieved)}</div>
                      <div className="text-xs text-muted-foreground">
                        of {formatPKR(row.quarterly_target)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {row.quarterly_percentage >= 150 ? (
                        <Badge className="bg-warning text-warning-foreground">
                          <Flame className="h-3 w-3 mr-1" />
                          150%+
                        </Badge>
                      ) : row.quarterly_percentage >= 100 ? (
                        <Badge className="bg-success text-success-foreground">
                          <Trophy className="h-3 w-3 mr-1" />
                          Achieved
                        </Badge>
                      ) : row.quarterly_percentage >= 90 ? (
                        <Badge className="bg-primary text-primary-foreground">
                          On Track
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {row.quarterly_percentage.toFixed(0)}%
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
