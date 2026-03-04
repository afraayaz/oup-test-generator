# Registration Form Email Setup Guide (Formspree)

## Overview
The registration form on the homepage uses **Formspree** - a simple, free email service that requires no backend code. All inquiries are sent directly to **ouppakdigital@gmail.com**.

## Features Added

### 1. Homepage Enhancement
- **Register Interest** button (white background, changes to navy blue #002147 on hover)
- Compact modal form optimized for quick submission
- Two user types via dropdown:
  - **👤 Individual**: Collects name, email, contact, region, city, and query
  - **🏫 School**: Collects school name, email, contact, region, city, and query

### 2. Email Notification via Formspree
- No server-side code needed
- Emails sent directly to ouppakdigital@gmail.com
- Reply-to address automatically set to registrant's email
- Professional formatting included

## Formspree Setup (5 Minutes)

### Step 1: Sign Up for Formspree
1. Go to [https://formspree.io/register](https://formspree.io/register)
2. Sign up with your email (free tier allows 50 submissions/month)
3. Verify your email address

### Step 2: Create a New Form
1. After logging in, click **"+ New Form"**
2. Enter form name: "OUP Registration Inquiries"
3. Click **"Create Form"**

### Step 3: Get Your Form Endpoint
1. Formspree will show you a form endpoint that looks like:
   ```
   https://formspree.io/f/xanyglnw
   ```
2. Copy this endpoint URL

### Step 4: Configure Email Delivery
1. In Formspree dashboard, go to your form settings
2. Under **"Email"**, set the receiving email to: **ouppakdigital@gmail.com**
3. Save settings

### Step 5: Update the Code
Open `app/page.tsx` and find line ~48:
```typescript
const formspreeEndpoint = 'https://formspree.io/f/xanyglnw';
```

Replace `xanyglnw` with your actual Formspree form ID from Step 3.

### Step 6: Test the Form
1. Go to your homepage (http://localhost:5000)
2. Click **Register Interest** button
3. Fill out the form with test data
4. Click **Submit Registration**
5. Check **ouppakdigital@gmail.com** for the email (may take 1-2 minutes)

## Formspree Free Tier Details
- ✅ **50 submissions per month**
- ✅ **Unlimited forms**
- ✅ **Email notifications**
- ✅ **Spam filtering**
- ✅ **AJAX submissions**
- ✅ **File uploads** (if needed later)

If you need more than 50 submissions/month, upgrade to paid plan ($10/month for 1000 submissions).

## What Gets Sent in the Email?

Each submission includes:
- **User Type**: 👤 Individual or 🏫 School
- **Name/School Name**: Based on selection
- **Email**: Registrant's email (also set as reply-to)
- **Contact Number**: Phone number
- **Location**: Region and City
- **Query/Message**: Full message from registrant

## Customization Options

### Change Notification Email
In Formspree dashboard → Form Settings → Email → Update recipient email

### Add Email Notifications to Multiple Recipients
In Formspree dashboard → Form Settings → Email → Add multiple email addresses separated by commas

### Custom Success Message
Already implemented in the form! Shows green success banner for 2 seconds before closing.

### Spam Protection
Formspree includes automatic spam filtering. You can also enable Google reCAPTCHA in Formspree settings for extra protection.

## Troubleshooting

### Form Not Submitting
**Problem**: Form shows error after submission

**Solutions**:
- Verify the Formspree endpoint URL is correct in `app/page.tsx`
- Check that you've verified your Formspree email account
- Ensure the form is active in Formspree dashboard

### Email Not Receiving
**Problem**: Form submits successfully but no email arrives

**Solutions**:
- Check spam/junk folder in ouppakdigital@gmail.com
- Verify email address is correct in Formspree settings
- Check Formspree dashboard → Submissions to see if form data was received
- Wait 2-3 minutes (sometimes there's a delay)

### Formspree "Form Not Found"
**Problem**: Error says form doesn't exist

**Solutions**:
- Make sure you copied the complete endpoint URL including `/f/`
- Verify form is active in Formspree dashboard
- Try creating a new form and updating the endpoint

## Form Styling

The form is now **compact** with:
- Smaller padding and margins
- Text size reduced (text-xs labels, text-sm inputs)
- Modal width: max-w-lg (instead of max-w-2xl)
- Header padding: p-3 (instead of p-5)
- Form padding: p-4 space-y-3 (instead of p-6 space-y-5)
- Grid layout for Region/City (always 2 columns)
- Textarea rows: 3 (instead of 4)

## Button Styling

**Register Button**:
- Default: White background with navy blue text and border
- Hover: Navy blue background (#002147) with white text
- Smooth transition between states

## No Backend Required!

Unlike the previous setup:
- ❌ No nodemailer installation needed
- ❌ No Gmail app passwords required
- ❌ No API routes needed
- ❌ No environment variables
- ✅ Simple Formspree endpoint only!

## Support
- **Formspree Documentation**: [https://help.formspree.io/](https://help.formspree.io/)
- **Formspree Support**: support@formspree.io

## File Changes Made
1. `app/page.tsx` - Compact form, white button with navy hover, Formspree integration
2. No backend API files needed (can delete `app/api/register-inquiry/` if desired)
3. No environment variables needed
