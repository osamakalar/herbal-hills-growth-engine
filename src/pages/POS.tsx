import { useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Receipt } from 'lucide-react';
import { useProducts, Product } from '@/hooks/useProducts';
import { useTodaySales, CartItem } from '@/hooks/useSales';
import { ProductSearch } from '@/components/pos/ProductSearch';
import { Cart } from '@/components/pos/Cart';
import { CheckoutDialog } from '@/components/pos/CheckoutDialog';
import { DailySalesSummary } from '@/components/pos/DailySalesSummary';
import { useToast } from '@/hooks/use-toast';

export default function POS() {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: todaySales = [], isLoading: salesLoading } = useTodaySales();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);

      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          toast({
            title: 'Stock limit reached',
            description: `Only ${product.stock_quantity} units available.`,
            variant: 'destructive',
          });
          return prev;
        }
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price_pkr: product.price_pkr,
          stock_quantity: product.stock_quantity,
        },
      ];
    });
  }, [toast]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) return;
    setCart((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: Math.min(quantity, item.stock_quantity) }
          : item
      )
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const handleCheckoutSuccess = useCallback(() => {
    setCart([]);
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.unit_price_pkr * item.quantity, 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-4">
        {/* Left Panel - Product Search */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="mb-4">
            <h1 className="text-2xl font-bold tracking-tight">Point of Sale</h1>
            <p className="text-muted-foreground">Karachi Counter</p>
          </div>
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-base">Products</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-hidden">
              <ProductSearch
                products={products}
                isLoading={productsLoading}
                onAddToCart={addToCart}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Cart & Summary */}
        <div className="w-full lg:w-[400px] flex flex-col gap-4">
          {/* Cart */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="py-3 px-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Current Sale
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto">
                <Cart
                  items={cart}
                  onUpdateQuantity={updateQuantity}
                  onRemoveItem={removeFromCart}
                  onClearCart={clearCart}
                />
              </div>

              {cart.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg gap-2"
                    onClick={() => setIsCheckoutOpen(true)}
                  >
                    <Receipt className="h-5 w-5" />
                    Checkout {formatPrice(subtotal)}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Daily Summary */}
          <div className="lg:max-h-[40%] overflow-auto">
            <DailySalesSummary sales={todaySales} isLoading={salesLoading} />
          </div>
        </div>
      </div>

      <CheckoutDialog
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        items={cart}
        onSuccess={handleCheckoutSuccess}
      />
    </DashboardLayout>
  );
}
