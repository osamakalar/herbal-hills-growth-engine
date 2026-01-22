import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Banknote, CreditCard, Building2, Smartphone, Loader2 } from 'lucide-react';
import { CartItem, useCreateSale } from '@/hooks/useSales';

const checkoutSchema = z.object({
  customer_name: z.string().trim().max(100).optional(),
  customer_phone: z.string().trim().max(20).optional(),
  discount_pkr: z.coerce.number().min(0).optional(),
  payment_method: z.enum(['cash', 'card', 'bank_transfer', 'mobile_wallet']),
  notes: z.string().trim().max(500).optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  onSuccess: () => void;
}

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { value: 'mobile_wallet', label: 'Mobile Wallet', icon: Smartphone },
] as const;

export function CheckoutDialog({ open, onOpenChange, items, onSuccess }: CheckoutDialogProps) {
  const createSale = useCreateSale();

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      discount_pkr: 0,
      payment_method: 'cash',
      notes: '',
    },
  });

  const watchDiscount = form.watch('discount_pkr') || 0;
  const subtotal = items.reduce((sum, item) => sum + item.unit_price_pkr * item.quantity, 0);
  const total = Math.max(0, subtotal - watchDiscount);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const onSubmit = async (data: CheckoutFormData) => {
    try {
      await createSale.mutateAsync({
        customer_name: data.customer_name || undefined,
        customer_phone: data.customer_phone || undefined,
        discount_pkr: data.discount_pkr || 0,
        payment_method: data.payment_method,
        notes: data.notes || undefined,
        items,
      });
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
          <DialogDescription>
            Complete the sale by selecting payment method and optional customer details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Order Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items ({items.length})</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-destructive">-{formatPrice(watchDiscount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-2"
                    >
                      {paymentMethods.map((method) => (
                        <Label
                          key={method.value}
                          htmlFor={method.value}
                          className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                            field.value === method.value
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <RadioGroupItem value={method.value} id={method.value} />
                          <method.icon className="h-4 w-4" />
                          <span className="text-sm">{method.label}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Discount */}
            <FormField
              control={form.control}
              name="discount_pkr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount (PKR)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={subtotal} step={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Customer Details (Optional) */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customer_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any additional notes..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSale.isPending} className="min-w-[120px]">
                {createSale.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ${formatPrice(total)}`
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
