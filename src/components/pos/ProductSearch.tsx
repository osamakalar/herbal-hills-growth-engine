import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Package } from 'lucide-react';
import { Product } from '@/hooks/useProducts';

interface ProductSearchProps {
  products: Product[];
  isLoading: boolean;
  onAddToCart: (product: Product) => void;
}

export function ProductSearch({ products, isLoading, onAddToCart }: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products.filter((p) => p.is_active && p.stock_quantity > 0);

    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.is_active &&
        (p.name.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products by name, SKU, or barcode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 text-lg"
          autoFocus
        />
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-3" />
                  <div className="h-6 bg-muted rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Package className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:border-primary transition-colors group"
                onClick={() => product.stock_quantity > 0 && onAddToCart(product)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-2">{product.name}</h3>
                      {product.sku && (
                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={product.stock_quantity === 0}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">
                      {formatPrice(product.price_pkr)}
                    </span>
                    <Badge
                      variant={product.stock_quantity === 0 ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {product.stock_quantity === 0 ? 'Out of Stock' : `${product.stock_quantity} in stock`}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
