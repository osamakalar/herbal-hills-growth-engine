import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  useMyFieldSales,
  useMyFieldSalesSummary,
} from '@/hooks/useFieldSales';
import { FieldSaleDialog } from '@/components/field-sales/FieldSaleDialog';
import { ReceiptPreviewDialog } from '@/components/field-sales/ReceiptPreviewDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  ShoppingBag,
  TrendingUp,
  Globe,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Receipt,
} from 'lucide-react';
import { format, startOfMonth, addMonths, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';

const currencySymbols: Record<string, string> = {
  PKR: '₨',
  SAR: 'ر.س',
  AED: 'د.إ',
};

const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  mobile_wallet: 'Mobile Wallet',
};

export default function MySales() {
  const { role, loading: authLoading } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showNewSale, setShowNewSale] = useState(false);
  const [selectedSale, setSelectedSale] = useState<typeof sales extends (infer T)[] | undefined ? T : never>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const { data: sales, isLoading: loadingSales } = useMyFieldSales(selectedMonth);
  const { data: summary, isLoading: loadingSummary } = useMyFieldSalesSummary(selectedMonth);

  const handleViewReceipt = (sale: typeof selectedSale) => {
    setSelectedSale(sale);
    setShowReceipt(true);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Only health reps and admins/managers can access
  if (role === 'counter_staff') {
    return <Navigate to="/pos" replace />;
  }

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Sales</h1>
          <p className="text-muted-foreground">
            Record and track your field sales with multi-currency support
          </p>
        </div>
        <Button onClick={() => setShowNewSale(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Field Sale
        </Button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium min-w-[150px] text-center flex items-center justify-center gap-2">
          <Calendar className="h-4 w-4" />
          {format(selectedMonth, 'MMMM yyyy')}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
          disabled={startOfMonth(selectedMonth) >= startOfMonth(new Date())}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalSales || 0}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatPKR(summary?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Converted to PKR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Domestic (PKR)</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.domesticSales || 0}</div>
            <p className="text-xs text-muted-foreground">
              {formatPKR(summary?.domesticRevenue || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">International</CardTitle>
            <Globe className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.internationalSales || 0}</div>
            <p className="text-xs text-muted-foreground">
              {formatPKR(summary?.internationalRevenue || 0)} (converted)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Info */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10">4%</Badge>
              <span className="text-muted-foreground">Domestic (PKR) Commission</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-secondary/10">2%</Badge>
              <span className="text-muted-foreground">International (SAR/AED) Commission</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sales History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSales ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : sales?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No sales recorded this month</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowNewSale(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Record Your First Sale
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Amount (PKR)</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales?.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-sm">
                        {sale.sale_number}
                      </TableCell>
                      <TableCell>
                        {format(new Date(sale.created_at), 'MMM d, h:mm a')}
                      </TableCell>
                      <TableCell>
                        {sale.customer_name || (
                          <span className="text-muted-foreground">Walk-in</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            sale.currency !== 'PKR' && 'bg-secondary/10 border-secondary'
                          )}
                        >
                          {currencySymbols[sale.currency]} {sale.currency}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {paymentMethodLabels[sale.payment_method]}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPKR(Number(sale.total_pkr))}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={sale.status === 'completed' ? 'default' : 'secondary'}
                          className={cn(
                            sale.status === 'completed' && 'bg-success text-success-foreground'
                          )}
                        >
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewReceipt(sale)}
                          title="View Receipt"
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Sale Dialog */}
      <FieldSaleDialog open={showNewSale} onOpenChange={setShowNewSale} />

      {/* Receipt Preview Dialog */}
      <ReceiptPreviewDialog
        sale={selectedSale}
        open={showReceipt}
        onOpenChange={setShowReceipt}
      />
    </div>
  );
}
