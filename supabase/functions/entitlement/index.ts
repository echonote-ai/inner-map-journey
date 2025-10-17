import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ENTITLEMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    // Decode JWT locally
    const decodeJwt = (t: string) => {
      const base64Url = t.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");
      const jsonPayload = atob(padded);
      return JSON.parse(jsonPayload);
    };

    let email: string | null = null;
    let sub: string | null = null;
    let iss: string | null = null;

    try {
      const payload = decodeJwt(token);
      email = (payload?.email as string | undefined)?.toLowerCase() ?? null;
      sub = payload?.sub ?? null;
      iss = payload?.iss ?? null;
    } catch (_) {
      // Ignore, handled below
    }

    if (!email || !sub || !iss) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const auth_provider_id = `${iss}|${sub}`;
    logStep("User authenticated", { email, auth_provider_id });

    // Import Supabase for journal count check and subscription lookup
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.57.2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Supabase configuration missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Count user's saved journals (for free tier check and view access)
    const { count, error: countError } = await supabase
      .from('reflections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', sub)
      .eq('saved', true);
    
    if (countError) {
      logStep("Error counting journals", { error: countError });
      return new Response(JSON.stringify({ error: "Failed to check journal count" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    
    const journalCount = count || 0;

    // Check subscription from database
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', sub)
      .single();

    if (subError && subError.code !== "PGRST116") {
      logStep("Error fetching subscription", { error: subError });
      return new Response(JSON.stringify({ error: "Failed to check subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // If no subscription in database, check free tier limit (3 journals max)
    if (!subscription) {
      logStep("No subscription found, checking free tier limit", { journalCount, limit: 3 });
      
      const canCreate = journalCount < 3;
      
      return new Response(JSON.stringify({
        entitled: canCreate,
        can_create_journals: canCreate,
        can_view_journals: true,
        reason: canCreate ? "free_tier" : "free_tier_limit_reached",
        plan_name: "Free Spirit",
        journals_remaining: Math.max(0, 3 - journalCount),
        total_journals: journalCount,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    logStep("Subscription found", { tier: subscription.tier, status: subscription.status });

    // Determine if user can create new journals based on subscription status
    let canCreate = false;
    let decisionReason = "denied";

    if (subscription.status === "active") {
      canCreate = true;
      decisionReason = "granted_active";
    } else if (subscription.status === "trialing") {
      const now = new Date();
      const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
      
      if (periodEnd && periodEnd > now) {
        canCreate = true;
        decisionReason = subscription.cancel_at_period_end ? "granted_trialing_will_cancel" : "granted_trialing";
      } else {
        canCreate = false;
        decisionReason = "trial_expired";
      }
    } else if (["canceled", "past_due", "unpaid", "incomplete_expired", "incomplete"].includes(subscription.status)) {
      canCreate = false;
      decisionReason = `subscription_${subscription.status}`;
    }

    logStep("Entitlement decision", { 
      canCreate, 
      status: subscription.status, 
      decisionReason,
      journalCount 
    });

    return new Response(JSON.stringify({
      entitled: canCreate,
      can_create_journals: canCreate,
      can_view_journals: true,
      status: subscription.status,
      decisionReason,
      trial_end: subscription.current_period_end,
      current_period_end: subscription.current_period_end,
      plan_name: subscription.tier,
      total_journals: journalCount,
      cancel_at_period_end: subscription.cancel_at_period_end,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR in entitlement", { message });
    return new Response(JSON.stringify({ error: message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});