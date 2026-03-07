# Email Notifications Setup Guide

This guide explains how to set up email notifications for PESO Connect.

## Overview

Email notifications are sent for the following events:
- **Jobseeker Registration** - Confirmation email when a jobseeker registers
- **Jobseeker Verified** - Notification when admin approves jobseeker account
- **Jobseeker Rejected** - Notification when admin rejects jobseeker account (includes reason)
- **Employer Registration** - Confirmation email when an employer registers
- **Employer Approved** - Notification when admin approves employer account
- **Employer Rejected** - Notification when admin rejects employer account (includes reason)

## Email Service: EmailJS

PESO Connect uses **EmailJS** for sending emails. EmailJS is a client-side email service that doesn't require a backend server.

### Why EmailJS?
- ✅ No backend required
- ✅ Free tier available (200 emails/month)
- ✅ Easy to set up
- ✅ Works with Gmail, Outlook, etc.
- ✅ Custom email templates

---

## Setup Instructions

### Step 1: Create EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Click "Sign Up" and create a free account
3. Verify your email address

### Step 2: Connect Your Email Service

1. After logging in, click **"Email Services"** in the sidebar
2. Click **"Add New Service"**
3. Choose your email provider:
   - **Gmail** (recommended for testing)
   - **Outlook**
   - **SendGrid**
   - Or any other supported service
4. Follow the connection wizard:
   - For Gmail: Allow EmailJS to access your Gmail account
   - For Outlook: Sign in with Microsoft account
5. Give your service a name (e.g., "PESO Connect Notifications")
6. Copy the **Service ID** (you'll need this later)

### Step 3: Create Email Templates

You need to create 6 email templates in EmailJS. For each template:

1. Click **"Email Templates"** in the sidebar
2. Click **"Create New Template"**
3. Set the **Template ID** exactly as shown below
4. Design your email template using the variables provided
5. Click **"Save"**

#### Template 1: Jobseeker Registration
- **Template ID**: `template_jobseeker_registration`
- **Subject**: `Welcome to PESO Connect - Registration Received`
- **Template Variables**:
  - `{{to_email}}` - Recipient email
  - `{{to_name}}` - Recipient name
  - `{{message}}` - Email content (HTML)

**Template Body**:
```
To: {{to_email}}
Subject: {{subject}}

{{{message}}}
```

#### Template 2: Jobseeker Verified
- **Template ID**: `template_jobseeker_verified`
- **Subject**: `Your PESO Connect Account Has Been Verified!`
- Same variables as Template 1

#### Template 3: Jobseeker Rejected
- **Template ID**: `template_jobseeker_rejected`
- **Subject**: `PESO Connect Registration Update`
- Same variables as Template 1

#### Template 4: Employer Registration
- **Template ID**: `template_employer_registration`
- **Subject**: `PESO Connect - Employer Registration Received`
- Same variables as Template 1

#### Template 5: Employer Approved
- **Template ID**: `template_employer_approved`
- **Subject**: `Your PESO Connect Employer Account is Approved!`
- Same variables as Template 1

#### Template 6: Employer Rejected
- **Template ID**: `template_employer_rejected`
- **Subject**: `PESO Connect Employer Registration Update`
- Same variables as Template 1

### Step 4: Get Your Public Key

1. Click on your account name (top right)
2. Go to **"Account"** → **"General"**
3. Find your **Public Key** (looks like: `xJki9JfK_abc123def`)
4. Copy this key

### Step 5: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your EmailJS credentials:
   ```env
   # Email Notifications (EmailJS)
   VITE_EMAILJS_SERVICE_ID=your_service_id_here
   VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
   VITE_EMAIL_NOTIFICATIONS_ENABLED=true
   ```

3. Replace:
   - `your_service_id_here` with the Service ID from Step 2
   - `your_public_key_here` with the Public Key from Step 4
   - Set `VITE_EMAIL_NOTIFICATIONS_ENABLED=true` to enable emails

### Step 6: Install EmailJS Package

Run the following command in your project directory:

```bash
npm install @emailjs/browser
```

### Step 7: Test Email Notifications

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Test registration:
   - Go to `/register`
   - Register as a jobseeker or employer
   - Check your email for the confirmation

3. Test admin actions:
   - Login as admin at `/admin/login`
   - Go to Jobseeker or Employer Verification
   - Approve or reject a user
   - Check the user's email for the notification

---

## Email Template Customization

You can customize the email templates in `src/services/emailService.js`. The templates include:

- Professional HTML formatting
- PESO Connect branding
- Action buttons (e.g., "Browse Jobs Now", "Post Your First Job")
- Rejection reasons (if applicable)
- Clear next steps for users

To modify templates:
1. Open `src/services/emailService.js`
2. Find the `EMAIL_TEMPLATES` object
3. Edit the `getContent()` function for each template
4. The `message` field supports HTML

---

## Troubleshooting

### Emails Not Sending

**Check Console Logs:**
- Open browser DevTools → Console
- Look for email-related messages (📧, ✅, ❌)

**Common Issues:**

1. **"EmailJS not configured"**
   - Check that `.env` file exists
   - Verify `VITE_EMAILJS_SERVICE_ID` and `VITE_EMAILJS_PUBLIC_KEY` are set
   - Restart your development server after editing `.env`

2. **"Email notifications disabled"**
   - Set `VITE_EMAIL_NOTIFICATIONS_ENABLED=true` in `.env`
   - Restart development server

3. **"Template not found"**
   - Verify template IDs in EmailJS dashboard match exactly:
     - `template_jobseeker_registration`
     - `template_jobseeker_verified`
     - etc.
   - Template IDs are case-sensitive

4. **"Unauthorized" or 401 error**
   - Double-check your Public Key
   - Make sure you're using the Public Key, not Private Key
   - Regenerate the key in EmailJS dashboard if needed

5. **Emails going to spam**
   - Add your own email domain to EmailJS
   - Use a verified sender email
   - Ask recipients to whitelist your email

### Testing Without Sending Real Emails

Set `VITE_EMAIL_NOTIFICATIONS_ENABLED=false` in `.env` to test the system without sending emails. You'll see console logs instead:

```
📧 Email notifications disabled. Email would be sent: JOBSEEKER_REGISTRATION user@example.com
```

---

## Email Limits

### Free Tier
- **200 emails per month**
- Sufficient for small to medium deployments
- Resets monthly

### Paid Plans
If you need more:
- Personal: $7/month (1,000 emails)
- Professional: $15/month (10,000 emails)
- Enterprise: Custom pricing

---

## Alternative Email Services

If you need to switch from EmailJS, you can modify `src/services/emailService.js` to use:

1. **SendGrid API** - More emails, requires API key
2. **Mailgun** - Transactional emails, developer-friendly
3. **AWS SES** - Cheapest for high volume
4. **Firebase Cloud Functions + Nodemailer** - Full control, requires backend

The email service is abstracted, so you only need to modify the `sendEmail()` function.

---

## Production Considerations

Before deploying to production:

1. ✅ **Use a Professional Email Domain**
   - Connect your company domain (e.g., `noreply@pesosancarlos.gov.ph`)
   - Improves deliverability and trust

2. ✅ **Enable Email Tracking** (optional)
   - Track open rates in EmailJS dashboard
   - Monitor delivery success

3. ✅ **Set Up SPF and DKIM**
   - Prevents emails from going to spam
   - Configure in your domain's DNS settings

4. ✅ **Monitor Email Quota**
   - Set up alerts in EmailJS
   - Upgrade plan if needed

5. ✅ **Backup Email Service**
   - Consider a fallback service if EmailJS is down
   - Log failed emails for manual follow-up

---

## Support

For EmailJS issues:
- Documentation: [https://www.emailjs.com/docs/](https://www.emailjs.com/docs/)
- Support: [https://www.emailjs.com/support/](https://www.emailjs.com/support/)

For PESO Connect issues:
- Check the code in `src/services/emailService.js`
- Review console logs for error messages
- Test with `VITE_EMAIL_NOTIFICATIONS_ENABLED=false` first

---

## Summary

Email notifications are now integrated into PESO Connect! Users will receive:
- Confirmation when they register
- Updates when their account is verified or rejected
- Professional, branded emails with clear next steps

This improves user experience and keeps everyone informed about their account status.
