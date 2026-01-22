import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Flame, Lock, Unlock, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CommissionSummary } from '@/hooks/useCommissions';

interface CommissionTableProps {
  data: CommissionSummary[];
  isLoading?: boolean;
}

export function CommissionTable({ data, isLoading }: CommissionTableProps) {
  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
        No commission data available. Calculate commissions to see results.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Representative</TableHead>
            <TableHead className="text-right">Domestic (4%)</TableHead>
            <TableHead className="text-right">International (2%)</TableHead>
            <TableHead className="text-right">Appointments (10%)</TableHead>
            <TableHead className="text-center">Progress</TableHead>
            <TableHead className="text-right">Total Commission</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow 
              key={row.user_id}
              className={cn(
                row.is_family_dinner && "bg-warning/5",
                row.is_released && !row.is_family_dinner && "bg-success/5"
              )}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{row.full_name}</span>
                  {row.is_family_dinner && (
                    <Flame className="h-4 w-4 text-warning" />
                  )}
                  {row.achievement >= 100 && !row.is_family_dinner && (
                    <Trophy className="h-4 w-4 text-primary" />
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="text-sm">{formatPKR(row.domestic_sales)}</div>
                <div className="text-xs text-success">+{formatPKR(row.domestic_commission)}</div>
              </TableCell>
              <TableCell className="text-right">
                <div className="text-sm">{formatPKR(row.international_sales)}</div>
                <div className="text-xs text-success">+{formatPKR(row.international_commission)}</div>
              </TableCell>
              <TableCell className="text-right">
                <div className="text-sm">{formatPKR(row.appointment_sales)}</div>
                <div className="text-xs text-success">+{formatPKR(row.appointment_commission)}</div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-center gap-1 min-w-[120px]">
                  <Progress 
                    value={Math.min(row.achievement, 100)} 
                    className="h-2 w-full"
                  />
                  <span className={cn(
                    "text-xs font-medium",
                    row.achievement >= 150 && "text-warning",
                    row.achievement >= 90 && row.achievement < 150 && "text-success",
                    row.achievement < 90 && "text-muted-foreground"
                  )}>
                    {row.achievement.toFixed(1)}% of {formatPKR(row.target)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className={cn(
                  "text-lg font-bold",
                  row.is_released ? "text-success" : "text-muted-foreground"
                )}>
                  {formatPKR(row.total_commission)}
                </span>
              </TableCell>
              <TableCell className="text-center">
                {row.is_family_dinner ? (
                  <Badge className="bg-warning text-warning-foreground">
                    <Flame className="h-3 w-3 mr-1" />
                    150%+
                  </Badge>
                ) : row.is_released ? (
                  <Badge className="bg-success text-success-foreground">
                    <Unlock className="h-3 w-3 mr-1" />
                    Released
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Lock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
