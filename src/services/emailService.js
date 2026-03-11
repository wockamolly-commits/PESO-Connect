// Email Service for PESO Connect
// Sends emails via Supabase Edge Function (Resend on the backend)

import { supabase } from '../config/supabase'

const EMAIL_ENABLED = import.meta.env.VITE_EMAIL_NOTIFICATIONS_ENABLED === 'true'

/**
 * Send an email via the send-notification-email Edge Function.
 * @param {string} to - recipient email
 * @param {string} subject - email subject
 * @param {string} html - email HTML body
 * @returns {Promise<boolean>} success
 */
const sendEmailViaEdgeFunction = async (to, subject, html) => {
    if (!EMAIL_ENABLED) {
        console.log('Email notifications disabled. Would send:', subject, 'to', to)
        return false
    }

    try {
        const { data, error } = await supabase.functions.invoke('send-notification-email', {
            body: { type: 'direct', to, subject, html },
        })

        if (error) {
            console.error('Edge function error:', error)
            return false
        }

        console.log('Email sent:', subject, 'to', to)
        return true
    } catch (error) {
        console.error('Error sending email:', error)
        return false
    }
}

// ── Template builders ────────────────────────────────────

const wrap = (content) => `
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
</div>
`

// ── Jobseeker emails ─────────────────────────────────────

export const sendJobseekerRegistrationEmail = (data) => {
    return sendEmailViaEdgeFunction(
        data.email,
        'Welcome to PESO Connect - Registration Received',
        wrap(`
            <h2 style="color: #111827; margin-top: 0;">Welcome to PESO Connect!</h2>
            <p>Dear ${data.full_name},</p>
            <p>Thank you for registering with PESO Connect San Carlos City.</p>
            <p>Your jobseeker account has been created and is currently <strong>pending verification</strong> by our PESO personnel.</p>
            <h3>What happens next?</h3>
            <ul>
                <li>Our PESO team will review your profile and documents</li>
                <li>You will receive an email notification once your account is verified</li>
                <li>After verification, you can start applying for jobs</li>
            </ul>
            <p>This process typically takes 1-3 business days.</p>
            <p>Best regards,<br>PESO Connect Team</p>
        `)
    )
}

export const sendJobseekerVerifiedEmail = (data) => {
    return sendEmailViaEdgeFunction(
        data.email,
        'Your PESO Connect Account Has Been Verified!',
        wrap(`
            <h2 style="color: #111827; margin-top: 0;">Congratulations! Your Account is Verified</h2>
            <p>Dear ${data.full_name},</p>
            <p>Great news! Your PESO Connect account has been <strong>verified and activated</strong>.</p>
            <h3>You can now:</h3>
            <ul>
                <li>Browse all available job listings</li>
                <li>Submit job applications</li>
                <li>Update your profile and skills</li>
                <li>Track your application status</li>
            </ul>
            <p>We wish you success in your job search!</p>
            <p>Best regards,<br>PESO Connect Team</p>
        `)
    )
}

export const sendJobseekerRejectedEmail = (data) => {
    return sendEmailViaEdgeFunction(
        data.email,
        'PESO Connect Registration Update',
        wrap(`
            <h2 style="color: #111827; margin-top: 0;">Registration Status Update</h2>
            <p>Dear ${data.full_name},</p>
            <p>We have reviewed your PESO Connect registration.</p>
            <p>Unfortunately, we were unable to approve your account at this time.</p>
            ${data.rejection_reason ? `
                <h3>Reason:</h3>
                <p style="background-color: #FEF3C7; padding: 10px; border-left: 4px solid #F59E0B; border-radius: 5px;">
                    ${data.rejection_reason}
                </p>
            ` : ''}
            <h3>Next Steps:</h3>
            <ul>
                <li>Please contact PESO San Carlos City for more information</li>
                <li>You may resubmit your registration after addressing the issues mentioned</li>
            </ul>
            <p>Best regards,<br>PESO Connect Team</p>
        `)
    )
}

// ── Employer emails ──────────────────────────────────────

export const sendEmployerRegistrationEmail = (data) => {
    return sendEmailViaEdgeFunction(
        data.email,
        'PESO Connect - Employer Registration Received',
        wrap(`
            <h2 style="color: #111827; margin-top: 0;">Welcome to PESO Connect</h2>
            <p>Dear ${data.representative_name},</p>
            <p>Thank you for registering <strong>${data.company_name}</strong> with PESO Connect.</p>
            <p>Your employer account is currently <strong>pending verification</strong> by PESO San Carlos City.</p>
            <h3>What happens next?</h3>
            <ul>
                <li>Our team will verify your business documents</li>
                <li>We will contact you if additional information is needed</li>
                <li>You will receive approval notification via email</li>
                <li>Once approved, you can post job openings</li>
            </ul>
            <p>Verification typically takes 2-5 business days.</p>
            <p>Best regards,<br>PESO Connect Team</p>
        `)
    )
}

export const sendEmployerApprovedEmail = (data) => {
    return sendEmailViaEdgeFunction(
        data.email,
        'Your PESO Connect Employer Account is Approved!',
        wrap(`
            <h2 style="color: #111827; margin-top: 0;">Employer Account Approved!</h2>
            <p>Dear ${data.representative_name},</p>
            <p>Excellent news! Your employer account for <strong>${data.company_name}</strong> has been approved.</p>
            <h3>You can now:</h3>
            <ul>
                <li>Post unlimited job openings</li>
                <li>Review applications from verified jobseekers</li>
                <li>Manage your job listings</li>
                <li>Connect with qualified candidates</li>
            </ul>
            <p>Thank you for partnering with PESO San Carlos City!</p>
            <p>Best regards,<br>PESO Connect Team</p>
        `)
    )
}

export const sendEmployerRejectedEmail = (data) => {
    return sendEmailViaEdgeFunction(
        data.email,
        'PESO Connect Employer Registration Update',
        wrap(`
            <h2 style="color: #111827; margin-top: 0;">Registration Status Update</h2>
            <p>Dear ${data.representative_name},</p>
            <p>We have reviewed the employer registration for <strong>${data.company_name}</strong>.</p>
            <p>Unfortunately, we were unable to approve your account at this time.</p>
            ${data.rejection_reason ? `
                <h3>Reason:</h3>
                <p style="background-color: #FEF3C7; padding: 10px; border-left: 4px solid #F59E0B; border-radius: 5px;">
                    ${data.rejection_reason}
                </p>
            ` : ''}
            <h3>Next Steps:</h3>
            <ul>
                <li>Please contact PESO San Carlos City for clarification</li>
                <li>Prepare any required additional documentation</li>
                <li>You may resubmit after addressing the concerns</li>
            </ul>
            <p>Best regards,<br>PESO Connect Team</p>
        `)
    )
}

// ── Legacy compatibility ─────────────────────────────────
// sendEmail is kept for any code that uses the generic interface
export const sendEmail = async (templateType, data) => {
    const handlers = {
        JOBSEEKER_REGISTRATION: sendJobseekerRegistrationEmail,
        JOBSEEKER_VERIFIED: sendJobseekerVerifiedEmail,
        JOBSEEKER_REJECTED: sendJobseekerRejectedEmail,
        EMPLOYER_REGISTRATION: sendEmployerRegistrationEmail,
        EMPLOYER_APPROVED: sendEmployerApprovedEmail,
        EMPLOYER_REJECTED: sendEmployerRejectedEmail,
    }
    const handler = handlers[templateType]
    if (!handler) {
        console.error('Invalid email template type:', templateType)
        return false
    }
    return handler(data)
}

export default {
    sendEmail,
    sendJobseekerRegistrationEmail,
    sendJobseekerVerifiedEmail,
    sendJobseekerRejectedEmail,
    sendEmployerRegistrationEmail,
    sendEmployerApprovedEmail,
    sendEmployerRejectedEmail
}
