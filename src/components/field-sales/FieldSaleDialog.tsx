import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProducts } from '@/hooks/useProducts';
import { useCustomers } from '@/hooks/useCustomers';
import { useCurrencySettings } from '@/hooks/useCurrencySettings';
import { useCreateFieldSale } from '@/hooks/useFieldSales';
import {
  Plus,
  Minus,
  Trash2,
  Search,
  Globe,
  Check,
  ChevronsUpDown,
  ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const fieldSaleSchema = z.object({
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  currency: z.enum(['PKR', 'SAR', 'AED']),
  payment_method: z.enum(['cash', 'card', 'bank_transfer', 'mobile_wallet']),
  discount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

type FieldSaleFormData = z.infer<typeof fieldSaleSchema>;

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  max_stock: number;
}

interface FieldSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const currencySymbols: Record<string, string> = {
  PKR: '₨',
  SAR: 'ر.س',
  AED: 'د.إ',
};

export function FieldSaleDialog({ open, onOpenChange }: FieldSaleDialogProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);

  const { data: products } = useProducts();
  const { data: customers } = useCustomers();
  const { data: currencies } = useCurrencySettings();
  const createFieldSale = useCreateFieldSale();

  const form = useForm<FieldSaleFormData>({
    resolver: zodResolver(fieldSaleSchema),
    defaultValues: {
      currency: 'PKR',
      payment_method: 'cash',
      discount: 0,
    },
  });

  const selectedCurrency = form.watch('currency');
  const discount = form.watch('discount') || 0;

  // Get exchange rate for selected currency
  const exchangeRate = useMemo(() => {
    if (selectedCurrency === 'PKR') return 1;
    const currency = currencies?.find(c => c.currency_code === selectedCurrency);
    return currency ? Number(currency.exchange_rate_to_pkr) : 1;
  }, [selectedCurrency, currencies]);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const total = subtotal - discount;
  const totalPKR = total * exchangeRate;

  const formatPrice = (amount: number, currency: string = selectedCurrency) => {
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const addToCart = (product: typeof products extends (infer T)[] | undefined ? T : never) => {
    if (!product) return;

    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      if (existing.quantity < existing.max_stock) {
        setCart(cart.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      }
    } else {
      // Convert price based on currency
      const priceInCurrency = Number(product.price_pkr) / exchangeRate;
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: priceInCurrency,
        max_stock: product.stock_quantity,
      }]);
    }
    setProductOpen(false);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQty = Math.max(1, Math.min(item.max_stock, item.quantity + delta));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const handleSelectCustomer = (customer: typeof customers extends (infer T)[] | undefined ? T : never) => {
    if (!customer) return;
    setSelectedCustomerId(customer.id);
    form.setValue('customer_name', customer.full_name);
    form.setValue('customer_phone', customer.phone || '');
    setCustomerOpen(false);
  };

  const clearCustomer = () => {
    setSelectedCustomerId(null);
    form.setValue('customer_name', '');
    form.setValue('customer_phone', '');
  };

  const onSubmit = async (data: FieldSaleFormData) => {
    if (cart.length === 0) return;

    await createFieldSale.mutateAsync({
      customer_id: selectedCustomerId || undefined,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      items: cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
      currency: data.currency,
      discount: data.discount,
      payment_method: data.payment_method,
      notes: data.notes,
    });

    // Reset form
    setCart([]);
    setSelectedCustomerId(null);
    form.reset();
    onOpenChange(false);
  };

  // Update cart prices when currency changes
  const handleCurrencyChange = (newCurrency: 'PKR' | 'SAR' | 'AED') => {
    const oldRate = exchangeRate;
    const newRate = newCurrency === 'PKR' ? 1 : 
      currencies?.find(c => c.currency_code === newCurrency)?.exchange_rate_to_pkr || 1;
    
    // Convert cart prices to new currency
    setCart(cart.map(item => ({
      ...item,
      unit_price: (item.unit_price * oldRate) / Number(newRate),
    })));
    
    // Convert discount too
    const currentDiscount = form.getValues('discount') || 0;
    form.setValue('discount', (currentDiscount * oldRate) / Number(newRate));
    form.setValue('currency', newCurrency);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Record Field Sale
          </DialogTitle>
          <DialogDescription>
            Record a sale made outside the physical counter
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-4">
            {/* Currency Selection */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <Label>Sale Currency</Label>
                <p className="text-xs text-muted-foreground">
                  All amounts will be converted to PKR for reporting
                </p>
              </div>
              <div className="flex gap-2">
                {['PKR', 'SAR', 'AED'].map((curr) => (
                  <Button
                    key={curr}
                    type="button"
                    size="sm"
                    variant={selectedCurrency === curr ? 'default' : 'outline'}
                    onClick={() => handleCurrencyChange(curr as 'PKR' | 'SAR' | 'AED')}
                    className={cn(
                      selectedCurrency === curr && curr !== 'PKR' && 'bg-secondary'
                    )}
                  >
                    {currencySymbols[curr]} {curr}
                  </Button>
                ))}
              </div>
            </div>

            {/* Customer Selection */}
            <div className="space-y-2">
              <Label>Customer</Label>
              <div className="flex gap-2">
                <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="flex-1 justify-between"
                    >
                      {selectedCustomerId
                        ? customers?.find(c => c.id === selectedCustomerId)?.full_name
                        : 'Search customer...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Search customers..." />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {customers?.slice(0, 10).map((customer) => (
                            <CommandItem
                              key={customer.id}
                              onSelect={() => handleSelectCustomer(customer)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCustomerId === customer.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div>
                                <p className="font-medium">{customer.full_name}</p>
                                <p className="text-xs text-muted-foreground">{customer.phone}</p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedCustomerId && (
                  <Button variant="ghost" size="icon" onClick={clearCustomer}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Manual customer input */}
              {!selectedCustomerId && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Input
                    placeholder="Customer name (optional)"
                    {...form.register('customer_name')}
                  />
                  <Input
                    placeholder="Phone (optional)"
                    {...form.register('customer_phone')}
                  />
                </div>
              )}
            </div>

            {/* Product Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Products</Label>
                <Popover open={productOpen} onOpenChange={setProductOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Product
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search products..." />
                      <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup>
                          {products?.filter(p => p.is_active && p.stock_quantity > 0).slice(0, 15).map((product) => (
                            <CommandItem
                              key={product.id}
                              onSelect={() => addToCart(product)}
                            >
                              <div className="flex-1">
                                <p className="font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatPrice(Number(product.price_pkr) / exchangeRate)} • Stock: {product.stock_quantity}
                                </p>
                              </div>
                              <Plus className="h-4 w-4" />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Cart Items */}
              {cart.length === 0 ? (
                <div className="text-center py-8 border rounded-lg border-dashed text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No products added yet</p>
                  <p className="text-xs">Click "Add Product" to start</p>
                </div>
              ) : (
                <div className="border rounded-lg divide-y">
                  {cart.map((item) => (
                    <div key={item.product_id} className="p-3 flex items-center gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(item.unit_price)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product_id, -1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product_id, 1)}
                          disabled={item.quantity >= item.max_stock}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="w-20 text-right font-medium">
                        {formatPrice(item.unit_price * item.quantity)}
                      </p>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeFromCart(item.product_id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment & Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={form.watch('payment_method')}
                  onValueChange={(v) => form.setValue('payment_method', v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_wallet">Mobile Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount ({currencySymbols[selectedCurrency]})</Label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  {...form.register('discount', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Add any notes about this sale..."
                {...form.register('notes')}
              />
            </div>

            {/* Totals */}
            {cart.length > 0 && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Discount</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
                {selectedCurrency !== 'PKR' && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Equivalent in PKR</span>
                    <span>≈ ₨{totalPKR.toLocaleString('en-PK', { maximumFractionDigits: 0 })}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={cart.length === 0 || createFieldSale.isPending}
            className="flex-1"
          >
            {createFieldSale.isPending ? 'Recording...' : `Record Sale (${formatPrice(total)})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
