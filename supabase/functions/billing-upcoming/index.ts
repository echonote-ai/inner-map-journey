import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BILLING-UPCOMING] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Authentication failed: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ 
        error: "no_customer",
        message: "No Stripe customer found",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    try {
      const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        customer: customerId,
      });

      const invoiceData = {
        amount: upcomingInvoice.amount_due,
        currency: upcomingInvoice.currency,
        periodStart: upcomingInvoice.period_start ? new Date(upcomingInvoice.period_start * 1000).toISOString() : null,
        periodEnd: upcomingInvoice.period_end ? new Date(upcomingInvoice.period_end * 1000).toISOString() : null,
        lines: upcomingInvoice.lines.data.map((line: any) => ({
          description: line.description,
          amount: line.amount,
          currency: line.currency,
          quantity: line.quantity,
        })),
      };

      logStep("Retrieved upcoming invoice", { amount: invoiceData.amount });

      return new Response(JSON.stringify(invoiceData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (error: any) {
      if (error.code === 'invoice_upcoming_none') {
        logStep("No upcoming invoice");
        return new Response(JSON.stringify({ 
          error: "no_upcoming_invoice",
          message: "No upcoming invoice available",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }
      throw error;
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in billing-upcoming", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: "billing_upcoming_failed",
      message: "Unable to fetch upcoming invoice. Please try again.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
