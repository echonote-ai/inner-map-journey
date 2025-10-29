import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");

    // Decode JWT locally
    const decodeJwt = (t: string) => {
      const base64Url = t.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
      const jsonPayload = atob(padded);
      return JSON.parse(jsonPayload);
    };

    let userId: string | null = null;

    try {
      const payload = decodeJwt(token);
      userId = payload?.sub ?? null;
    } catch (_) {
      throw new Error("Could not decode user from token");
    }

    if (!userId) throw new Error("User not authenticated");
    logStep("User authenticated", { userId });

    // Query subscriptions table
    const { data: subscription, error } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      logStep("Error querying subscriptions", { error });
      throw error;
    }

    if (!subscription) {
      logStep("No subscription found, returning unsubscribed state");
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan_name: "Free Spirit"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Subscription found", { 
      tier: subscription.tier, 
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end
    });

    // Consider subscription cancelled if cancel_at_period_end is true
    const isActive = (subscription.status === "active" || subscription.status === "trialing") 
                     && !subscription.cancel_at_period_end;
    
    return new Response(JSON.stringify({
      subscribed: isActive,
      subscription_end: subscription.current_period_end,
      subscription_status: subscription.status,
      plan_name: subscription.tier,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
