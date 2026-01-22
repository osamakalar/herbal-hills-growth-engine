import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Globe, 
  Calendar, 
  Trophy, 
  Flame,
  Lock,
  Unlock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommissionCardProps {
  fullName: string;
  domesticSales: number;
  internationalSales: number;
  appointmentSales: number;
  domesticCommission: number;
  internationalCommission: number;
  appointmentCommission: number;
  totalCommission: number;
  target: number;
  achievement: number;
  isReleased: boolean;
  isFamilyDinner: boolean;
}

export function CommissionCard({
  fullName,
  domesticSales,
  internationalSales,
  appointmentSales,
  domesticCommission,
  internationalCommission,
  appointmentCommission,
  totalCommission,
  target,
  achievement,
  isReleased,
  isFamilyDinner,
}: CommissionCardProps) {
  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className={cn(
      "transition-all duration-300",
      isFamilyDinner && "ring-2 ring-warning bg-warning/5",
      isReleased && !isFamilyDinner && "ring-2 ring-success bg-success/5"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{fullName}</CardTitle>
          <div className="flex items-center gap-2">
            {isFamilyDinner && (
              <Badge variant="outline" className="bg-warning/20 text-warning-foreground border-warning">
                <Flame className="h-3 w-3 mr-1" />
                Family Dinner!
              </Badge>
            )}
            {isReleased ? (
              <Badge variant="outline" className="bg-success/20 text-success border-success">
                <Unlock className="h-3 w-3 mr-1" />
                Released
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                <Lock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Target Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Target Progress</span>
            <span className={cn(
              "font-medium",
              achievement >= 150 && "text-warning",
              achievement >= 90 && achievement < 150 && "text-success",
              achievement < 90 && "text-muted-foreground"
            )}>
              {achievement.toFixed(1)}%
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={Math.min(achievement, 100)} 
              className="h-3"
            />
            {/* Milestone markers */}
            <div className="absolute top-0 left-[90%] h-3 w-0.5 bg-success/50" />
            {achievement >= 100 && (
              <Trophy className="absolute -top-1 left-[100%] -translate-x-1/2 h-5 w-5 text-primary" />
            )}
            {achievement >= 150 && (
              <Flame className="absolute -top-1 left-[150%] -translate-x-1/2 h-5 w-5 text-warning" />
            )}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatPKR(domesticSales + internationalSales + appointmentSales)}</span>
            <span>Target: {formatPKR(target)}</span>
          </div>
        </div>

        {/* Sales Breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Domestic</p>
            <p className="text-sm font-medium">{formatPKR(domesticSales)}</p>
            <p className="text-xs text-success">+{formatPKR(domesticCommission)}</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <Globe className="h-4 w-4 mx-auto mb-1 text-secondary" />
            <p className="text-xs text-muted-foreground">International</p>
            <p className="text-sm font-medium">{formatPKR(internationalSales)}</p>
            <p className="text-xs text-success">+{formatPKR(internationalCommission)}</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <Calendar className="h-4 w-4 mx-auto mb-1 text-accent" />
            <p className="text-xs text-muted-foreground">Appointments</p>
            <p className="text-sm font-medium">{formatPKR(appointmentSales)}</p>
            <p className="text-xs text-success">+{formatPKR(appointmentCommission)}</p>
          </div>
        </div>

        {/* Total Commission */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Commission</span>
            <span className={cn(
              "text-xl font-bold",
              isReleased ? "text-success" : "text-muted-foreground"
            )}>
              {formatPKR(totalCommission)}
            </span>
          </div>
          {!isReleased && (
            <p className="text-xs text-muted-foreground mt-1">
              Reach 90% of target to release commission
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
