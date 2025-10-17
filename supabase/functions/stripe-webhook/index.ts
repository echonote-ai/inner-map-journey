import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Tier mapping based on price_id
const getTierFromPriceId = (priceId: string): string => {
  if (priceId === "price_1SDds0Jaf5VF0aw32AdFJvNb") {
    return "Inner Explorer";
  }
  // Add other price IDs here as needed
  return "Free Spirit";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No stripe-signature header");

    const body = await req.text();
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook verified", { type: event.type });
    } catch (err) {
      logStep("Webhook verification failed", { error: err.message });
      return new Response(JSON.stringify({ error: "Webhook verification failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing subscription event", {
          subscriptionId: subscription.id,
          status: subscription.status,
        });

        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (!customer || customer.deleted) {
          throw new Error("Customer not found");
        }

        const email = (customer as Stripe.Customer).email;
        if (!email) throw new Error("Customer email not found");

        logStep("Found customer", { email });

        // Get user_id from email
        const { data: userData, error: userError } = await supabaseClient
          .from("profiles")
          .select("id, email")
          .eq("email", email)
          .single();

        if (userError || !userData) {
          logStep("User not found in profiles, trying auth.users");
          // Try to find in auth.users
          const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers();
          if (authError) throw new Error("Could not find user");
          
          const user = authUsers.users.find(u => u.email === email);
          if (!user) throw new Error("User not found");

          logStep("Found user in auth", { userId: user.id });

          // Determine tier from price_id
          const priceId = subscription.items.data[0]?.price.id;
          const productId = subscription.items.data[0]?.price.product as string;
          const tier = getTierFromPriceId(priceId);

          // Upsert subscription data
          const { error: upsertError } = await supabaseClient
            .from("subscriptions")
            .upsert({
              user_id: user.id,
              tier: tier,
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              price_id: priceId,
              product_id: productId,
              subscription_id: subscription.id,
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: "user_id"
            });

          if (upsertError) {
            logStep("Error upserting subscription", { error: upsertError });
            throw upsertError;
          }

          logStep("Subscription updated successfully", { userId: user.id, tier, status: subscription.status });
          break;
        }

        // Determine tier from price_id
        const priceId = subscription.items.data[0]?.price.id;
        const productId = subscription.items.data[0]?.price.product as string;
        const tier = getTierFromPriceId(priceId);

        // Upsert subscription data
        const { error: upsertError } = await supabaseClient
          .from("subscriptions")
          .upsert({
            user_id: userData.id,
            tier: tier,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            price_id: priceId,
            product_id: productId,
            subscription_id: subscription.id,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id"
          });

        if (upsertError) {
          logStep("Error upserting subscription", { error: upsertError });
          throw upsertError;
        }

        logStep("Subscription updated successfully", { userId: userData.id, tier, status: subscription.status });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
