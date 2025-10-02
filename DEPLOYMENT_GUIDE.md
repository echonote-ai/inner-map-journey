# Dashboard Deployment Guide

## Overview
This dashboard provides a comprehensive user account management system with subscription handling, user profiles, and journal management.

## Features Implemented

### 1. User Info Card
- Displays user email and avatar
- Shows member since date
- Auto-generated initials avatar

### 2. Subscription Management Card
- Shows current plan (Free Spirit / Inner Explorer)
- Displays subscription status (Free/Trial/Active)
- Shows trial/renewal dates
- One-click access to Stripe Customer Portal for subscription management
- Upgrade button for free users

### 3. Journals List
- Displays all saved journal reflections
- Create new journals
- Delete existing journals with confirmation dialog
- Click to view full journal entry
- Responsive grid layout

## Backend Infrastructure

### Edge Functions Created

#### 1. `check-subscription`
**Purpose:** Validates user subscription status by checking Stripe
**Authentication:** Requires JWT (verify_jwt = true)
**Returns:**
```json
{
  "subscribed": boolean,
  "subscription_end": "ISO 8601 date",
  "subscription_status": "active" | "trialing",
  "plan_name": "Free Spirit" | "Inner Explorer"
}
```

**Features:**
- JWT decoding for reliable user identification
- Checks both "active" and "trialing" subscriptions
- Returns detailed subscription information
- Comprehensive error logging

#### 2. `customer-portal`
**Purpose:** Creates Stripe Customer Portal session for subscription management
**Authentication:** Requires JWT (verify_jwt = true)
**Returns:**
```json
{
  "url": "stripe customer portal URL"
}
```

**Features:**
- Opens in new tab
- Returns user to dashboard after management
- Allows users to cancel, change payment method, view invoices

#### 3. `create-checkout`
**Purpose:** Creates Stripe checkout session with 7-day free trial
**Authentication:** Requires JWT (verify_jwt = true)
**Existing function - unchanged**

## Environment Variables

All environment variables are automatically configured via Lovable Cloud:

- `SUPABASE_URL` - Auto-configured
- `SUPABASE_ANON_KEY` - Auto-configured
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-configured
- `STRIPE_SECRET_KEY` - Configured via Lovable Cloud secrets
- `STRIPE_WEBHOOK_SECRET` - Configured via Lovable Cloud secrets (for future webhook implementation)

## Database Schema

### Tables Used

#### `profiles`
- `id` (uuid) - Primary key, references auth.users
- `email` (text)
- `username` (text)
- `created_at` (timestamp)

#### `reflections`
- `id` (uuid) - Primary key
- `user_id` (uuid) - References auth.users
- `reflection_type` (text)
- `summary` (text)
- `saved` (boolean)
- `created_at` (timestamp)
- `completed_at` (timestamp)

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Policies enforce user_id matching

## Deployment Checklist

### Prerequisites
✅ Lovable Cloud enabled
✅ Stripe integration connected
✅ STRIPE_SECRET_KEY secret configured
✅ User authentication implemented

### Testing in Stripe Test Mode

1. **Create Test User**
   - Sign up with test email
   - Verify authentication works

2. **Test Free Trial Subscription**
   - Click "Start 7-Day Free Trial" on subscription page
   - Use test card: 4242 4242 4242 4242
   - Verify checkout completes
   - Confirm dashboard shows "Trial" badge
   - Check subscription end date displays correctly

3. **Test Customer Portal**
   - Click "Manage Subscription" button
   - Verify portal opens in new tab
   - Test canceling subscription
   - Verify subscription status updates after returning

4. **Test Journal CRUD**
   - Create a new reflection
   - Save the journal
   - View in dashboard
   - Delete a journal entry
   - Confirm delete dialog works

### Production Deployment

1. **Switch Stripe to Live Mode**
   - Update STRIPE_SECRET_KEY in Lovable Cloud secrets
   - Ensure webhook endpoints are configured for production domain

2. **Configure Stripe Customer Portal**
   - Go to Stripe Dashboard → Settings → Customer Portal
   - Enable customer portal
   - Configure allowed features:
     - Update payment method
     - Cancel subscription
     - View invoices
   - Set return URL to your production domain + `/dashboard`

3. **Test with Real Payment**
   - Use real credit card (not test mode)
   - Verify 7-day trial starts correctly
   - Confirm billing happens after trial ends
   - Test subscription management through portal

4. **Monitor Edge Function Logs**
   - Check logs for errors
   - Verify JWT decoding works correctly
   - Monitor Stripe API calls

## Architecture Decisions

### JWT Handling
- Uses local JWT decoding to avoid "Auth session missing" errors
- Extracts email directly from token payload
- Falls back gracefully if decoding fails

### Subscription State Management
- Stored in React Context (`AuthContext`)
- Checked on login and periodically
- Subscription details cached to reduce API calls
- Auto-refreshes after checkout/portal actions

### Security
- All edge functions require authentication (JWT)
- RLS policies protect user data
- Subscription status verified server-side
- No sensitive data in client-side code

## Troubleshooting

### "Subscription Required" Error Loop
**Cause:** Subscription check failing or returning false
**Solution:** 
- Check edge function logs for errors
- Verify Stripe customer exists for user email
- Confirm subscription is active or trialing

### Customer Portal Not Opening
**Cause:** Stripe customer not found or portal not configured
**Solution:**
- Verify user has completed checkout
- Check Stripe Dashboard that customer exists
- Ensure Customer Portal is enabled in Stripe settings

### Journal Operations Failing
**Cause:** RLS policies or authentication issues
**Solution:**
- Verify user is authenticated
- Check RLS policies on reflections table
- Ensure user_id is set correctly

## Future Enhancements

### Recommended Additions
1. **Webhook Handler** - Real-time subscription updates
2. **Usage Analytics** - Track journal creation and engagement
3. **Export Functionality** - Download journals as PDF/Markdown
4. **Search & Filter** - Find journals by date, type, or keywords
5. **Autosave Drafts** - Save reflections in progress
6. **Email Notifications** - Trial ending, subscription renewal reminders

### Scalability Considerations
- Consider caching subscription status (Redis/Supabase Storage)
- Implement pagination for large journal collections
- Add rate limiting to edge functions
- Monitor Stripe API usage and costs

## Support

For issues or questions:
1. Check edge function logs in Lovable Cloud
2. Review Stripe Dashboard for customer/subscription details
3. Verify database RLS policies
4. Check browser console for client-side errors

## License
Built with Lovable - All rights reserved
