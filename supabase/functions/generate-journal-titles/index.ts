import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackfillRequest {
  dryRun?: boolean;
  batchSize?: number;
  maxBatches?: number;
}

interface BackfillResult {
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  dryRun: boolean;
  batches: number;
  errors: Array<{ id: string; error: string }>;
}

// PII redaction patterns
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
];

function redactPII(text: string): string {
  let redacted = text;
  PII_PATTERNS.forEach(pattern => {
    redacted = redacted.replace(pattern, '[REDACTED]');
  });
  return redacted;
}

async function generateTitle(
  summary: string, 
  lovableApiKey: string
): Promise<string | null> {
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

    if (!response.ok) return null;

    const data = await response.json();
    const generatedTitle = data.choices?.[0]?.message?.content?.trim();

    if (!generatedTitle) return null;

    return generatedTitle.replace(/^["']|["']$/g, '').slice(0, 60);
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !LOVABLE_API_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: BackfillRequest = await req.json().catch(() => ({}));
    const dryRun = body.dryRun ?? false;
    const batchSize = Math.min(body.batchSize ?? 50, 100);
    const maxBatches = body.maxBatches ?? 20;

    console.log(`[BACKFILL] Starting ${dryRun ? 'DRY RUN' : 'LIVE RUN'} - batch size: ${batchSize}, max batches: ${maxBatches}`);

    const result: BackfillResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      dryRun,
      batches: 0,
      errors: [],
    };

    for (let batch = 0; batch < maxBatches; batch++) {
      // Find journals needing titles
      const { data: reflections, error: fetchError } = await supabase
        .from('reflections')
        .select('id, summary, reflection_type, title, title_source, title_manual_override')
        .or(`title_source.is.null,title_source.eq.default,title.is.null`)
        .or('title_manual_override.is.null,title_manual_override.eq.false')
        .limit(batchSize);

      if (fetchError) {
        console.error('[BACKFILL] Fetch error:', fetchError);
        break;
      }

      if (!reflections || reflections.length === 0) {
        console.log('[BACKFILL] No more journals to process');
        break;
      }

      result.batches++;
      console.log(`[BACKFILL] Processing batch ${batch + 1} - ${reflections.length} journals`);

      for (const reflection of reflections) {
        result.processed++;

        if (!reflection.summary) {
          result.skipped++;
          continue;
        }

        if (dryRun) {
          console.log(`[DRY RUN] Would generate title for: ${reflection.id}`);
          result.successful++;
          continue;
        }

        const generatedTitle = await generateTitle(reflection.summary, LOVABLE_API_KEY);

        if (!generatedTitle) {
          result.failed++;
          result.errors.push({
            id: reflection.id,
            error: 'Failed to generate title',
          });
          continue;
        }

        const { error: updateError } = await supabase
          .from('reflections')
          .update({
            title: generatedTitle,
            generated_title: generatedTitle,
            title_source: 'ai',
            title_generated_at: new Date().toISOString(),
            title_model: 'google/gemini-2.5-flash',
          })
          .eq('id', reflection.id);

        if (updateError) {
          result.failed++;
          result.errors.push({
            id: reflection.id,
            error: updateError.message,
          });
        } else {
          result.successful++;
        }

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Batch delay
      if (batch < maxBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('[BACKFILL] Complete:', result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[BACKFILL] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        processed: 0,
        successful: 0,
        failed: 0,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
