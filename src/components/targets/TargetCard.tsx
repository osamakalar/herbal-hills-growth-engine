import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, Trophy, Flame, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TargetWithProgress } from '@/hooks/useTargets';

interface TargetCardProps {
  target: TargetWithProgress;
  onEdit?: (target: TargetWithProgress) => void;
}

export function TargetCard({ target, onEdit }: TargetCardProps) {
  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = () => {
    if (target.achievement_percentage >= 150) {
      return (
        <Badge className="bg-warning text-warning-foreground">
          <Flame className="h-3 w-3 mr-1" />
          150%+ 🎉
        </Badge>
      );
    }
    if (target.achievement_percentage >= 100) {
      return (
        <Badge className="bg-success text-success-foreground">
          <Trophy className="h-3 w-3 mr-1" />
          Achieved
        </Badge>
      );
    }
    if (target.achievement_percentage >= 90) {
      return (
        <Badge className="bg-primary text-primary-foreground">
          <TrendingUp className="h-3 w-3 mr-1" />
          On Track
        </Badge>
      );
    }
    if (target.achievement_percentage >= 50) {
      return (
        <Badge variant="secondary">
          In Progress
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        Getting Started
      </Badge>
    );
  };

  return (
    <Card className={cn(
      "transition-all duration-300",
      target.achievement_percentage >= 150 && "ring-2 ring-warning bg-warning/5",
      target.achievement_percentage >= 100 && target.achievement_percentage < 150 && "ring-2 ring-success bg-success/5"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg font-semibold">{target.full_name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(target)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className={cn(
              "font-bold",
              target.achievement_percentage >= 150 && "text-warning",
              target.achievement_percentage >= 100 && target.achievement_percentage < 150 && "text-success",
              target.achievement_percentage >= 90 && target.achievement_percentage < 100 && "text-primary",
              target.achievement_percentage < 90 && "text-muted-foreground"
            )}>
              {target.achievement_percentage.toFixed(1)}%
            </span>
          </div>
          <div className="relative">
            <Progress 
              value={Math.min(target.achievement_percentage, 100)} 
              className="h-3"
            />
            {/* Milestone markers */}
            <div className="absolute top-0 left-[90%] h-3 w-0.5 bg-primary/50" title="90% - Commission Release" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Target</p>
            <p className="text-sm font-bold">{formatPKR(target.target_amount_pkr)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Achieved</p>
            <p className="text-sm font-bold text-success">{formatPKR(target.achieved_amount)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-sm font-bold">{formatPKR(target.remaining)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
