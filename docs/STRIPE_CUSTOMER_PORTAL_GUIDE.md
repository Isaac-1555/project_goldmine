# Stripe Customer Portal Setup Guide (Updated 2024)

## Quick Access

**Direct Link**: https://dashboard.stripe.com/settings/billing/portal

Or navigate: **Stripe Dashboard** → **Settings** (⚙️) → **Billing** → **Customer portal**

---

## Step-by-Step Setup

### 1. Access Customer Portal Settings

1. Log into your Stripe Dashboard
2. Make sure you're in **Test mode** (toggle in top right)
3. Click the **Settings** gear icon (⚙️) in the top right
4. In the left sidebar, find **Billing** section
5. Click **Customer portal**

### 2. Activate the Portal

If this is your first time:
- Click **Get started** or **Activate** button
- Stripe will create a default configuration

If already activated:
- Click **Edit settings** or **Configure**

---

## 3. Configure Functionality

Under the **Functionality** section, configure these settings:

### ✅ Invoice History
**Toggle ON**
- Allows customers to view and download their invoices
- Recommended: Keep this enabled

### ✅ Update Payment Method
**Toggle ON**
- Lets customers add or update their credit card
- Essential for subscription management
- Customers can add multiple payment methods

### ✅ Cancel Subscriptions
**Toggle ON**

**Important**: Choose cancellation behavior:
- **Option 1: Cancel at period end** ✅ **(RECOMMENDED)**
  - Customer keeps access until billing period ends
  - No refunds, but fair to customer
  - Better user experience
  
- **Option 2: Cancel immediately**
  - Subscription ends instantly
  - Can offer prorated refund (optional)
  - More aggressive

**For your use case**, choose **"Cancel at period end"**

### 🔄 Update Subscription (Optional)
**Toggle ON or OFF**
- Allows customers to change plans (upgrade/downgrade)
- You only have one plan ($4.99/month), so this is **optional**
- You can enable this later if you add more plans

---

## 4. Configure Products

Under the **Products** section:

1. Click **Add product** 
2. Select your **$4.99 Premium Subscription** product
3. This makes it visible in the customer portal
4. You can set up plan switching here (optional)

**Note**: Since you only have one plan, you can skip complex configurations here.

---

## 5. Customize Branding (Recommended)

Make the portal look professional:

### Business Name
- Enter your app name (e.g., "SummarEase")

### Icon/Logo
- Upload a square logo (PNG or JPG)
- Recommended size: 512x512px or larger
- Appears at top of portal

### Accent Color
- Choose your brand color (e.g., `#667eea`)
- Used for buttons and links

### Default URL
- Set to your app's URL (e.g., `https://yourdomain.com`)
- Where users return after managing subscription

---

## 6. Business Information

### Support Email
- Add your support email (e.g., `support@yourdomain.com`)
- Customers will see this for questions
- **Required**

### Terms of Service URL (Optional)
- Add if you have terms: `https://yourdomain.com/terms`
- Shows link in portal footer

### Privacy Policy URL (Optional)
- Add if you have privacy policy: `https://yourdomain.com/privacy`
- Shows link in portal footer

---

## 7. Save Changes

1. Scroll to the bottom
2. Click **Save changes**
3. ✅ Customer Portal is now live!

---

## 8. Test Your Portal

### Preview in Stripe Dashboard
1. Click **Preview** button (top right of Customer Portal page)
2. Opens portal in test mode
3. You'll see customer view (with sample data)

### Test with Real Customer
After deploying your app:
1. Create a test subscription using Stripe test card: `4242 4242 4242 4242`
2. In your app, click the "Manage Subscription" button
3. Should redirect to Stripe Customer Portal
4. Test all features:
   - View invoices ✅
   - Update payment method ✅
   - Cancel subscription ✅

---

## Quick Configuration Summary

Here's what to enable for your SaaS:

| Feature | Status | Why |
|---------|--------|-----|
| Invoice history | ✅ ON | Transparency, customer trust |
| Update payment method | ✅ ON | Essential for subscriptions |
| Cancel subscriptions | ✅ ON | Required by best practices |
| → Cancellation type | 🎯 At period end | Fair to customers |
| Update subscriptions | ⚪ OFF | Only one plan currently |
| Branding | ✅ ON | Professional appearance |
| Support email | ✅ ON | Required for customer support |

---

## What Your Customers Will See

When customers click "Manage Subscription" in your app, they'll see:

### Portal Home Screen
```
┌─────────────────────────────────────┐
│  [Your Logo]  Your App Name         │
├─────────────────────────────────────┤
│                                     │
│  Subscription                       │
│  ● Premium Plan - $4.99/month       │
│  Next billing: Jan 10, 2025         │
│  [Cancel subscription]              │
│                                     │
│  Payment methods                    │
│  ● •••• 4242  Expires 12/25        │
│  [Add payment method]               │
│                                     │
│  Invoices                          │
│  📄 Dec 10, 2024 - $4.99  [↓]      │
│  📄 Nov 10, 2024 - $4.99  [↓]      │
│                                     │
└─────────────────────────────────────┘
```

---

## Troubleshooting

### "Customer portal is not activated"
- Go back to Settings → Billing → Customer portal
- Click "Activate" or "Get started"

### "Invalid configuration"
- Ensure you've saved changes
- Check that support email is set
- Verify you're in Test mode for testing

### Portal URL not working
- Verify you've deployed the `create-portal-session` Edge Function
- Check Supabase function logs: `supabase functions logs create-portal-session`
- Ensure Stripe secret key is set in Supabase secrets

### Customers can't cancel
- Check "Cancel subscriptions" is enabled in portal settings
- Verify webhook is set up correctly (to sync cancellation to database)

---

## Live Mode vs Test Mode

### Test Mode (Development)
- Configure test portal first
- Use test cards (4242 4242 4242 4242)
- No real charges
- Webhooks go to test webhook endpoint

### Live Mode (Production)
When ready to launch:
1. Switch to **Live mode** in Stripe
2. Configure **Live Customer Portal** (same settings)
3. Update webhook to live endpoint
4. Update .env with **live** Stripe keys

**Note**: Test and Live portals are configured separately!

---

## Best Practices

### ✅ DO:
- Enable "Cancel at period end" (better UX)
- Add your branding (logo, colors)
- Set support email
- Test thoroughly before launch
- Monitor cancellation reasons in Stripe Dashboard

### ❌ DON'T:
- Make cancellation too hard (bad for reputation)
- Skip branding (looks unprofessional)
- Forget to test in test mode first
- Ignore cancellation feedback

---

## Need More Help?

- **Stripe Docs**: https://stripe.com/docs/billing/subscriptions/customer-portal
- **Video Tutorial**: https://www.youtube.com/results?search_query=stripe+customer+portal+setup
- **Stripe Support**: Available in Dashboard (? icon)

---

## Summary Checklist

Before you're done, verify:

- [ ] Customer Portal activated
- [ ] Invoice history enabled
- [ ] Update payment method enabled
- [ ] Cancel subscriptions enabled (cancel at period end)
- [ ] Your app name added
- [ ] Support email set
- [ ] Preview tested successfully
- [ ] Saved all changes

✅ You're ready to go!
