import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, Mail, MapPin, Gift, ShoppingBag, Calendar, TrendingUp } from 'lucide-react';
import { Customer, useCustomerPurchaseHistory } from '@/hooks/useCustomers';
import { LoyaltyBadge, getNextTierProgress } from './LoyaltyBadge';

interface CustomerDetailsProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDetails({ customer, open, onOpenChange }: CustomerDetailsProps) {
  const { data: purchases, isLoading: purchasesLoading } = useCustomerPurchaseHistory(customer?.id);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!customer) return null;

  const tierProgress = getNextTierProgress(customer.total_purchases_pkr, customer.loyalty_tier);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {customer.full_name}
            <LoyaltyBadge tier={customer.loyalty_tier} size="sm" />
          </SheetTitle>
          <SheetDescription>
            Customer since {formatDate(customer.created_at)}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6 pr-4">
          <div className="space-y-6">
            {/* Contact Info */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {(customer.address || customer.city) && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>
                      {customer.address}
                      {customer.address && customer.city && ', '}
                      {customer.city}
                    </span>
                  </div>
                )}
                {!customer.phone && !customer.email && !customer.address && !customer.city && (
                  <p className="text-sm text-muted-foreground">No contact information provided</p>
                )}
              </CardContent>
            </Card>

            {/* Loyalty Stats */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Loyalty Program
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Points</p>
                    <p className="text-xl font-bold text-primary">{customer.loyalty_points.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Current Tier</p>
                    <div className="mt-1">
                      <LoyaltyBadge tier={customer.loyalty_tier} size="lg" />
                    </div>
                  </div>
                </div>

                {tierProgress.nextTier && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progress to {tierProgress.nextTier}</span>
                      <span className="font-medium">
                        {formatPrice(customer.total_purchases_pkr)} / {formatPrice(tierProgress.target)}
                      </span>
                    </div>
                    <Progress value={Math.min(tierProgress.progress, 100)} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Purchase Stats */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Purchase Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                    <p className="text-lg font-bold">{formatPrice(customer.total_purchases_pkr)}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                    <p className="text-lg font-bold">{customer.total_orders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Purchase History */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Purchase History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {purchasesLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : purchases && purchases.length > 0 ? (
                  <div className="space-y-2">
                    {purchases.map((sale: any) => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded bg-background">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{sale.sale_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(sale.created_at)}
                            </p>
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
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No purchases yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {customer.notes && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{customer.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
