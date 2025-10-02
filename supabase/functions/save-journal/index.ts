import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SAVE-JOURNAL] ${step}${detailsStr}`);
};

interface SavePayload { summary: string; reflection_type: string; }

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
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
    } catch (_) {}

    if (!email || !sub || !iss) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 });
    }

    const userId = sub as string;
    const auth_provider_id = `${iss}|${sub}`;
    logStep("User authenticated", { email, auth_provider_id });

    // Reconcile with Stripe (central entitlement check inline)
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: email!, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      console.log("[METRIC] journal_save_redirect_to_subscription");
      return new Response(JSON.stringify({ error: "not_entitled", reason: "no_customer" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 });
    }

    const customerId = customers.data[0].id;
    const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10 });
    const active = subs.data.find((s: Stripe.Subscription) => s.status === "active");
    const trialing = subs.data.find((s: Stripe.Subscription) => s.status === "trialing");
    const chosen = active ?? trialing ?? subs.data.sort((a: Stripe.Subscription, b: Stripe.Subscription) => (b.created ?? 0) - (a.created ?? 0))[0];

    if (!chosen) {
      console.log("[METRIC] journal_save_redirect_to_subscription");
      return new Response(JSON.stringify({ error: "not_entitled", reason: "no_subscription" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 });
    }

    const now = Math.floor(Date.now() / 1000);
    const trialEnd = chosen.trial_end ?? null;
    const cancelAt = chosen.cancel_at ?? null;
    const cancelAtPeriodEnd = (chosen as any).cancel_at_period_end === true;

    let entitled = false;
    if (chosen.status === "active") entitled = true;
    if (chosen.status === "trialing") {
      if (trialEnd && trialEnd > now && !cancelAt && !cancelAtPeriodEnd) entitled = true;
    }

    if (!entitled) {
      console.log("[METRIC] journal_save_redirect_to_subscription");
      return new Response(JSON.stringify({ error: "not_entitled", reason: "subscription_status" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 });
    }

    // Parse body
    const payload = (await req.json()) as SavePayload;
    const summary = (payload?.summary ?? "").toString();
    const reflection_type = (payload?.reflection_type ?? "").toString();

    if (!summary || !reflection_type) {
      return new Response(JSON.stringify({ error: "invalid_payload" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    // Save reflection
    const { error } = await supabase.from("reflections").insert({
      user_id: userId,
      summary,
      reflection_type,
      saved: true,
      completed_at: new Date().toISOString(),
    });

    if (error) {
      logStep("DB insert error", { message: error.message });
      return new Response(JSON.stringify({ error: "db_error" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
    }

    logStep("Journal saved", { userId, reflection_type });
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR in save-journal", { message });
    return new Response(JSON.stringify({ error: message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});