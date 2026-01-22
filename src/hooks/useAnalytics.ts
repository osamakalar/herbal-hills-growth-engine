import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, subDays, format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';

export interface DailySalesData {
  date: string;
  counter_sales: number;
  field_sales: number;
  total: number;
}

export interface SalesHeatmapData {
  day: string;
  hour: number;
  value: number;
}

export interface InventoryStats {
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  total_value: number;
  by_category: { name: string; value: number; count: number }[];
}

export interface RepPerformance {
  user_id: string;
  full_name: string;
  total_sales: number;
  target: number;
  percentage: number;
}

// Get daily sales for the last 30 days
export function useDailySales(days: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'daily-sales', days],
    queryFn: async () => {
      const startDate = subDays(new Date(), days);
      
      const { data, error } = await supabase
        .from('sales')
        .select('created_at, total_pkr, created_by')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const salesByDate = new Map<string, { counter: number; field: number }>();
      
      // Initialize all dates in range
      const dateRange = eachDayOfInterval({ start: startDate, end: new Date() });
      dateRange.forEach((date) => {
        salesByDate.set(format(date, 'yyyy-MM-dd'), { counter: 0, field: 0 });
      });

      // Aggregate sales
      data?.forEach((sale) => {
        const date = format(new Date(sale.created_at), 'yyyy-MM-dd');
        const existing = salesByDate.get(date) || { counter: 0, field: 0 };
        // For now, all sales are counter sales until we add field sales tracking
        existing.counter += Number(sale.total_pkr);
        salesByDate.set(date, existing);
      });

      const result: DailySalesData[] = [];
      salesByDate.forEach((value, date) => {
        result.push({
          date,
          counter_sales: value.counter,
          field_sales: value.field,
          total: value.counter + value.field,
        });
      });

      return result.sort((a, b) => a.date.localeCompare(b.date));
    },
  });
}

// Get sales by hour of day for heatmap
export function useSalesHeatmap() {
  return useQuery({
    queryKey: ['analytics', 'sales-heatmap'],
    queryFn: async () => {
      const startDate = subDays(new Date(), 30);
      
      const { data, error } = await supabase
        .from('sales')
        .select('created_at, total_pkr')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'completed');

      if (error) throw error;

      // Create heatmap data: day of week x hour of day
      const heatmap = new Map<string, number>();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      // Initialize all slots
      days.forEach((day) => {
        for (let hour = 9; hour <= 21; hour++) {
          heatmap.set(`${day}-${hour}`, 0);
        }
      });

      data?.forEach((sale) => {
        const date = new Date(sale.created_at);
        const day = days[date.getDay()];
        const hour = date.getHours();
        if (hour >= 9 && hour <= 21) {
          const key = `${day}-${hour}`;
          heatmap.set(key, (heatmap.get(key) || 0) + Number(sale.total_pkr));
        }
      });

      const result: SalesHeatmapData[] = [];
      heatmap.forEach((value, key) => {
        const [day, hour] = key.split('-');
        result.push({ day, hour: parseInt(hour), value });
      });

      return result;
    },
  });
}

// Get inventory statistics
export function useInventoryStats() {
  return useQuery({
    queryKey: ['analytics', 'inventory-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      const stats: InventoryStats = {
        in_stock: 0,
        low_stock: 0,
        out_of_stock: 0,
        total_value: 0,
        by_category: [],
      };

      const categoryMap = new Map<string, { value: number; count: number }>();

      data?.forEach((product) => {
        const stockValue = Number(product.price_pkr) * product.stock_quantity;
        stats.total_value += stockValue;

        if (product.stock_quantity === 0) {
          stats.out_of_stock++;
        } else if (product.stock_quantity <= product.low_stock_threshold) {
          stats.low_stock++;
        } else {
          stats.in_stock++;
        }

        const category = product.category || 'Uncategorized';
        const existing = categoryMap.get(category) || { value: 0, count: 0 };
        existing.value += stockValue;
        existing.count++;
        categoryMap.set(category, existing);
      });

      categoryMap.forEach((data, name) => {
        stats.by_category.push({ name, value: data.value, count: data.count });
      });

      stats.by_category.sort((a, b) => b.value - a.value);

      return stats;
    },
  });
}

// Get monthly sales totals
export function useMonthlySales() {
  return useQuery({
    queryKey: ['analytics', 'monthly-sales'],
    queryFn: async () => {
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(now);
      const endOfCurrentMonth = endOfMonth(now);
      
      const { data, error } = await supabase
        .from('sales')
        .select('total_pkr')
        .gte('created_at', startOfCurrentMonth.toISOString())
        .lte('created_at', endOfCurrentMonth.toISOString())
        .eq('status', 'completed');

      if (error) throw error;

      const total = data?.reduce((sum, sale) => sum + Number(sale.total_pkr), 0) || 0;
      
      return {
        current_month: total,
        target: 500000, // Default monthly target - can be made configurable
      };
    },
  });
}

// Get top performers for race track
export function useTopPerformers() {
  return useQuery({
    queryKey: ['analytics', 'top-performers'],
    queryFn: async () => {
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(now);
      
      // Get all team members with health_rep or counter_staff role
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .in('role', ['health_rep', 'counter_staff', 'manager']);

      if (membersError) throw membersError;

      // Get sales by each user this month
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('created_by, total_pkr')
        .gte('created_at', startOfCurrentMonth.toISOString())
        .eq('status', 'completed');

      if (salesError) throw salesError;

      // Aggregate sales by user
      const salesByUser = new Map<string, number>();
      sales?.forEach((sale) => {
        if (sale.created_by) {
          salesByUser.set(
            sale.created_by,
            (salesByUser.get(sale.created_by) || 0) + Number(sale.total_pkr)
          );
        }
      });

      // Create performance data
      const defaultTarget = 100000; // Default monthly target per rep
      const performers: RepPerformance[] = (members || []).map((member) => {
        const totalSales = salesByUser.get(member.user_id) || 0;
        return {
          user_id: member.user_id,
          full_name: member.full_name,
          total_sales: totalSales,
          target: defaultTarget,
          percentage: (totalSales / defaultTarget) * 100,
        };
      });

      // Sort by percentage descending
      performers.sort((a, b) => b.percentage - a.percentage);

      return performers;
    },
  });
}
