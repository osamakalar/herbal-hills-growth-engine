-- Create enum for sale status
CREATE TYPE public.sale_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');

-- Create enum for payment method
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'bank_transfer', 'mobile_wallet');

-- Create sales table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_number TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  status sale_status NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sale items table
CREATE TABLE public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_pkr NUMERIC(12, 2) NOT NULL,
  total_pkr NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Sales policies
-- All authenticated users can view sales
CREATE POLICY "Authenticated users can view sales" 
ON public.sales 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Admin, manager, and counter_staff can create sales
CREATE POLICY "Staff can create sales" 
ON public.sales 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'counter_staff'::app_role)
);

-- Admin and manager can update sales
CREATE POLICY "Admins and managers can update sales" 
ON public.sales 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Only admin can delete sales
CREATE POLICY "Only admins can delete sales" 
ON public.sales 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Sale items policies
CREATE POLICY "Authenticated users can view sale items" 
ON public.sale_items 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can create sale items" 
ON public.sale_items 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'counter_staff'::app_role)
);

-- Create triggers for timestamp updates
CREATE TRIGGER update_sales_updated_at
BEFORE UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_sales_created_at ON public.sales(created_at);
CREATE INDEX idx_sales_created_by ON public.sales(created_by);
CREATE INDEX idx_sales_status ON public.sales(status);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON public.sale_items(product_id);

-- Create function to generate sale number
CREATE OR REPLACE FUNCTION public.generate_sale_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  today_date TEXT;
  sequence_num INTEGER;
  new_sale_number TEXT;
BEGIN
  today_date := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(sale_number FROM 10) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.sales
  WHERE sale_number LIKE 'HH-' || today_date || '-%';
  
  new_sale_number := 'HH-' || today_date || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN new_sale_number;
END;
$$;

-- Create function to update stock after sale
CREATE OR REPLACE FUNCTION public.update_stock_after_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to update stock after sale item is created
CREATE TRIGGER update_stock_on_sale
AFTER INSERT ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION public.update_stock_after_sale();