import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev'
const APP_URL = Deno.env.get('APP_URL') || 'https://pesoconnect.com'

interface NotificationRecord {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
}

interface WebhookPayload {
  type: string
  table: string
  record: NotificationRecord
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const text = (data: Record<string, unknown>, key: string, fallback = '') =>
  escapeHtml(data[key] ?? fallback)

const wrap = (content: string) => `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; margin: 0;">PESO Connect</h1>
    <p style="color: #6B7280; margin: 5px 0 0 0;">San Carlos City</p>
  </div>
  <div style="background: #F9FAFB; border-radius: 12px; padding: 24px; border: 1px solid #E5E7EB;">
    ${content}
  </div>
  <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 30px;">
    PESO Connect - San Carlos City Public Employment Service Office
  </p>
</div>`

const rejectionBlock = (reason: unknown) => {
  const escaped = escapeHtml(reason)
  if (!escaped) return ''
  return `
    <h3>Reason:</h3>
    <p style="background-color: #FEF3C7; padding: 10px; border-left: 4px solid #F59E0B; border-radius: 5px;">
      ${escaped}
    </p>`
}

const template = (subject: string, content: string) => ({
  subject,
  html: wrap(content),
})

const DIRECT_TEMPLATES: Record<string, (data: Record<string, unknown>) => { to: string; subject: string; html: string } | null> = {
  JOBSEEKER_REGISTRATION: (data) => ({
    to: String(data.email || ''),
    ...template('Welcome to PESO Connect - Registration Received', `
      <h2 style="color: #111827; margin-top: 0;">Welcome to PESO Connect!</h2>
      <p>Dear ${text(data, 'full_name', 'Jobseeker')},</p>
      <p>Thank you for registering with PESO Connect San Carlos City.</p>
      <p>Your jobseeker account has been created and is currently <strong>pending verification</strong> by our PESO personnel.</p>
      <p>This process typically takes 1-3 business days.</p>
      <p>Best regards,<br>PESO Connect Team</p>`),
  }),
  JOBSEEKER_VERIFIED: (data) => ({
    to: String(data.email || ''),
    ...template('Your PESO Connect Account Has Been Verified!', `
      <h2 style="color: #111827; margin-top: 0;">Congratulations! Your Account is Verified</h2>
      <p>Dear ${text(data, 'full_name', 'Jobseeker')},</p>
      <p>Your PESO Connect account has been <strong>verified and activated</strong>.</p>
      <p>You can now browse job listings, apply, and track your applications.</p>
      <p>Best regards,<br>PESO Connect Team</p>`),
  }),
  JOBSEEKER_REJECTED: (data) => ({
    to: String(data.email || ''),
    ...template('PESO Connect Registration Update', `
      <h2 style="color: #111827; margin-top: 0;">Registration Status Update</h2>
      <p>Dear ${text(data, 'full_name', 'Jobseeker')},</p>
      <p>Unfortunately, we were unable to approve your account at this time.</p>
      ${rejectionBlock(data.rejection_reason)}
      <p>Please contact PESO San Carlos City for more information.</p>
      <p>Best regards,<br>PESO Connect Team</p>`),
  }),
  EMPLOYER_REGISTRATION: (data) => ({
    to: String(data.email || ''),
    ...template('PESO Connect - Employer Registration Received', `
      <h2 style="color: #111827; margin-top: 0;">Welcome to PESO Connect</h2>
      <p>Dear ${text(data, 'representative_name', 'Employer')},</p>
      <p>Thank you for registering <strong>${text(data, 'company_name', 'your company')}</strong> with PESO Connect.</p>
      <p>Your employer account is currently <strong>pending verification</strong>.</p>
      <p>Best regards,<br>PESO Connect Team</p>`),
  }),
  EMPLOYER_APPROVED: (data) => ({
    to: String(data.email || ''),
    ...template('Your PESO Connect Employer Account is Approved!', `
      <h2 style="color: #111827; margin-top: 0;">Employer Account Approved!</h2>
      <p>Dear ${text(data, 'representative_name', 'Employer')},</p>
      <p>Your employer account for <strong>${text(data, 'company_name', 'your company')}</strong> has been approved.</p>
      <p>You can now post job openings and review applications.</p>
      <p>Best regards,<br>PESO Connect Team</p>`),
  }),
  EMPLOYER_REJECTED: (data) => ({
    to: String(data.email || ''),
    ...template('PESO Connect Employer Registration Update', `
      <h2 style="color: #111827; margin-top: 0;">Registration Status Update</h2>
      <p>Dear ${text(data, 'representative_name', 'Employer')},</p>
      <p>We were unable to approve the registration for <strong>${text(data, 'company_name', 'your company')}</strong>.</p>
      ${rejectionBlock(data.rejection_reason)}
      <p>Please contact PESO San Carlos City for clarification.</p>
      <p>Best regards,<br>PESO Connect Team</p>`),
  }),
  APPLICATION_RECEIVED: (data) => ({
    to: String(data.email || ''),
    ...template(`Application Submitted - ${escapeHtml(data.job_title)}`, `
      <h2 style="color: #111827; margin-top: 0;">Application Submitted!</h2>
      <p>Dear ${text(data, 'applicant_name', 'Applicant')},</p>
      <p>Your application for <strong>${text(data, 'job_title', 'this job')}</strong> has been submitted successfully.</p>
      <p>Best regards,<br>PESO Connect Team</p>`),
  }),
  NEW_APPLICANT: (data) => ({
    to: String(data.email || ''),
    ...template(`New Application - ${escapeHtml(data.job_title)}`, `
      <h2 style="color: #111827; margin-top: 0;">New Application Received</h2>
      <p>Dear ${text(data, 'employer_name', 'Employer')},</p>
      <p><strong>${text(data, 'applicant_name', 'A jobseeker')}</strong> has applied for <strong>${text(data, 'job_title', 'your job posting')}</strong>.</p>
      <p>Log in to PESO Connect to review the application.</p>
      <p>Best regards,<br>PESO Connect Team</p>`),
  }),
  APPLICATION_STATUS: (data) => {
    const status = String(data.status || '')
    const jobTitle = escapeHtml(data.job_title)
    const subjects: Record<string, string> = {
      shortlisted: `You've been shortlisted - ${jobTitle}`,
      hired: `Congratulations! You've been hired - ${jobTitle}`,
      rejected: `Application Update - ${jobTitle}`,
    }
    if (!subjects[status]) return null

    const statusCopy: Record<string, string> = {
      shortlisted: `${text(data, 'employer_name', 'The employer')} has shortlisted your application for <strong>${text(data, 'job_title', 'this job')}</strong>.`,
      hired: `${text(data, 'employer_name', 'The employer')} has accepted your application for <strong>${text(data, 'job_title', 'this job')}</strong>.`,
      rejected: `Unfortunately, your application for <strong>${text(data, 'job_title', 'this job')}</strong> was not selected at this time.`,
    }
    return {
      to: String(data.email || ''),
      ...template(subjects[status], `
        <h2 style="color: #111827; margin-top: 0;">Application Status Update</h2>
        <p>Dear ${text(data, 'applicant_name', 'Applicant')},</p>
        <p>${statusCopy[status]}</p>
        <p>Best regards,<br>PESO Connect Team</p>`),
    }
  },
}

const NOTIFICATION_TEMPLATES: Record<string, (record: NotificationRecord) => { subject: string; html: string } | null> = {
  application_status_change: (record) => template(escapeHtml(record.title), `
    <h2 style="color: #111827; margin-top: 0;">${escapeHtml(record.title)}</h2>
    <p style="color: #374151; line-height: 1.6;">${escapeHtml(record.message)}</p>
    ${record.data?.job_title ? `<p style="color: #6B7280; font-size: 14px;"><strong>Position:</strong> ${escapeHtml(record.data.job_title)}</p>` : ''}
    ${record.data?.employer_name ? `<p style="color: #6B7280; font-size: 14px;"><strong>Company:</strong> ${escapeHtml(record.data.employer_name)}</p>` : ''}
    <p><a href="${APP_URL}/my-applications">View My Applications</a></p>`),
}

const sendEmail = async (to: string, subject: string, html: string) => {
  if (!to || !subject || !html) {
    return new Response(JSON.stringify({ error: 'Missing email fields' }), { status: 400, headers: corsHeaders })
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
    return new Response(JSON.stringify({ error: result }), { status: res.status, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ success: true, id: result.id }), { headers: corsHeaders })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsPreflightRequest()

  try {
    const body = await req.json()

    if (body.type === 'direct') {
      return new Response(JSON.stringify({ error: 'Raw direct emails are disabled' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    if (body.type === 'template') {
      const templateFn = DIRECT_TEMPLATES[String(body.templateType || '')]
      const rendered = templateFn?.(body.data || {})
      if (!rendered) {
        return new Response(JSON.stringify({ error: 'Invalid email template' }), { status: 400, headers: corsHeaders })
      }
      return sendEmail(rendered.to, rendered.subject, rendered.html)
    }

    const payload = body as WebhookPayload
    const record = payload.record
    if (!record?.user_id || !record?.type) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, notification_preferences')
      .eq('id', record.user_id)
      .single()

    if (userError || !user?.email) {
      console.error('User not found:', userError)
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders })
    }

    const prefs = user.notification_preferences || {}
    const emailEnabled = prefs.email_notifications !== false
    const typeEnabled = record.type === 'application_status_change'
      ? prefs.application_updates !== false
      : true

    if (!emailEnabled || !typeEnabled) {
      return new Response(JSON.stringify({ skipped: true, reason: 'notifications_disabled' }), { headers: corsHeaders })
    }

    const notificationTemplate = NOTIFICATION_TEMPLATES[record.type]?.(record)
    if (!notificationTemplate) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_template' }), { headers: corsHeaders })
    }

    return sendEmail(user.email, notificationTemplate.subject, notificationTemplate.html)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Email function failed'
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders })
  }
})
