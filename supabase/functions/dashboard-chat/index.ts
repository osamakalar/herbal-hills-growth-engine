import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, format } from "https://esm.sh/date-fns@3.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Function to fetch business data for AI context
async function fetchBusinessContext(supabase: any) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const yesterday = subDays(now, 1);
  const yesterdayStart = startOfDay(yesterday);
  const yesterdayEnd = endOfDay(yesterday);
  const last7Days = subDays(now, 7);

  // Fetch today's sales
  const { data: todaySales } = await supabase
    .from("sales")
    .select("total_pkr, customer_name, payment_method")
    .eq("status", "completed")
    .gte("created_at", todayStart.toISOString())
    .lte("created_at", todayEnd.toISOString());

  const todayTotal = todaySales?.reduce((sum: number, s: any) => sum + Number(s.total_pkr), 0) || 0;
  const todayTransactions = todaySales?.length || 0;

  // Fetch yesterday's sales
  const { data: yesterdaySales } = await supabase
    .from("sales")
    .select("total_pkr")
    .eq("status", "completed")
    .gte("created_at", yesterdayStart.toISOString())
    .lte("created_at", yesterdayEnd.toISOString());

  const yesterdayTotal = yesterdaySales?.reduce((sum: number, s: any) => sum + Number(s.total_pkr), 0) || 0;

  // Fetch this month's sales
  const { data: monthSales } = await supabase
    .from("sales")
    .select("total_pkr, created_at")
    .eq("status", "completed")
    .gte("created_at", monthStart.toISOString())
    .lte("created_at", monthEnd.toISOString());

  const monthTotal = monthSales?.reduce((sum: number, s: any) => sum + Number(s.total_pkr), 0) || 0;
  const monthTransactions = monthSales?.length || 0;

  // Fetch last 7 days sales for trend
  const { data: weekSales } = await supabase
    .from("sales")
    .select("total_pkr, created_at")
    .eq("status", "completed")
    .gte("created_at", last7Days.toISOString())
    .lte("created_at", todayEnd.toISOString());

  const weekTotal = weekSales?.reduce((sum: number, s: any) => sum + Number(s.total_pkr), 0) || 0;

  // Fetch targets
  const { data: targets } = await supabase
    .from("targets")
    .select("target_amount_pkr, user_id");

  const totalTarget = targets?.reduce((sum: number, t: any) => sum + Number(t.target_amount_pkr), 0) || 0;
  const targetProgress = totalTarget > 0 ? Math.round((monthTotal / totalTarget) * 100) : 0;

  // Fetch products with stock info
  const { data: products } = await supabase
    .from("products")
    .select("name, price_pkr, stock_quantity, low_stock_threshold, category")
    .eq("is_active", true)
    .order("stock_quantity", { ascending: true });

  const lowStockProducts = products?.filter((p: any) => p.stock_quantity <= p.low_stock_threshold) || [];
  const outOfStockProducts = products?.filter((p: any) => p.stock_quantity === 0) || [];
  const totalProducts = products?.length || 0;

  // Fetch top selling products this month
  const { data: saleItems } = await supabase
    .from("sale_items")
    .select(`
      product_name,
      quantity,
      total_pkr,
      sales!inner(created_at, status)
    `)
    .eq("sales.status", "completed")
    .gte("sales.created_at", monthStart.toISOString())
    .lte("sales.created_at", monthEnd.toISOString());

  const productSalesMap = new Map<string, { qty: number; revenue: number }>();
  saleItems?.forEach((item: any) => {
    const existing = productSalesMap.get(item.product_name) || { qty: 0, revenue: 0 };
    productSalesMap.set(item.product_name, {
      qty: existing.qty + item.quantity,
      revenue: existing.revenue + Number(item.total_pkr),
    });
  });
  const topProducts = [...productSalesMap.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  // Fetch customer stats
  const { data: customers } = await supabase
    .from("customers")
    .select("full_name, total_purchases_pkr, total_orders, loyalty_tier")
    .eq("is_active", true)
    .order("total_purchases_pkr", { ascending: false })
    .limit(10);

  const { count: totalCustomers } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // Fetch team performance with sales data
  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("user_id, full_name, role");

  // Get sales by team member this month
  const { data: teamSales } = await supabase
    .from("sales")
    .select("created_by, total_pkr")
    .eq("status", "completed")
    .gte("created_at", monthStart.toISOString())
    .lte("created_at", monthEnd.toISOString());

  const salesByUser = new Map<string, number>();
  teamSales?.forEach((sale: any) => {
    if (sale.created_by) {
      salesByUser.set(sale.created_by, (salesByUser.get(sale.created_by) || 0) + Number(sale.total_pkr));
    }
  });

  const teamPerformance = teamMembers?.map((member: any) => ({
    name: member.full_name,
    role: member.role,
    monthSales: salesByUser.get(member.user_id) || 0,
  })).sort((a: any, b: any) => b.monthSales - a.monthSales) || [];

  // Calculate daily average
  const daysInMonth = now.getDate();
  const dailyAverage = monthTotal / daysInMonth;

  return {
    currentDate: format(now, "EEEE, dd MMMM yyyy"),
    currentTime: format(now, "HH:mm"),
    
    todaySales: {
      total: todayTotal,
      transactions: todayTransactions,
      averageOrderValue: todayTransactions > 0 ? Math.round(todayTotal / todayTransactions) : 0,
    },
    
    yesterdaySales: {
      total: yesterdayTotal,
      changePercent: yesterdayTotal > 0 ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100) : 0,
    },
    
    thisMonthSales: {
      total: monthTotal,
      transactions: monthTransactions,
      dailyAverage: Math.round(dailyAverage),
      projectedMonthEnd: Math.round(dailyAverage * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()),
    },
    
    last7DaysSales: {
      total: weekTotal,
      dailyAverage: Math.round(weekTotal / 7),
    },
    
    targets: {
      monthlyTarget: totalTarget,
      achieved: monthTotal,
      progressPercent: targetProgress,
      remaining: Math.max(0, totalTarget - monthTotal),
      onTrack: targetProgress >= (daysInMonth / 30) * 100,
    },
    
    inventory: {
      totalProducts,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      lowStockItems: lowStockProducts.slice(0, 5).map((p: any) => ({
        name: p.name,
        stock: p.stock_quantity,
        threshold: p.low_stock_threshold,
      })),
      outOfStockItems: outOfStockProducts.slice(0, 5).map((p: any) => p.name),
    },
    
    topSellingProducts: topProducts.map(([name, data]) => ({
      name,
      quantitySold: data.qty,
      revenue: data.revenue,
    })),
    
    customers: {
      totalActive: totalCustomers || 0,
      topCustomers: customers?.slice(0, 5).map((c: any) => ({
        name: c.full_name,
        totalSpent: c.total_purchases_pkr,
        orders: c.total_orders,
        tier: c.loyalty_tier,
      })) || [],
    },
    
    teamPerformance,
    
    productCatalog: products?.slice(0, 20).map((p: any) => ({
      name: p.name,
      price: p.price_pkr,
      stock: p.stock_quantity,
      category: p.category,
    })) || [],
  };
}

function buildSystemPrompt(context: any) {
  return `You are an intelligent business assistant for Herbal Hills. You have access to real-time business data and provide insights, analytics, and advice.

## CURRENT BUSINESS DATA:

### 📅 ${context.currentDate} at ${context.currentTime} PKT

### 💰 TODAY'S SALES
- Revenue: Rs. ${context.todaySales.total.toLocaleString()} | Transactions: ${context.todaySales.transactions}
- Avg Order: Rs. ${context.todaySales.averageOrderValue.toLocaleString()}
- vs Yesterday: ${context.yesterdaySales.changePercent >= 0 ? '+' : ''}${context.yesterdaySales.changePercent}%

### 📊 THIS MONTH
- Revenue: Rs. ${context.thisMonthSales.total.toLocaleString()} | Transactions: ${context.thisMonthSales.transactions}
- Daily Avg: Rs. ${context.thisMonthSales.dailyAverage.toLocaleString()}
- Projected: Rs. ${context.thisMonthSales.projectedMonthEnd.toLocaleString()}

### 🎯 TARGETS
- Target: Rs. ${context.targets.monthlyTarget.toLocaleString()}
- Achieved: Rs. ${context.targets.achieved.toLocaleString()} (${context.targets.progressPercent}%)
- Remaining: Rs. ${context.targets.remaining.toLocaleString()}
- Status: ${context.targets.onTrack ? '✅ On Track' : '⚠️ Behind Schedule'}

### 📦 INVENTORY
- Products: ${context.inventory.totalProducts} | Low Stock: ${context.inventory.lowStockCount} | Out of Stock: ${context.inventory.outOfStockCount}
${context.inventory.lowStockItems.length > 0 ? `- Low Stock: ${context.inventory.lowStockItems.map((p: any) => `${p.name} (${p.stock})`).join(', ')}` : ''}

### 🏆 TOP PRODUCTS (This Month)
${context.topSellingProducts.map((p: any, i: number) => `${i + 1}. ${p.name} - ${p.quantitySold} units, Rs. ${p.revenue.toLocaleString()}`).join('\n') || 'No sales yet'}

### 👥 TEAM PERFORMANCE (This Month)
${context.teamPerformance.map((m: any, i: number) => `${i + 1}. ${m.name} (${m.role}) - Rs. ${m.monthSales.toLocaleString()}`).join('\n') || 'No team data'}

### 👥 CUSTOMERS: ${context.customers.totalActive} active

## GUIDELINES:
- Use markdown formatting for clarity
- Be concise but comprehensive
- Provide actionable insights
- If data shows issues (low stock, behind target), proactively mention them`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch real-time business context
    const businessContext = await fetchBusinessContext(supabase);
    const systemPrompt = buildSystemPrompt(businessContext);

    // Call Lovable AI Gateway with streaming
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error: unknown) {
    console.error("Dashboard chat error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
