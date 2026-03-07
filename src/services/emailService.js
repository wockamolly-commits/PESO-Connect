// Email Service for PESO Connect
// This service handles sending email notifications for various events

// Email configuration
// To enable emails, sign up at https://www.emailjs.com/ and add your credentials to .env:
// VITE_EMAILJS_SERVICE_ID=your_service_id
// VITE_EMAILJS_PUBLIC_KEY=your_public_key

const EMAILJS_CONFIG = {
    serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || '',
    publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '',
    enabled: import.meta.env.VITE_EMAIL_NOTIFICATIONS_ENABLED === 'true'
}

// Email templates
const EMAIL_TEMPLATES = {
    // Jobseeker registration confirmation
    JOBSEEKER_REGISTRATION: {
        templateId: 'template_jobseeker_registration',
        subject: 'Welcome to PESO Connect - Registration Received',
        getContent: (data) => ({
            to_email: data.email,
            to_name: data.full_name,
            subject: 'Welcome to PESO Connect - Registration Received',
            message: `
                <h2>Welcome to PESO Connect!</h2>
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
                <p>If you have any questions, please contact PESO San Carlos City.</p>
                <p>Best regards,<br>PESO Connect Team</p>
            `
        })
    },

    // Jobseeker verification approved
    JOBSEEKER_VERIFIED: {
        templateId: 'template_jobseeker_verified',
        subject: 'Your PESO Connect Account Has Been Verified!',
        getContent: (data) => ({
            to_email: data.email,
            to_name: data.full_name,
            subject: 'Your PESO Connect Account Has Been Verified!',
            message: `
                <h2>Congratulations! Your Account is Verified</h2>
                <p>Dear ${data.full_name},</p>
                <p>Great news! Your PESO Connect account has been <strong>verified and activated</strong>.</p>
                <h3>You can now:</h3>
                <ul>
                    <li>Browse all available job listings</li>
                    <li>Submit job applications</li>
                    <li>Update your profile and skills</li>
                    <li>Track your application status</li>
                </ul>
                <p><a href="${window.location.origin}/jobs" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">Browse Jobs Now</a></p>
                <p>We wish you success in your job search!</p>
                <p>Best regards,<br>PESO Connect Team</p>
            `
        })
    },

    // Jobseeker verification rejected
    JOBSEEKER_REJECTED: {
        templateId: 'template_jobseeker_rejected',
        subject: 'PESO Connect Registration Update',
        getContent: (data) => ({
            to_email: data.email,
            to_name: data.full_name,
            subject: 'PESO Connect Registration Update',
            message: `
                <h2>Registration Status Update</h2>
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
                <p>If you have questions, please visit our office or contact us directly.</p>
                <p>Best regards,<br>PESO Connect Team</p>
            `
        })
    },

    // Employer registration confirmation
    EMPLOYER_REGISTRATION: {
        templateId: 'template_employer_registration',
        subject: 'PESO Connect - Employer Registration Received',
        getContent: (data) => ({
            to_email: data.email,
            to_name: data.representative_name,
            subject: 'PESO Connect - Employer Registration Received',
            message: `
                <h2>Welcome to PESO Connect</h2>
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
            `
        })
    },

    // Employer verification approved
    EMPLOYER_APPROVED: {
        templateId: 'template_employer_approved',
        subject: 'Your PESO Connect Employer Account is Approved!',
        getContent: (data) => ({
            to_email: data.email,
            to_name: data.representative_name,
            subject: 'Your PESO Connect Employer Account is Approved!',
            message: `
                <h2>Employer Account Approved!</h2>
                <p>Dear ${data.representative_name},</p>
                <p>Excellent news! Your employer account for <strong>${data.company_name}</strong> has been approved.</p>
                <h3>You can now:</h3>
                <ul>
                    <li>Post unlimited job openings</li>
                    <li>Review applications from verified jobseekers</li>
                    <li>Manage your job listings</li>
                    <li>Connect with qualified candidates</li>
                </ul>
                <p><a href="${window.location.origin}/post-job" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">Post Your First Job</a></p>
                <p>Thank you for partnering with PESO San Carlos City!</p>
                <p>Best regards,<br>PESO Connect Team</p>
            `
        })
    },

    // Employer verification rejected
    EMPLOYER_REJECTED: {
        templateId: 'template_employer_rejected',
        subject: 'PESO Connect Employer Registration Update',
        getContent: (data) => ({
            to_email: data.email,
            to_name: data.representative_name,
            subject: 'PESO Connect Employer Registration Update',
            message: `
                <h2>Registration Status Update</h2>
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
                <p>If you have questions, please visit our office or contact us directly.</p>
                <p>Best regards,<br>PESO Connect Team</p>
            `
        })
    }
}

/**
 * Send email notification using EmailJS
 * @param {string} templateType - Type of email template to use (from EMAIL_TEMPLATES)
 * @param {object} data - Data to populate the email template
 * @returns {Promise<boolean>} - Success status
 */
export const sendEmail = async (templateType, data) => {
    // Check if email notifications are enabled
    if (!EMAILJS_CONFIG.enabled) {
        console.log('📧 Email notifications disabled. Email would be sent:', templateType, data.email)
        return false
    }

    // Check if EmailJS is configured
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.publicKey) {
        console.warn('⚠️ EmailJS not configured. Set VITE_EMAILJS_SERVICE_ID and VITE_EMAILJS_PUBLIC_KEY in .env')
        return false
    }

    const template = EMAIL_TEMPLATES[templateType]
    if (!template) {
        console.error('❌ Invalid email template type:', templateType)
        return false
    }

    try {
        // Dynamically import emailjs only when needed
        const emailjs = await import('@emailjs/browser')

        const templateParams = template.getContent(data)

        const response = await emailjs.default.send(
            EMAILJS_CONFIG.serviceId,
            template.templateId,
            templateParams,
            EMAILJS_CONFIG.publicKey
        )

        if (response.status === 200) {
            console.log('✅ Email sent successfully:', templateType, 'to', data.email)
            return true
        } else {
            console.error('❌ Email send failed:', response)
            return false
        }
    } catch (error) {
        console.error('❌ Error sending email:', error)
        return false
    }
}

/**
 * Send registration confirmation email to jobseeker
 */
export const sendJobseekerRegistrationEmail = (jobseekerData) => {
    return sendEmail('JOBSEEKER_REGISTRATION', jobseekerData)
}

/**
 * Send verification approved email to jobseeker
 */
export const sendJobseekerVerifiedEmail = (jobseekerData) => {
    return sendEmail('JOBSEEKER_VERIFIED', jobseekerData)
}

/**
 * Send rejection email to jobseeker
 */
export const sendJobseekerRejectedEmail = (jobseekerData) => {
    return sendEmail('JOBSEEKER_REJECTED', jobseekerData)
}

/**
 * Send registration confirmation email to employer
 */
export const sendEmployerRegistrationEmail = (employerData) => {
    return sendEmail('EMPLOYER_REGISTRATION', employerData)
}

/**
 * Send approval email to employer
 */
export const sendEmployerApprovedEmail = (employerData) => {
    return sendEmail('EMPLOYER_APPROVED', employerData)
}

/**
 * Send rejection email to employer
 */
export const sendEmployerRejectedEmail = (employerData) => {
    return sendEmail('EMPLOYER_REJECTED', employerData)
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
