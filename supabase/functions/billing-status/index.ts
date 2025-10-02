import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BILLING-STATUS] ${step}${detailsStr}`);
};

const logMetric = (metric: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[METRIC] ${metric}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  
  try {
    logStep("Function started", { requestId });
    logMetric("billing_status_fetch", { requestId });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      logStep("Authentication error", { error: userError.message });
      throw new Error(`Authentication failed: ${userError.message}`);
    }
    
    const user = userData.user;
    if (!user?.email) {
      logStep("No user or email found");
      throw new Error("User not authenticated or email not available");
    }
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        status: "none",
        plan: null,
        invoices: [],
        requestId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get active or trialing subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });

    let subscriptionData = null;
    if (subscriptions.data.length > 0) {
      const sub = subscriptions.data[0];
      const priceId = sub.items.data[0]?.price?.id;
      const productId = sub.items.data[0]?.price?.product as string;
      
      // Safely handle timestamps that might be null/undefined
      let currentPeriodEnd = null;
      let trialEnd = null;
      
      try {
        if (sub.current_period_end) {
          currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
        }
        if (sub.trial_end) {
          trialEnd = new Date(sub.trial_end * 1000).toISOString();
        }
      } catch (error: any) {
        logStep("Error parsing dates", { error: error?.message || String(error) });
      }
      
      subscriptionData = {
        id: sub.id,
        status: sub.status,
        plan: productId,
        priceId,
        currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        trialEnd,
        amount: sub.items.data[0]?.price?.unit_amount || 0,
        currency: sub.items.data[0]?.price?.currency || "usd",
        interval: sub.items.data[0]?.price?.recurring?.interval || "month",
      };
      logStep("Subscription found", { subscriptionId: sub.id, status: sub.status });
    }

    // Get recent invoices
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 10,
    });

    const invoiceData = invoices.data.map((inv: any) => ({
      id: inv.id,
      date: new Date(inv.created * 1000).toISOString(),
      amount: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      hostedInvoiceUrl: inv.hosted_invoice_url,
      invoicePdf: inv.invoice_pdf,
      number: inv.number,
    }));

    logStep("Fetched invoices", { count: invoiceData.length });

    return new Response(JSON.stringify({
      subscribed: subscriptionData !== null && ['active', 'trialing'].includes(subscriptionData.status),
      subscription: subscriptionData,
      customerId,
      invoices: invoiceData,
      requestId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = error?.code || 'unknown';
    logStep("ERROR in billing-status", { message: errorMessage, code: errorCode, requestId });
    logMetric("billing_status_failure", { error_code: errorCode, requestId });
    
    return new Response(JSON.stringify({ 
      error: errorCode,
      message: "Unable to fetch billing status. Please try again.",
      requestId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
