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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

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
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ 
        error: "no_customer",
        message: "No billing account found. Please complete checkout first.",
        action: "redirect_checkout"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
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
      logStep("portal_session_success");

      return new Response(JSON.stringify({ url: portalSession.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (stripeError: any) {
      logStep("Stripe portal creation failed", { 
        code: stripeError.code, 
        message: stripeError.message,
        type: stripeError.type 
      });
      logStep("portal_session_failure", { error_code: stripeError.code });
      
      // Handle specific Stripe errors
      if (stripeError.code === 'account_invalid' || stripeError.message?.includes('configuration')) {
        return new Response(JSON.stringify({ 
          error: "portal_not_configured",
          message: "Billing portal is not set up. Please contact support.",
          action: "contact_support",
          stripeError: stripeError.message
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
    logStep("ERROR in customer-portal", { message: errorMessage, code: errorCode });
    logStep("portal_session_failure", { error_code: errorCode });
    
    return new Response(JSON.stringify({ 
      error: errorCode,
      message: errorMessage,
      action: "retry"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
