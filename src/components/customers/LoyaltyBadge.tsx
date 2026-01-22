import { Badge } from '@/components/ui/badge';
import { LoyaltyTier } from '@/hooks/useCustomers';
import { Crown, Award, Medal, Star } from 'lucide-react';

interface LoyaltyBadgeProps {
  tier: LoyaltyTier;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const tierConfig = {
  bronze: {
    label: 'Bronze',
    icon: Medal,
    className: 'bg-amber-700/20 text-amber-700 border-amber-700/30',
  },
  silver: {
    label: 'Silver',
    icon: Award,
    className: 'bg-slate-400/20 text-slate-600 border-slate-400/30',
  },
  gold: {
    label: 'Gold',
    icon: Star,
    className: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  },
  platinum: {
    label: 'Platinum',
    icon: Crown,
    className: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  },
};

const sizeConfig = {
  sm: { badge: 'text-xs px-1.5 py-0.5', icon: 'h-3 w-3' },
  md: { badge: 'text-xs px-2 py-1', icon: 'h-3.5 w-3.5' },
  lg: { badge: 'text-sm px-2.5 py-1', icon: 'h-4 w-4' },
};

export function LoyaltyBadge({ tier, showLabel = true, size = 'md' }: LoyaltyBadgeProps) {
  const config = tierConfig[tier];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} ${sizeStyles.badge} gap-1`}>
      <Icon className={sizeStyles.icon} />
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
}

export function getLoyaltyThresholds() {
  return {
    silver: 20000,
    gold: 50000,
    platinum: 100000,
  };
}

export function getNextTierProgress(totalPurchases: number, currentTier: LoyaltyTier) {
  const thresholds = getLoyaltyThresholds();
  
  switch (currentTier) {
    case 'bronze':
      return { nextTier: 'silver', target: thresholds.silver, progress: (totalPurchases / thresholds.silver) * 100 };
    case 'silver':
      return { nextTier: 'gold', target: thresholds.gold, progress: (totalPurchases / thresholds.gold) * 100 };
    case 'gold':
      return { nextTier: 'platinum', target: thresholds.platinum, progress: (totalPurchases / thresholds.platinum) * 100 };
    case 'platinum':
      return { nextTier: null, target: 0, progress: 100 };
  }
}
