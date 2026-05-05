// Email Service for PESO Connect.
// The browser can request named templates only; HTML is rendered server-side.

import { supabase } from '../config/supabase'

const EMAIL_ENABLED = import.meta.env.VITE_EMAIL_NOTIFICATIONS_ENABLED === 'true'

const sendTemplatedEmail = async (templateType, data = {}) => {
    if (!EMAIL_ENABLED) {
        console.log('Email notifications disabled. Would send:', templateType, data.email || data.to)
        return false
    }

    try {
        const { error } = await supabase.functions.invoke('send-notification-email', {
            body: { type: 'template', templateType, data },
        })

        if (error) {
            console.error('Edge function error:', error)
            return false
        }

        return true
    } catch (error) {
        console.error('Error sending email:', error)
        return false
    }
}

export const sendJobseekerRegistrationEmail = (data) =>
    sendTemplatedEmail('JOBSEEKER_REGISTRATION', data)

export const sendJobseekerVerifiedEmail = (data) =>
    sendTemplatedEmail('JOBSEEKER_VERIFIED', data)

export const sendJobseekerRejectedEmail = (data) =>
    sendTemplatedEmail('JOBSEEKER_REJECTED', data)

export const sendEmployerRegistrationEmail = (data) =>
    sendTemplatedEmail('EMPLOYER_REGISTRATION', data)

export const sendEmployerApprovedEmail = (data) =>
    sendTemplatedEmail('EMPLOYER_APPROVED', data)

export const sendEmployerRejectedEmail = (data) =>
    sendTemplatedEmail('EMPLOYER_REJECTED', data)

export const sendApplicationReceivedEmail = (applicantEmail, applicantName, jobTitle) =>
    sendTemplatedEmail('APPLICATION_RECEIVED', {
        email: applicantEmail,
        applicant_name: applicantName,
        job_title: jobTitle,
    })

export const sendNewApplicantEmail = (employerEmail, employerName, applicantName, jobTitle) =>
    sendTemplatedEmail('NEW_APPLICANT', {
        email: employerEmail,
        employer_name: employerName,
        applicant_name: applicantName,
        job_title: jobTitle,
    })

export const sendApplicationStatusEmail = (applicantEmail, applicantName, jobTitle, newStatus, employerName) =>
    sendTemplatedEmail('APPLICATION_STATUS', {
        email: applicantEmail,
        applicant_name: applicantName,
        job_title: jobTitle,
        status: newStatus,
        employer_name: employerName,
    })

export const sendEmail = async (templateType, data) => {
    const supportedTemplates = new Set([
        'JOBSEEKER_REGISTRATION',
        'JOBSEEKER_VERIFIED',
        'JOBSEEKER_REJECTED',
        'EMPLOYER_REGISTRATION',
        'EMPLOYER_APPROVED',
        'EMPLOYER_REJECTED',
    ])

    if (!supportedTemplates.has(templateType)) {
        console.error('Invalid email template type:', templateType)
        return false
    }

    return sendTemplatedEmail(templateType, data)
}

export default {
    sendEmail,
    sendJobseekerRegistrationEmail,
    sendJobseekerVerifiedEmail,
    sendJobseekerRejectedEmail,
    sendEmployerRegistrationEmail,
    sendEmployerApprovedEmail,
    sendEmployerRejectedEmail,
    sendApplicationReceivedEmail,
    sendNewApplicantEmail,
    sendApplicationStatusEmail,
}
