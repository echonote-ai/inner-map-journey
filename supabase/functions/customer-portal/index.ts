import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
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
    logMetric("portal_session_attempt", { requestId });

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
    logStep("Authorization header found");

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
    let customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    // If no customer found, attempt reconciliation
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, attempting reconciliation");
      logMetric("customer_reconciliation_attempt", { email: user.email });
      
      try {
        // Create a new customer
        const newCustomer = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: user.id,
          },
        });
        
        logStep("Created new Stripe customer", { customerId: newCustomer.id });
        logMetric("customer_reconciliation_success", { customerId: newCustomer.id });
        customers = { data: [newCustomer] } as any;
      } catch (reconcileError: any) {
        logStep("Customer reconciliation failed", { error: reconcileError.message });
        logMetric("customer_reconciliation_failure", { error: reconcileError.code });
        
        return new Response(JSON.stringify({ 
          error: "customer_reconciliation_failed",
          message: "We're linking your billing account — try again in a few seconds.",
          action: "retry",
          requestId,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 503,
        });
      }
    }
    
    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const origin = req.headers.get("origin") || "https://b1e46dd2-f4df-448b-9f22-a6be4b2c7447.lovableproject.com";
    
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/dashboard`,
      });
      logStep("Customer portal session created", { sessionId: portalSession.id });
      logMetric("portal_session_success", { customerId, requestId });

      return new Response(JSON.stringify({ 
        url: portalSession.url,
        requestId 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (stripeError: any) {
      logStep("Stripe portal creation failed", { 
        code: stripeError.code, 
        message: stripeError.message,
        type: stripeError.type 
      });
      logMetric("portal_session_failure", { 
        error_code: stripeError.code,
        error_type: stripeError.type,
        requestId 
      });
      
      // Handle specific Stripe errors with user-friendly messages
      if (stripeError.code === 'account_invalid' || stripeError.message?.includes('configuration')) {
        return new Response(JSON.stringify({ 
          error: "portal_not_configured",
          message: "The billing portal is being set up. Please contact support for assistance.",
          action: "contact_support",
          requestId,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 503,
        });
      }
      
      throw stripeError;
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = error?.code || 'unknown';
    logStep("ERROR in customer-portal", { message: errorMessage, code: errorCode, requestId });
    logMetric("portal_session_failure", { error_code: errorCode, requestId });
    
    return new Response(JSON.stringify({ 
      error: errorCode,
      message: "We couldn't open your billing portal right now. Please try again or contact support.",
      action: "retry",
      requestId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
