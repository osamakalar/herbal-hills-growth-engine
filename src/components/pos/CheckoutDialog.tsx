import { useState, useMemo } from 'react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Banknote, CreditCard, Building2, Smartphone, Loader2, User, X, Check, ChevronsUpDown } from 'lucide-react';
import { CartItem, useCreateSale } from '@/hooks/useSales';
import { useCustomers, Customer } from '@/hooks/useCustomers';
import { LoyaltyBadge } from '@/components/customers/LoyaltyBadge';
import { cn } from '@/lib/utils';

const checkoutSchema = z.object({
  customer_id: z.string().optional(),
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
  const { data: customers = [] } = useCustomers();
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customer_id: '',
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

  // Points customer will earn
  const pointsToEarn = Math.floor(total / 100);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue('customer_id', customer.id);
    form.setValue('customer_name', customer.full_name);
    form.setValue('customer_phone', customer.phone || '');
    setCustomerSearchOpen(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    form.setValue('customer_id', '');
    form.setValue('customer_name', '');
    form.setValue('customer_phone', '');
  };

  const onSubmit = async (data: CheckoutFormData) => {
    try {
      await createSale.mutateAsync({
        customer_id: data.customer_id || undefined,
        customer_name: data.customer_name || undefined,
        customer_phone: data.customer_phone || undefined,
        discount_pkr: data.discount_pkr || 0,
        payment_method: data.payment_method,
        notes: data.notes || undefined,
        items,
      });
      form.reset();
      setSelectedCustomer(null);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setSelectedCustomer(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

            {/* Customer Selection */}
            <div className="space-y-2">
              <Label>Customer (Optional)</Label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{selectedCustomer.full_name}</p>
                      <div className="flex items-center gap-2">
                        <LoyaltyBadge tier={selectedCustomer.loyalty_tier} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          +{pointsToEarn} pts with this order
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={handleClearCustomer}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      <span className="text-muted-foreground">Search customer...</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search by name or phone..." />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {customers.slice(0, 10).map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={`${customer.full_name} ${customer.phone || ''}`}
                              onSelect={() => handleSelectCustomer(customer)}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <span>{customer.full_name}</span>
                                {customer.phone && (
                                  <span className="text-xs text-muted-foreground">
                                    {customer.phone}
                                  </span>
                                )}
                              </div>
                              <LoyaltyBadge tier={customer.loyalty_tier} size="sm" showLabel={false} />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
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
                          className={cn(
                            "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                            field.value === method.value
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted"
                          )}
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

            {/* Manual Customer Details (if no customer selected) */}
            {!selectedCustomer && (
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
            )}

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
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
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
