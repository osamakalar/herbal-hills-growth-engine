-- Create targets table for monthly targets per rep
CREATE TABLE public.targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- First day of the month
    target_amount_pkr NUMERIC(12, 2) NOT NULL DEFAULT 100000,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, month)
);

-- Create appointments table for health rep field appointments
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    notes TEXT,
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    commission_pkr NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create commissions table to track calculated commissions
CREATE TABLE public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- First day of the month
    domestic_sales_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
    international_sales_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
    appointment_sales_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
    domestic_commission_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0, -- 4%
    international_commission_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0, -- 2%
    appointment_commission_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0, -- 10%
    total_commission_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
    target_amount_pkr NUMERIC(12, 2) NOT NULL DEFAULT 100000,
    achieved_amount_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
    achievement_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
    is_released BOOLEAN NOT NULL DEFAULT false, -- Released when >= 90% target
    is_family_dinner BOOLEAN NOT NULL DEFAULT false, -- Triggered at 150% target
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, month)
);

-- Add currency column to sales for tracking international sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'PKR';

-- Enable RLS
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Targets policies
CREATE POLICY "Admins and managers can view all targets"
ON public.targets FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can view their own targets"
ON public.targets FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins and managers can manage targets"
ON public.targets FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Appointments policies
CREATE POLICY "Admins and managers can view all appointments"
ON public.appointments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can view their own appointments"
ON public.appointments FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Health reps can create their own appointments"
ON public.appointments FOR INSERT
WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(), 'health_rep'::app_role));

CREATE POLICY "Users can update their own appointments"
ON public.appointments FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can delete appointments"
ON public.appointments FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Commissions policies
CREATE POLICY "Admins and managers can view all commissions"
ON public.commissions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can view their own commissions"
ON public.commissions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Only admins can manage commissions"
ON public.commissions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at triggers
CREATE TRIGGER update_targets_updated_at
BEFORE UPDATE ON public.targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at
BEFORE UPDATE ON public.commissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();