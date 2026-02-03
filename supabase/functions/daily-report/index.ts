import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { startOfDay, endOfDay, startOfMonth, format } from "https://esm.sh/date-fns@3.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
    const REPORT_WHATSAPP_NUMBER = Deno.env.get("REPORT_WHATSAPP_NUMBER");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      throw new Error("Twilio credentials not configured");
    }

    if (!REPORT_WHATSAPP_NUMBER) {
      throw new Error("REPORT_WHATSAPP_NUMBER is not configured");
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);

    // Fetch yesterday's sales (for morning report showing previous day)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);

    // 1. Get yesterday's sales summary
    const { data: yesterdaySales, error: salesError } = await supabase
      .from("sales")
      .select("total_pkr, status")
      .eq("status", "completed")
      .gte("created_at", yesterdayStart.toISOString())
      .lte("created_at", yesterdayEnd.toISOString());

    if (salesError) throw salesError;

    const totalSales = yesterdaySales?.reduce((sum, s) => sum + Number(s.total_pkr), 0) || 0;
    const transactionCount = yesterdaySales?.length || 0;

    // 2. Get month-to-date sales for target progress
    const { data: monthSales, error: monthError } = await supabase
      .from("sales")
      .select("total_pkr")
      .eq("status", "completed")
      .gte("created_at", monthStart.toISOString())
      .lte("created_at", now.toISOString());

    if (monthError) throw monthError;

    const monthTotal = monthSales?.reduce((sum, s) => sum + Number(s.total_pkr), 0) || 0;

    // 3. Get targets for current month
    const monthString = format(monthStart, "yyyy-MM-dd");
    const { data: targets, error: targetError } = await supabase
      .from("targets")
      .select("target_amount_pkr");

    if (targetError) throw targetError;

    const totalTarget = targets?.reduce((sum, t) => sum + Number(t.target_amount_pkr), 0) || 0;
    const targetProgress = totalTarget > 0 ? Math.round((monthTotal / totalTarget) * 100) : 0;

    // 4. Get low stock products (stock_quantity <= low_stock_threshold)
    const { data: allProducts, error: stockError } = await supabase
      .from("products")
      .select("name, stock_quantity, low_stock_threshold")
      .eq("is_active", true);

    // Filter in code since we can't compare two columns in Supabase
    const lowStockProducts = allProducts?.filter(
      (p) => p.stock_quantity <= p.low_stock_threshold
    ) || [];

    if (stockError) throw stockError;

    // 5. Get top 3 products sold yesterday
    const { data: saleItems, error: itemsError } = await supabase
      .from("sale_items")
      .select(`
        product_name,
        quantity,
        sales!inner(created_at, status)
      `)
      .eq("sales.status", "completed")
      .gte("sales.created_at", yesterdayStart.toISOString())
      .lte("sales.created_at", yesterdayEnd.toISOString());

    if (itemsError) throw itemsError;

    // Aggregate top products
    const productSales = new Map<string, number>();
    saleItems?.forEach((item) => {
      productSales.set(
        item.product_name,
        (productSales.get(item.product_name) || 0) + item.quantity
      );
    });
    const topProducts = [...productSales.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Build report message
    const formatPKR = (amount: number) => `Rs. ${amount.toLocaleString("en-PK")}`;
    const dateStr = format(yesterday, "dd MMM yyyy");

    let report = `📊 *DAILY REPORT - ${dateStr}*\n\n`;

    // Sales Summary
    report += `💰 *YESTERDAY'S SALES*\n`;
    report += `• Total: ${formatPKR(totalSales)}\n`;
    report += `• Transactions: ${transactionCount}\n`;
    if (topProducts.length > 0) {
      report += `• Top Products:\n`;
      topProducts.forEach(([name, qty], i) => {
        report += `  ${i + 1}. ${name} (${qty} sold)\n`;
      });
    }
    report += `\n`;

    // Target Progress
    report += `🎯 *MONTHLY TARGET PROGRESS*\n`;
    report += `• Achieved: ${formatPKR(monthTotal)}\n`;
    report += `• Target: ${formatPKR(totalTarget)}\n`;
    report += `• Progress: ${targetProgress}% ${targetProgress >= 100 ? "✅" : targetProgress >= 75 ? "🟡" : "🔴"}\n`;
    report += `\n`;

    // Low Stock Alerts
    if (lowStockProducts && lowStockProducts.length > 0) {
      report += `⚠️ *LOW STOCK ALERTS*\n`;
      lowStockProducts.slice(0, 5).forEach((p) => {
        report += `• ${p.name}: ${p.stock_quantity} left\n`;
      });
      if (lowStockProducts.length > 5) {
        report += `  ...and ${lowStockProducts.length - 5} more items\n`;
      }
    } else {
      report += `✅ *INVENTORY*: All products sufficiently stocked\n`;
    }

    report += `\n_Report generated at ${format(now, "HH:mm")} PKT_`;

    console.log("Sending daily report to:", REPORT_WHATSAPP_NUMBER);
    console.log("Report content:", report);

    // Send via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    // Format numbers for WhatsApp
    const toNumber = REPORT_WHATSAPP_NUMBER.startsWith("whatsapp:") 
      ? REPORT_WHATSAPP_NUMBER 
      : `whatsapp:${REPORT_WHATSAPP_NUMBER}`;
    
    const fromNumber = TWILIO_WHATSAPP_NUMBER.startsWith("whatsapp:") 
      ? TWILIO_WHATSAPP_NUMBER 
      : `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;

    console.log("Formatted To number:", toNumber);
    console.log("Formatted From number:", fromNumber);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: toNumber,
        From: fromNumber,
        Body: report,
      }),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error response:", JSON.stringify(twilioData));
      throw new Error(`Twilio error: ${twilioData.message || twilioData.error_message || JSON.stringify(twilioData)}`);
    }

    console.log("Report sent successfully:", twilioData.sid);

    return new Response(
      JSON.stringify({ success: true, message: "Daily report sent", sid: twilioData.sid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Daily report error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
