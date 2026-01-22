import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Clock,
  Banknote,
  CreditCard,
  Building2,
  Smartphone,
} from 'lucide-react';
import { Sale } from '@/hooks/useSales';

interface DailySalesSummaryProps {
  sales: Sale[];
  isLoading: boolean;
}

const paymentIcons = {
  cash: Banknote,
  card: CreditCard,
  bank_transfer: Building2,
  mobile_wallet: Smartphone,
};

export function DailySalesSummary({ sales, isLoading }: DailySalesSummaryProps) {
  const stats = useMemo(() => {
    if (!sales) return { total: 0, count: 0, avgSale: 0, byMethod: {} as Record<string, number> };

    const completedSales = sales.filter((s) => s.status === 'completed');
    const total = completedSales.reduce((sum, s) => sum + s.total_pkr, 0);
    const count = completedSales.length;
    const avgSale = count > 0 ? total / count : 0;

    const byMethod = completedSales.reduce((acc, sale) => {
      acc[sale.payment_method] = (acc[sale.payment_method] || 0) + sale.total_pkr;
      return acc;
    }, {} as Record<string, number>);

    return { total, count, avgSale, byMethod };
  }, [sales]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today's Sales</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="font-bold text-lg">{formatPrice(stats.total)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-accent/10">
                <ShoppingBag className="h-4 w-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transactions</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="font-bold text-lg">{stats.count}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-secondary">
                <TrendingUp className="h-4 w-4 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg. Sale</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <p className="font-bold text-lg">{formatPrice(stats.avgSale)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Breakdown */}
      {Object.keys(stats.byMethod).length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(stats.byMethod).map(([method, amount]) => {
                const Icon = paymentIcons[method as keyof typeof paymentIcons] || Banknote;
                return (
                  <div key={method} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs capitalize">{method.replace('_', ' ')}</p>
                      <p className="font-medium text-sm">{formatPrice(amount)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Sales */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Recent Sales</CardTitle>
          <CardDescription>Today's transactions</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No sales recorded today
            </p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {sales.slice(0, 10).map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded bg-background">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{sale.sale_number}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(sale.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatPrice(sale.total_pkr)}</p>
                      <Badge variant="outline" className="text-xs capitalize">
                        {sale.payment_method.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
