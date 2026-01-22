import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { CartItem } from '@/hooks/useSales';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
}

export function Cart({ items, onUpdateQuantity, onRemoveItem, onClearCart }: CartProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const subtotal = items.reduce((sum, item) => sum + item.unit_price_pkr * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
        <ShoppingCart className="h-16 w-16 mb-4" />
        <p className="text-lg font-medium">Cart is empty</p>
        <p className="text-sm">Add products to start a sale</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Cart</h3>
          <p className="text-sm text-muted-foreground">{itemCount} items</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClearCart} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>

      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.product_id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-1">{item.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatPrice(item.unit_price_pkr)} each
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    onUpdateQuantity(item.product_id, Math.min(val, item.stock_quantity));
                  }}
                  className="w-12 h-7 text-center px-1"
                  min={1}
                  max={item.stock_quantity}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                  disabled={item.quantity >= item.stock_quantity}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-right w-20">
                <p className="font-semibold text-sm">
                  {formatPrice(item.unit_price_pkr * item.quantity)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onRemoveItem(item.product_id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator className="my-4" />

      <div className="space-y-2">
        <div className="flex justify-between text-lg font-bold">
          <span>Subtotal</span>
          <span className="text-primary">{formatPrice(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}
