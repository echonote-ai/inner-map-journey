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

// PII redaction patterns
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // phone numbers
  /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, // SSN
];

function redactPII(text: string): string {
  let redacted = text;
  PII_PATTERNS.forEach(pattern => {
    redacted = redacted.replace(pattern, '[REDACTED]');
  });
  return redacted;
}

async function generateTitle(summary: string, lovableApiKey: string): Promise<{
  title: string;
  model: string;
} | null> {
  const startTime = Date.now();
  logStep('title_generation_attempt', { summaryLength: summary.length });

  try {
    const redactedSummary = redactPII(summary);
    const truncatedSummary = redactedSummary.slice(0, 2000);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a journal title generator. Create concise, descriptive titles (max 60 characters) that capture the essence of journal entries. Generate titles in the same language as the input. Be specific and emotional when appropriate. Return ONLY the title text, nothing else.'
          },
          {
            role: 'user',
            content: `Generate a short, descriptive title (max 60 characters) for this journal entry:\n\n${truncatedSummary}`
          }
        ],
        temperature: 0.2,
        max_tokens: 30,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logStep('title_generation_failure', { 
        status: response.status,
        error,
        duration: Date.now() - startTime 
      });
      return null;
    }

    const data = await response.json();
    const generatedTitle = data.choices?.[0]?.message?.content?.trim();

    if (!generatedTitle) {
      logStep('title_generation_failure', { 
        reason: 'empty_response',
        duration: Date.now() - startTime 
      });
      return null;
    }

    // Truncate if needed and clean up
    const cleanTitle = generatedTitle
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .slice(0, 60);

    logStep('title_generation_success', { 
      titleLength: cleanTitle.length,
      duration: Date.now() - startTime 
    });

    return {
      title: cleanTitle,
      model: 'google/gemini-2.5-flash'
    };
  } catch (error) {
    logStep('title_generation_failure', { 
      error: error instanceof Error ? error.message : 'unknown',
      duration: Date.now() - startTime 
    });
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!stripeKey || !lovableApiKey) throw new Error("Missing required environment variables");

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

    // Stripe entitlement or free-tier fallback (3 saved journals max)
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: email!, limit: 1 });

    let entitled = false;

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10 });
      const active = subs.data.find((s: Stripe.Subscription) => s.status === "active");
      const trialing = subs.data.find((s: Stripe.Subscription) => s.status === "trialing");
      const chosen = active ?? trialing ?? subs.data.sort((a: Stripe.Subscription, b: Stripe.Subscription) => (b.created ?? 0) - (a.created ?? 0))[0];

      if (chosen) {
        const now = Math.floor(Date.now() / 1000);
        const trialEnd = chosen.trial_end ?? null;
        
        // Only allow journal creation for active subscriptions or valid trials
        if (chosen.status === "active") {
          entitled = true;
        } else if (chosen.status === "trialing") {
          // Allow trialing subscriptions only if trial hasn't expired
          if (trialEnd && trialEnd > now) {
            entitled = true;
          }
        }
        // Explicitly deny canceled, past_due, unpaid, etc.
        // These users can view existing journals but not create new ones
      }
    }

    if (!entitled) {
      // Free tier path: allow up to 3 saved journals per user
      const { count, error: countError } = await supabase
        .from('reflections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('saved', true);

      if (countError) {
        logStep("Count error", { message: countError.message });
        return new Response(JSON.stringify({ error: "count_error" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
      }

      const journalCount = count || 0;
      if (journalCount >= 3) {
        logStep("Free tier limit reached", { journalCount });
        return new Response(JSON.stringify({ error: "not_entitled", reason: "free_tier_limit_reached" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 });
      }

      logStep("Proceeding under free tier", { remaining: 3 - journalCount });
    }

    // Parse body
    const payload = (await req.json()) as SavePayload;
    const summary = (payload?.summary ?? "").toString();
    const reflection_type = (payload?.reflection_type ?? "").toString();

    if (!summary || !reflection_type) {
      return new Response(JSON.stringify({ error: "invalid_payload" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    // Generate AI title
    logStep('generating_title', { summaryLength: summary.length });
    const titleResult = await generateTitle(summary, lovableApiKey);
    
    const defaultTitle = reflection_type === 'daily' ? 'Daily Reflection' : 
                        reflection_type === 'event' ? 'Event Reflection' : 
                        'Journal Entry';
    
    const finalTitle = titleResult?.title || defaultTitle;
    const titleSource = titleResult ? 'ai' : 'default';

    // Save reflection
    const { data: reflection, error } = await supabase.from("reflections").insert({
      user_id: userId,
      summary,
      reflection_type,
      saved: true,
      completed_at: new Date().toISOString(),
      title: finalTitle,
      generated_title: titleResult?.title,
      title_source: titleSource,
      title_generated_at: titleResult ? new Date().toISOString() : null,
      title_model: titleResult?.model,
      title_manual_override: false,
    }).select().single();

    if (error) {
      logStep("DB insert error", { message: error.message });
      return new Response(JSON.stringify({ error: "db_error" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
    }

    logStep("Journal saved", { userId, reflection_type, titleSource, titleGenerated: !!titleResult });
    return new Response(JSON.stringify({ success: true, reflection, titleGenerated: !!titleResult }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR in save-journal", { message });
    return new Response(JSON.stringify({ error: message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});