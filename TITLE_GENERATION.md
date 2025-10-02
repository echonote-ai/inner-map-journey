# Journal Title Generation - Implementation Guide

## Overview
This document describes the AI-powered journal title generation system, including real-time generation on save and batch backfill capabilities.

## Features

### 1. Real-Time Title Generation (On Save)
When a user saves a journal:
- The `save-journal` edge function automatically generates a concise title (≤60 chars) using Lovable AI (Gemini 2.5 Flash)
- PII (emails, phone numbers, SSNs) is redacted before sending to the model
- If generation fails, falls back to default category titles
- Stores both the generated title and metadata (`title_source`, `title_model`, `title_generated_at`)

**Database Fields:**
- `title`: The displayed title (AI-generated or default)
- `generated_title`: Original AI-generated title (preserved for audit)
- `title_source`: 'ai', 'manual', or 'default'
- `title_generated_at`: Timestamp of AI generation
- `title_model`: Model used for generation
- `title_manual_override`: True if user edited the title

### 2. Batch Backfill Job
A dedicated edge function (`generate-journal-titles`) to generate titles for existing journals.

**Features:**
- Processes journals with generic/missing titles in batches
- Dry-run mode for testing
- Configurable batch size and maximum batches
- Rate limiting (100ms between titles, 1s between batches)
- Skips journals with manual overrides

**Usage:**
```bash
# Dry run (test mode)
curl -X POST https://lzvycoujohuznnqplekx.supabase.co/functions/v1/generate-journal-titles \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "batchSize": 50, "maxBatches": 20}'

# Live run
curl -X POST https://lzvycoujohuznnqplekx.supabase.co/functions/v1/generate-journal-titles \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false, "batchSize": 50, "maxBatches": 10}'
```

**Response Format:**
```json
{
  "processed": 500,
  "successful": 487,
  "failed": 3,
  "skipped": 10,
  "dryRun": false,
  "batches": 10,
  "errors": [
    {"id": "uuid-1", "error": "Failed to generate title"},
    {"id": "uuid-2", "error": "API timeout"}
  ]
}
```

### 3. UI Features

#### Dashboard (JournalsList.tsx)
- Displays AI-generated titles with an "AI" badge
- Shows title instead of generic reflection type
- Maintains reflection type and date metadata

#### Summary Page
- **View Mode:** Shows generated title with AI badge (if applicable)
- **Edit Mode:** Click title to edit inline, sets `title_manual_override=true`
- **Regenerate:** Button to generate a new AI title (preserves original in audit log)
- **Fallback:** Shows "Your Journal Entry" if no title exists

## LLM Prompt

The system prompt used for title generation:

```
You are a journal title generator. Create concise, descriptive titles (max 60 characters) that capture the essence of journal entries. Generate titles in the same language as the input. Be specific and emotional when appropriate. Return ONLY the title text, nothing else.
```

**User prompt template:**
```
Generate a short, descriptive title (max 60 characters) for this journal entry:

[REDACTED SUMMARY TRUNCATED TO 2000 CHARS]
```

**Model Settings:**
- Model: `google/gemini-2.5-flash`
- Temperature: 0.2 (deterministic)
- Max tokens: 30

## Privacy & Security

### PII Redaction
Before sending to the AI model, the system redacts:
- Email addresses
- Phone numbers (US format)
- SSN patterns

**Redaction Pattern:**
```javascript
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // phone numbers
  /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, // SSN
];
```

### Data Retention
- Generated titles are stored indefinitely in the `reflections` table
- Original generated titles preserved in `generated_title` column even after user edits
- Audit trail includes: generation timestamp, model version, source type

## Logging & Metrics

The system logs the following metrics:

**Save-Journal Function:**
- `title_generation_attempt`: Title generation started
- `title_generation_success`: Title generated successfully
- `title_generation_failure`: Generation failed (with error details)

**Backfill Function:**
- Batch processing progress
- Individual success/failure per journal
- Final summary with counts

**Log Format:**
```javascript
logStep('title_generation_success', { 
  titleLength: 45,
  duration: 1234 // ms
});
```

## Testing Scenarios

### Unit Tests
- ✅ PII redaction removes emails, phone numbers, SSNs
- ✅ Title truncation at 60 characters
- ✅ Fallback to default titles on AI failure
- ✅ Language detection and matching

### Integration Tests
1. **New Journal Save:**
   - Save journal → Verify title in DB → Check title_source='ai'
   - Save with AI failure → Verify default title → Check title_source='default'

2. **Title Editing:**
   - Click edit → Change title → Save → Verify title_manual_override=true
   - Verify original generated_title preserved

3. **Regeneration:**
   - Click regenerate → New title generated → Old title in audit log

4. **Backfill:**
   - Create 100 journals with no titles
   - Run backfill in dry-run → Verify no DB changes
   - Run backfill live → Verify titles generated
   - Check skipped journals with manual overrides

### Edge Cases
- Empty summary: Skip or use default
- Very long summary: Truncate to 2000 chars
- Non-English journal: Generate title in same language
- API rate limit: Retry with backoff
- Concurrent edits: Last write wins

## Performance

### Real-Time Generation
- **Latency:** ~1-2 seconds (AI generation time)
- **Impact:** Adds to journal save time, user sees "Saving..." indicator
- **Fallback:** If >3s, falls back to default title and logs error

### Backfill Job
- **Rate:** ~10 titles/second (with 100ms delay)
- **Batch Size:** 50 (configurable, max 100)
- **Estimated Time:** 1000 journals = ~2 minutes

## Rollback Plan

If issues arise:

1. **Disable Real-Time Generation:**
   ```typescript
   // In save-journal/index.ts, comment out title generation
   // const titleResult = await generateTitle(summary, lovableApiKey);
   const titleResult = null; // Force default titles
   ```

2. **Stop Backfill:**
   - Set `verify_jwt = false` in config.toml for `generate-journal-titles`
   - Or disable function entirely by removing from config

3. **Revert to Generic Titles:**
   ```sql
   UPDATE reflections 
   SET title = CASE 
     WHEN reflection_type = 'daily' THEN 'Daily Reflection'
     WHEN reflection_type = 'event' THEN 'Event Reflection'
     ELSE 'Journal Entry'
   END,
   title_source = 'default'
   WHERE title_manual_override = false;
   ```

4. **Database Migration Rollback:**
   ```sql
   -- If needed, remove new columns (not recommended if data exists)
   ALTER TABLE reflections 
   DROP COLUMN title,
   DROP COLUMN generated_title,
   DROP COLUMN title_source,
   DROP COLUMN title_generated_at,
   DROP COLUMN title_model,
   DROP COLUMN title_manual_override;
   ```

## Environment Variables

Required in Edge Functions:
- `LOVABLE_API_KEY`: Pre-configured in Supabase secrets
- `SUPABASE_URL`: Auto-provided
- `SUPABASE_SERVICE_ROLE_KEY`: Auto-provided

## Monitoring

### Success Metrics
- Title generation success rate (target: >95%)
- Average generation latency (target: <2s)
- User edit rate (indicates title quality)

### Failure Alerts
- Generation failure rate >10%
- API timeout rate >5%
- PII detection rate >1% (indicates prompt issues)

## Future Enhancements

1. **Multi-Language Support:** Detect and generate in journal language
2. **Title Suggestions:** Offer 3 title options to user
3. **Learning from Edits:** Use user edits to improve prompts
4. **Batch API:** Use OpenAI batch API for cheaper backfills
5. **Caching:** Cache similar journal summaries to reduce API calls

## Support Runbook

### User Reports "Bad Title"
1. Check `title_source` in DB - is it 'ai' or 'default'?
2. If 'ai', review original `generated_title` and summary
3. User can edit title (sets manual override)
4. Log issue for prompt improvement

### Backfill Stalls
1. Check edge function logs for errors
2. Verify LOVABLE_API_KEY is set
3. Check rate limit errors (429)
4. Resume with smaller batch size

### Titles Not Generating
1. Verify LOVABLE_API_KEY in Supabase secrets
2. Check edge function logs for API errors
3. Test with a simple journal in staging
4. Fallback: Users can manually edit titles
