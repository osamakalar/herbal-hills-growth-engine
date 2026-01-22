import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// System prompt for the AI sales/support assistant
const SYSTEM_PROMPT = `You are a helpful customer service and sales representative for Herbal Hills, a company selling natural herbal health products.

Your responsibilities:
1. CUSTOMER CARE: Answer questions about products, orders, shipping, and returns
2. SALES: Recommend products based on customer needs, highlight benefits, encourage purchases
3. PRODUCT KNOWLEDGE: You sell herbal supplements like Ashwagandha, Triphala, Brahmi, Neem, Turmeric, Tulsi Tea, etc.

Guidelines:
- Be warm, professional, and helpful
- Keep responses concise (WhatsApp messages should be brief)
- Use emojis sparingly for a friendly tone 🌿
- If asked about pricing, mention they can visit our store or website
- For order issues, collect details and assure follow-up
- Always be honest - if you don't know something, say so
- Respond in the same language the customer uses (Urdu, English, etc.)

Product Categories: Supplements, Powders, Teas, Oils, Drops
Popular Products: Ashwagandha (stress relief), Triphala (digestion), Brahmi (memory), Turmeric (inflammation)`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      throw new Error("Twilio credentials not configured");
    }

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Parse incoming WhatsApp message from Twilio webhook
    const formData = await req.formData();
    const incomingMessage = formData.get("Body") as string;
    const fromNumber = formData.get("From") as string;
    const toNumber = formData.get("To") as string;

    console.log(`Received message from ${fromNumber}: ${incomingMessage}`);

    if (!incomingMessage || !fromNumber) {
      return new Response("Missing message or sender", { status: 400 });
    }

    // Initialize Supabase client for conversation history
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get or create conversation history
    const { data: existingMessages } = await supabase
      .from("whatsapp_conversations")
      .select("role, content")
      .eq("phone_number", fromNumber)
      .order("created_at", { ascending: true })
      .limit(20); // Keep last 20 messages for context

    const conversationHistory = existingMessages || [];

    // Build messages array for AI
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: incomingMessage },
    ];

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (aiResponse.status === 402) {
        throw new Error("AI credits exhausted.");
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content || 
      "I apologize, I couldn't process your request. Please try again.";

    console.log(`AI Response: ${assistantMessage}`);

    // Store conversation in database
    await supabase.from("whatsapp_conversations").insert([
      { phone_number: fromNumber, role: "user", content: incomingMessage },
      { phone_number: fromNumber, role: "assistant", content: assistantMessage },
    ]);

    // Send reply via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: fromNumber,
        From: TWILIO_WHATSAPP_NUMBER,
        Body: assistantMessage,
      }),
    });

    if (!twilioResponse.ok) {
      const twilioError = await twilioResponse.text();
      console.error("Twilio error:", twilioError);
      throw new Error(`Failed to send WhatsApp message: ${twilioResponse.status}`);
    }

    // Return TwiML response (Twilio expects this)
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/xml" 
        },
      }
    );

  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    
    // Return empty TwiML to acknowledge receipt
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/xml" 
        },
      }
    );
  }
});
