import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DollarSign, Edit, RefreshCw, AlertTriangle } from 'lucide-react';
import { useCurrencySettings, useUpdateCurrencySetting, CurrencySetting } from '@/hooks/useCurrencySettings';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Settings() {
  const { role } = useAuth();
  const { data: currencies, isLoading, error } = useCurrencySettings();
  const updateCurrency = useUpdateCurrencySetting();

  const [editingCurrency, setEditingCurrency] = useState<CurrencySetting | null>(null);
  const [newRate, setNewRate] = useState<string>('');

  // Only admins can access this page
  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleEditClick = (currency: CurrencySetting) => {
    setEditingCurrency(currency);
    setNewRate(currency.exchange_rate_to_pkr.toString());
  };

  const handleSaveRate = async () => {
    if (!editingCurrency) return;

    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) return;

    await updateCurrency.mutateAsync({
      id: editingCurrency.id,
      exchange_rate_to_pkr: rate,
    });

    setEditingCurrency(null);
    setNewRate('');
  };

  const handleToggleActive = async (currency: CurrencySetting) => {
    await updateCurrency.mutateAsync({
      id: currency.id,
      is_active: !currency.is_active,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error loading currency settings: {error.message}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage system configuration and preferences</p>
        </div>

        {/* Currency Settings Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Currency Exchange Rates</CardTitle>
                <CardDescription>
                  Configure exchange rates for international currencies to PKR
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 mb-6 bg-muted/50 rounded-lg border">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Exchange Rate Information</p>
                <p className="text-muted-foreground">
                  All sales are automatically converted to PKR using these rates. 
                  Update rates regularly to ensure accurate pricing for international customers.
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Currency</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead className="text-right">Rate to PKR</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currencies?.map((currency) => (
                      <TableRow key={currency.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{currency.currency_code}</p>
                            <p className="text-sm text-muted-foreground">{currency.currency_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-lg font-semibold">{currency.symbol}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-mono">
                            <span className="text-muted-foreground">1 {currency.currency_code} = </span>
                            <span className="font-bold text-primary">
                              {currency.exchange_rate_to_pkr.toLocaleString('en-PK')} PKR
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={currency.is_active}
                              onCheckedChange={() => handleToggleActive(currency)}
                              disabled={currency.currency_code === 'PKR' || updateCurrency.isPending}
                            />
                            <Badge variant={currency.is_active ? 'default' : 'secondary'}>
                              {currency.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(currency.updated_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {currency.currency_code !== 'PKR' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(currency)}
                              className="gap-1"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Conversion Examples */}
            {currencies && currencies.length > 0 && (
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-medium mb-3">Quick Conversion Examples</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currencies
                    .filter((c) => c.is_active && c.currency_code !== 'PKR')
                    .map((currency) => (
                      <div key={currency.id} className="flex items-center gap-2 text-sm">
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        <span>
                          100 {currency.symbol} = {' '}
                          <strong className="text-primary">
                            {(100 * currency.exchange_rate_to_pkr).toLocaleString('en-PK')} PKR
                          </strong>
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Rate Dialog */}
      <Dialog open={!!editingCurrency} onOpenChange={() => setEditingCurrency(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Exchange Rate</DialogTitle>
            <DialogDescription>
              Set the exchange rate for {editingCurrency?.currency_name} ({editingCurrency?.currency_code}) to PKR
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rate">Exchange Rate</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">1 {editingCurrency?.currency_code} =</span>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="flex-1"
                  placeholder="Enter rate"
                />
                <span className="text-muted-foreground">PKR</span>
              </div>
            </div>

            {editingCurrency && (
              <p className="text-sm text-muted-foreground">
                Current rate: 1 {editingCurrency.currency_code} = {editingCurrency.exchange_rate_to_pkr.toLocaleString('en-PK')} PKR
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCurrency(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRate}
              disabled={updateCurrency.isPending || !newRate || parseFloat(newRate) <= 0}
            >
              {updateCurrency.isPending ? 'Saving...' : 'Save Rate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
