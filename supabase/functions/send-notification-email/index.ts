import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'PESO Connect <noreply@pesoconnect.com>'

interface NotificationPayload {
  type: 'INSERT'
  table: 'notifications'
  record: {
    id: string
    user_id: string
    type: string
    title: string
    message: string
    data: Record<string, unknown>
    is_read: boolean
    created_at: string
  }
}

interface WebhookPayload {
  type: string
  table: string
  record: NotificationPayload['record']
}

const EMAIL_TEMPLATES: Record<string, (data: Record<string, unknown>, title: string, message: string) => { subject: string; html: string }> = {
  application_status_change: (data, title, message) => ({
    subject: title,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">PESO Connect</h1>
          <p style="color: #6B7280; margin: 5px 0 0 0;">San Carlos City</p>
        </div>
        <div style="background: #F9FAFB; border-radius: 12px; padding: 24px; border: 1px solid #E5E7EB;">
          <h2 style="color: #111827; margin-top: 0;">${title}</h2>
          <p style="color: #374151; line-height: 1.6;">${message}</p>
          ${data.job_title ? `<p style="color: #6B7280; font-size: 14px;"><strong>Position:</strong> ${data.job_title}</p>` : ''}
          ${data.employer_name ? `<p style="color: #6B7280; font-size: 14px;"><strong>Company:</strong> ${data.employer_name}</p>` : ''}
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${Deno.env.get('APP_URL') || 'https://pesoconnect.com'}/my-applications"
             style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
            View My Applications
          </a>
        </div>
        <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 30px;">
          You're receiving this because you have application update notifications enabled.
          You can change this in your Settings.
        </p>
      </div>
    `,
  }),
}

// Generic email template for registration/verification emails sent via invoke()
const GENERIC_TEMPLATE = (subject: string, html: string) => ({ subject, html })

Deno.serve(async (req) => {
  try {
    const body = await req.json()

    // Handle direct invocation (from emailService.js for registration/verification emails)
    if (body.type === 'direct') {
      const { to, subject, html } = body
      if (!to || !subject || !html) {
        return new Response(JSON.stringify({ error: 'Missing to, subject, or html' }), { status: 400 })
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
      })

      const result = await res.json()
      if (!res.ok) {
        console.error('Resend error:', result)
        return new Response(JSON.stringify({ error: result }), { status: res.status })
      }

      return new Response(JSON.stringify({ success: true, id: result.id }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Handle webhook payload (from DB webhook on notifications table)
    const payload = body as WebhookPayload
    const record = payload.record

    if (!record?.user_id || !record?.type) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })
    }

    // Create admin client to read user preferences
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch user email and notification preferences
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, notification_preferences')
      .eq('id', record.user_id)
      .single()

    if (userError || !user?.email) {
      console.error('User not found:', userError)
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
    }

    // Check notification preferences
    const prefs = user.notification_preferences || {}
    // Default: email_notifications and application_updates are both true if not set
    const emailEnabled = prefs.email_notifications !== false
    const typeEnabled = record.type === 'application_status_change'
      ? prefs.application_updates !== false
      : true

    if (!emailEnabled || !typeEnabled) {
      console.log('Email notifications disabled for user:', record.user_id)
      return new Response(JSON.stringify({ skipped: true, reason: 'notifications_disabled' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Build email from template
    const templateFn = EMAIL_TEMPLATES[record.type]
    if (!templateFn) {
      console.log('No email template for notification type:', record.type)
      return new Response(JSON.stringify({ skipped: true, reason: 'no_template' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const email = templateFn(record.data || {}, record.title, record.message)

    // Send via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [user.email],
        subject: email.subject,
        html: email.html,
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      console.error('Resend error:', result)
      return new Response(JSON.stringify({ error: result }), { status: res.status })
    }

    console.log('Email sent:', result.id, 'to', user.email)
    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
