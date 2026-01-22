import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { downloadReceipt, openReceiptInNewTab, ReceiptData, ReceiptItem } from '@/lib/generateReceipt';
import { Download, Printer, ExternalLink, Receipt } from 'lucide-react';
import { format } from 'date-fns';

interface SaleData {
  id: string;
  sale_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal_pkr: number;
  discount_pkr: number;
  total_pkr: number;
  currency: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  created_by: string;
}

interface ReceiptPreviewDialogProps {
  sale: SaleData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export function ReceiptPreviewDialog({
  sale,
  open,
  onOpenChange,
}: ReceiptPreviewDialogProps) {
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [salesRepName, setSalesRepName] = useState<string>('');

  useEffect(() => {
    if (sale && open) {
      fetchSaleItems();
      fetchSalesRepName();
    }
  }, [sale, open]);

  const fetchSaleItems = async () => {
    if (!sale) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('sale_items')
      .select('product_name, quantity, unit_price_pkr, total_pkr')
      .eq('sale_id', sale.id);

    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  };

  const fetchSalesRepName = async () => {
    if (!sale?.created_by) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', sale.created_by)
      .single();

    if (data) {
      setSalesRepName(data.full_name);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getReceiptData = (): ReceiptData | null => {
    if (!sale) return null;
    
    return {
      saleNumber: sale.sale_number,
      date: format(new Date(sale.created_at), 'MMM d, yyyy h:mm a'),
      customerName: sale.customer_name,
      customerPhone: sale.customer_phone,
      items,
      subtotalPKR: Number(sale.subtotal_pkr),
      discountPKR: Number(sale.discount_pkr),
      totalPKR: Number(sale.total_pkr),
      currency: sale.currency,
      paymentMethod: sale.payment_method,
      notes: sale.notes,
      salesRepName,
    };
  };

  const handleDownload = () => {
    const data = getReceiptData();
    if (data) {
      downloadReceipt(data);
    }
  };

  const handleOpenNewTab = () => {
    const data = getReceiptData();
    if (data) {
      openReceiptInNewTab(data);
    }
  };

  const handlePrint = () => {
    const data = getReceiptData();
    if (data) {
      openReceiptInNewTab(data);
    }
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Receipt Preview
          </DialogTitle>
          <DialogDescription>
            Sale #{sale.sale_number}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-1">
            {/* Header */}
            <div className="text-center space-y-1">
              <h3 className="font-bold text-lg">HERBAL HUB</h3>
              <p className="text-xs text-muted-foreground">Health & Wellness Store</p>
            </div>

            <Separator />

            {/* Sale Info */}
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receipt #:</span>
                <span className="font-mono">{sale.sale_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span>{format(new Date(sale.created_at), 'MMM d, yyyy h:mm a')}</span>
              </div>
              {salesRepName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sales Rep:</span>
                  <span>{salesRepName}</span>
                </div>
              )}
            </div>

            {(sale.customer_name || sale.customer_phone) && (
              <>
                <Separator className="border-dashed" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Customer:</p>
                  {sale.customer_name && <p>{sale.customer_name}</p>}
                  {sale.customer_phone && (
                    <p className="text-muted-foreground">{sale.customer_phone}</p>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* Items */}
            {loading ? (
              <div className="py-4 text-center text-muted-foreground">
                Loading items...
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex text-xs font-medium text-muted-foreground">
                  <span className="flex-1">Item</span>
                  <span className="w-12 text-center">Qty</span>
                  <span className="w-20 text-right">Total</span>
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="text-sm">
                    <div className="flex">
                      <span className="flex-1 break-words">{item.product_name}</span>
                      <span className="w-12 text-center">{item.quantity}</span>
                      <span className="w-20 text-right font-medium">
                        ₨{formatCurrency(Number(item.total_pkr))}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-2">
                      @ ₨{formatCurrency(Number(item.unit_price_pkr))}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₨{formatCurrency(Number(sale.subtotal_pkr))}</span>
              </div>
              {Number(sale.discount_pkr) > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Discount</span>
                  <span>-₨{formatCurrency(Number(sale.discount_pkr))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>TOTAL</span>
                <span>₨{formatCurrency(Number(sale.total_pkr))}</span>
              </div>
            </div>

            <Separator className="border-dashed" />

            {/* Payment & Currency */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Currency:</span>
                <Badge variant="outline">
                  {currencySymbols[sale.currency]} {sale.currency}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Payment:</span>
                <span>{paymentMethodLabels[sale.payment_method]}</span>
              </div>
            </div>

            {sale.notes && (
              <>
                <Separator className="border-dashed" />
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Notes:</p>
                  <p className="text-xs">{sale.notes}</p>
                </div>
              </>
            )}

            <Separator />

            {/* Footer */}
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p>Thank you for your purchase!</p>
              <p>www.herbalhub.pk</p>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={handleOpenNewTab}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open PDF
          </Button>
          <Button variant="outline" className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button className="flex-1" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
