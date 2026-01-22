-- Create loyalty tier enum
CREATE TYPE public.loyalty_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');

-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  loyalty_tier loyalty_tier NOT NULL DEFAULT 'bronze',
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  total_purchases_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Customers policies
CREATE POLICY "Authenticated users can view customers" 
ON public.customers 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can create customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'counter_staff'::app_role) OR
  has_role(auth.uid(), 'health_rep'::app_role)
);

CREATE POLICY "Staff can update customers" 
ON public.customers 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'health_rep'::app_role)
);

CREATE POLICY "Only admins can delete customers" 
ON public.customers 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add customer_id to sales table
ALTER TABLE public.sales ADD COLUMN customer_id UUID REFERENCES public.customers(id);

-- Create index for customer lookups
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_email ON public.customers(email);
CREATE INDEX idx_customers_loyalty_tier ON public.customers(loyalty_tier);
CREATE INDEX idx_sales_customer_id ON public.sales(customer_id);

-- Create trigger for timestamp updates
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update customer stats after sale
CREATE OR REPLACE FUNCTION public.update_customer_stats_after_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NEW.status = 'completed' THEN
    UPDATE public.customers
    SET 
      total_purchases_pkr = total_purchases_pkr + NEW.total_pkr,
      total_orders = total_orders + 1,
      loyalty_points = loyalty_points + FLOOR(NEW.total_pkr / 100),
      loyalty_tier = CASE
        WHEN (total_purchases_pkr + NEW.total_pkr) >= 100000 THEN 'platinum'::loyalty_tier
        WHEN (total_purchases_pkr + NEW.total_pkr) >= 50000 THEN 'gold'::loyalty_tier
        WHEN (total_purchases_pkr + NEW.total_pkr) >= 20000 THEN 'silver'::loyalty_tier
        ELSE 'bronze'::loyalty_tier
      END
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to update customer stats after sale
CREATE TRIGGER update_customer_on_sale
AFTER INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_stats_after_sale();