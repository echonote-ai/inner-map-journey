import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-SUBSCRIPTIONS] ${step}${detailsStr}`);
};

const getTierFromPriceId = (priceId: string): string => {
  if (priceId === "price_1SDds0Jaf5VF0aw32AdFJvNb") {
    return "Inner Explorer";
  }
  return "Free Spirit";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Sync job started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Fetch all active and trialing subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      status: "all",
      limit: 100,
    });

    logStep("Fetched subscriptions from Stripe", { count: subscriptions.data.length });

    let syncedCount = 0;
    let errorCount = 0;

    for (const subscription of subscriptions.data) {
      try {
        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (!customer || customer.deleted) {
          logStep("Customer not found or deleted", { customerId: subscription.customer });
          errorCount++;
          continue;
        }

        const email = (customer as Stripe.Customer).email;
        if (!email) {
          logStep("Customer email not found", { customerId: subscription.customer });
          errorCount++;
          continue;
        }

        // Find user by email
        const { data: userData, error: userError } = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("email", email)
          .single();

        if (userError || !userData) {
          // Try auth.users
          const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers();
          if (authError) {
            logStep("Could not list users", { error: authError });
            errorCount++;
            continue;
          }
          
          const user = authUsers.users.find(u => u.email === email);
          if (!user) {
            logStep("User not found", { email });
            errorCount++;
            continue;
          }

          // Determine tier and upsert
          const priceId = subscription.items.data[0]?.price.id;
          const productId = subscription.items.data[0]?.price.product as string;
          const tier = getTierFromPriceId(priceId);

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
            logStep("Error upserting subscription", { error: upsertError, userId: user.id });
            errorCount++;
          } else {
            syncedCount++;
          }
          continue;
        }

        // User found in profiles
        const priceId = subscription.items.data[0]?.price.id;
        const productId = subscription.items.data[0]?.price.product as string;
        const tier = getTierFromPriceId(priceId);

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
          logStep("Error upserting subscription", { error: upsertError, userId: userData.id });
          errorCount++;
        } else {
          syncedCount++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logStep("Error processing subscription", { subscriptionId: subscription.id, error: errorMessage });
        errorCount++;
      }
    }

    logStep("Sync completed", { synced: syncedCount, errors: errorCount });

    return new Response(JSON.stringify({ 
      success: true, 
      synced: syncedCount, 
      errors: errorCount 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in sync job", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
