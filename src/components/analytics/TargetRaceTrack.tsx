import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Flame } from 'lucide-react';
import { RepPerformance } from '@/hooks/useAnalytics';

interface TargetRaceTrackProps {
  performers: RepPerformance[];
  isLoading: boolean;
}

export function TargetRaceTrack({ performers, isLoading }: TargetRaceTrackProps) {
  const formatPrice = (price: number) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K`;
    return price.toString();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getMilestonePosition = (percentage: number) => Math.min(percentage, 150);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 150) return 'bg-gradient-to-r from-yellow-500 to-amber-400';
    if (percentage >= 100) return 'bg-gradient-to-r from-primary to-accent';
    if (percentage >= 90) return 'bg-gradient-to-r from-primary/80 to-primary';
    if (percentage >= 50) return 'bg-primary/60';
    return 'bg-primary/40';
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return { icon: Trophy, color: 'text-yellow-500', label: '1st' };
    if (index === 1) return { icon: Trophy, color: 'text-slate-400', label: '2nd' };
    if (index === 2) return { icon: Trophy, color: 'text-amber-600', label: '3rd' };
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Target Race Track</CardTitle>
          <CardDescription>Monthly performance vs targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Target Race Track
        </CardTitle>
        <CardDescription>Monthly sales performance vs 100K target</CardDescription>
      </CardHeader>
      <CardContent>
        {performers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No performance data available</p>
        ) : (
          <div className="space-y-6">
            {performers.slice(0, 8).map((performer, index) => {
              const rankBadge = getRankBadge(index);
              const progress = getMilestonePosition(performer.percentage);

              return (
                <div key={performer.user_id} className="space-y-2">
                  {/* Performer info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(performer.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        {rankBadge && (
                          <div className="absolute -top-1 -right-1">
                            <rankBadge.icon className={`h-4 w-4 ${rankBadge.color}`} />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{performer.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          PKR {formatPrice(performer.total_sales)} / {formatPrice(performer.target)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {performer.percentage >= 150 && (
                        <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
                      )}
                      <Badge
                        variant={performer.percentage >= 100 ? 'default' : 'secondary'}
                        className={performer.percentage >= 100 ? 'bg-primary' : ''}
                      >
                        {performer.percentage.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>

                  {/* Race track */}
                  <div className="relative">
                    {/* Track background */}
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      {/* Progress bar */}
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(performer.percentage)}`}
                        style={{ width: `${Math.min((progress / 150) * 100, 100)}%` }}
                      />
                    </div>

                    {/* Milestone markers */}
                    <div className="absolute inset-0 flex items-center">
                      {/* 90% milestone */}
                      <div
                        className="absolute h-5 w-0.5 bg-warning/50"
                        style={{ left: `${(90 / 150) * 100}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-warning font-medium">
                          90%
                        </span>
                      </div>

                      {/* 100% milestone */}
                      <div
                        className="absolute h-5 w-0.5 bg-primary"
                        style={{ left: `${(100 / 150) * 100}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-primary font-medium">
                          100%
                        </span>
                      </div>

                      {/* 150% milestone */}
                      <div
                        className="absolute h-5 w-0.5 bg-orange-500"
                        style={{ left: '100%' }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-orange-500 font-medium">
                          150%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
