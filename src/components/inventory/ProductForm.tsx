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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Product, ProductInsert, useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';
import { useEffect } from 'react';

const productSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(200, 'Name must be less than 200 characters'),
  description: z.string().trim().max(1000, 'Description must be less than 1000 characters').optional().nullable(),
  sku: z.string().trim().max(50, 'SKU must be less than 50 characters').optional().nullable(),
  price_pkr: z.coerce.number().min(0, 'Price must be 0 or greater'),
  stock_quantity: z.coerce.number().int().min(0, 'Stock must be 0 or greater'),
  low_stock_threshold: z.coerce.number().int().min(0, 'Threshold must be 0 or greater'),
  category: z.string().trim().max(100, 'Category must be less than 100 characters').optional().nullable(),
  is_active: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export function ProductForm({ open, onOpenChange, product }: ProductFormProps) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isEditing = !!product;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      price_pkr: 0,
      stock_quantity: 0,
      low_stock_threshold: 10,
      category: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description || '',
        sku: product.sku || '',
        price_pkr: product.price_pkr,
        stock_quantity: product.stock_quantity,
        low_stock_threshold: product.low_stock_threshold,
        category: product.category || '',
        is_active: product.is_active,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        sku: '',
        price_pkr: 0,
        stock_quantity: 0,
        low_stock_threshold: 10,
        category: '',
        is_active: true,
      });
    }
  }, [product, form]);

  const onSubmit = async (data: ProductFormData) => {
    const productData: ProductInsert = {
      name: data.name,
      description: data.description || null,
      sku: data.sku || null,
      price_pkr: data.price_pkr,
      stock_quantity: data.stock_quantity,
      low_stock_threshold: data.low_stock_threshold,
      category: data.category || null,
      is_active: data.is_active,
    };

    try {
      if (isEditing && product) {
        await updateProduct.mutateAsync({ id: product.id, ...productData });
      } else {
        await createProduct.mutateAsync(productData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the product details below.'
              : 'Fill in the details to add a new product to inventory.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Ashwagandha Capsules" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., HH-ASH-001" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Supplements" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Product description..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="price_pkr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (PKR) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stock_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Qty *</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="low_stock_threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low Stock Alert</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">Alert when below</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>Product is available for sale</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : isEditing ? 'Update Product' : 'Add Product'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
