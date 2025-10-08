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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Look up customer by email (fallback strategy due to no local mapping)
    const customers = await stripe.customers.list({ email, limit: 1 });
    
    // If no Stripe customer, check free tier limit (3 journals max)
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, checking free tier limit");
      
      // Import Supabase
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
      
      // Count user's saved journals
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
      logStep("Free tier user", { journalCount, limit: 3 });
      
      // Free tier: allow up to 3 saved journals
      if (journalCount < 3) {
        return new Response(JSON.stringify({
          entitled: true,
          reason: "free_tier",
          plan_name: "Free Spirit",
          journals_remaining: 3 - journalCount,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
      }
      
      return new Response(JSON.stringify({
        entitled: false,
        reason: "free_tier_limit_reached",
        plan_name: "Free Spirit",
        journals_remaining: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10 });

    // Prefer: active -> trialing -> latest by created date
    const active = subs.data.find((s: Stripe.Subscription) => s.status === "active");
    const trialing = subs.data.find((s: Stripe.Subscription) => s.status === "trialing");

    const chosen = active ?? trialing ?? subs.data.sort((a: Stripe.Subscription, b: Stripe.Subscription) => (b.created ?? 0) - (a.created ?? 0))[0];

    if (!chosen) {
      logStep("No subscription found");
      return new Response(JSON.stringify({ entitled: false, reason: "no_subscription" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // Compute entitlement
    const now = Math.floor(Date.now() / 1000);
    const trialEnd = chosen.trial_end ?? null;
    const currentPeriodEnd = chosen.current_period_end ?? null;
    const cancelAt = chosen.cancel_at ?? null;
    const cancelAtPeriodEnd = (chosen as any).cancel_at_period_end === true;

    let entitled = false;
    let decisionReason = "denied";

    if (chosen.status === "active") {
      entitled = true;
      decisionReason = "granted_active";
    } else if (chosen.status === "trialing") {
      if (trialEnd && trialEnd > now && !cancelAt && !cancelAtPeriodEnd) {
        entitled = true;
        decisionReason = "granted_trialing";
      } else {
        entitled = false;
        decisionReason = trialEnd && trialEnd <= now ? "trial_expired" : "trial_not_valid";
      }
    }

    const priceId = chosen.items.data[0]?.price.id;
    const planName = priceId === "price_1SDds0Jaf5VF0aw32AdFJvNb" ? "Inner Explorer" : "Free Spirit";

    logStep("Entitlement decision", { entitled, status: chosen.status, decisionReason, trialEnd, currentPeriodEnd, cancelAt, cancelAtPeriodEnd });

    return new Response(JSON.stringify({
      entitled,
      status: chosen.status,
      decisionReason,
      trial_end: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
      current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
      plan_name: planName,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR in entitlement", { message });
    return new Response(JSON.stringify({ error: message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});