// Reusable form validators for PESO Connect

export const validators = {
    required: (value, fieldName = 'This field') => {
        if (value === null || value === undefined) return `${fieldName} is required`
        if (typeof value === 'string' && !value.trim()) return `${fieldName} is required`
        if (Array.isArray(value) && value.length === 0) return `${fieldName} is required`
        return null
    },

    email: (value) => {
        if (!value) return null // Use required() separately for presence check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) return 'Please enter a valid email address'
        return null
    },

    phone: (value) => {
        if (!value) return null
        // Philippine phone number format: 09XXXXXXXXX or +639XXXXXXXXX
        const cleaned = value.replace(/[\s\-()]/g, '')
        const phoneRegex = /^(\+?63|0)9\d{9}$/
        if (!phoneRegex.test(cleaned)) return 'Please enter a valid phone number (e.g. 09171234567)'
        return null
    },

    minLength: (value, min, fieldName = 'This field') => {
        if (!value) return null
        if (value.length < min) return `${fieldName} must be at least ${min} characters`
        return null
    },

    maxLength: (value, max, fieldName = 'This field') => {
        if (!value) return null
        if (value.length > max) return `${fieldName} must be at most ${max} characters`
        return null
    },

    passwordStrength: (password) => {
        if (!password) return { score: 0, label: '', color: '' }

        let score = 0
        if (password.length >= 8) score++
        if (password.length >= 12) score++
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
        if (/\d/.test(password)) score++
        if (/[^a-zA-Z\d]/.test(password)) score++

        const levels = [
            { label: 'Very Weak', color: 'bg-red-500', textColor: 'text-red-600' },
            { label: 'Weak', color: 'bg-orange-500', textColor: 'text-orange-600' },
            { label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
            { label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-600' },
            { label: 'Strong', color: 'bg-green-500', textColor: 'text-green-600' },
        ]

        return { score, ...levels[Math.min(score, levels.length) - 1] || levels[0] }
    },

    passwordMatch: (password, confirmPassword) => {
        if (!confirmPassword) return null
        if (password !== confirmPassword) return 'Passwords do not match'
        return null
    },

    fileSize: (file, maxSizeMB = 5) => {
        if (!file) return null
        if (file.size > maxSizeMB * 1024 * 1024) {
            return `File must be under ${maxSizeMB}MB`
        }
        return null
    },

    fileType: (file, allowedTypes, friendlyLabel = '') => {
        if (!file) return null
        if (!allowedTypes.includes(file.type)) {
            return friendlyLabel
                ? `File must be ${friendlyLabel}`
                : `Invalid file type. Allowed: ${allowedTypes.join(', ')}`
        }
        return null
    },

    salaryRange: (min, max) => {
        const errors = {}
        const minNum = Number(min)
        const maxNum = Number(max)

        if (min && (isNaN(minNum) || minNum < 0)) {
            errors.min = 'Minimum salary must be a positive number'
        }
        if (max && (isNaN(maxNum) || maxNum < 0)) {
            errors.max = 'Maximum salary must be a positive number'
        }
        if (min && max && !isNaN(minNum) && !isNaN(maxNum) && maxNum < minNum) {
            errors.max = 'Maximum salary must be greater than minimum'
        }
        if (min && max && !isNaN(minNum) && !isNaN(maxNum) && maxNum > 0 && minNum > 0) {
            if (maxNum / minNum > 10) {
                errors.max = 'Salary range seems too wide. Please verify.'
            }
        }

        return Object.keys(errors).length > 0 ? errors : null
    },

    url: (value) => {
        if (!value) return null
        try {
            new URL(value)
            return null
        } catch {
            return 'Please enter a valid URL (e.g. https://example.com)'
        }
    },

    date: (value, { minDate, maxDate } = {}) => {
        if (!value) return null
        const d = new Date(value)
        if (isNaN(d.getTime())) return 'Please enter a valid date'
        if (minDate && d < new Date(minDate)) return `Date must be after ${minDate}`
        if (maxDate && d > new Date(maxDate)) return `Date must be before ${maxDate}`
        return null
    },

    age: (dateOfBirth, minAge = 15) => {
        if (!dateOfBirth) return null
        const today = new Date()
        const birth = new Date(dateOfBirth)
        let age = today.getFullYear() - birth.getFullYear()
        const monthDiff = today.getMonth() - birth.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--
        }
        if (age < minAge) return `Must be at least ${minAge} years old`
        return null
    },

    conditionalRequired: (value, condition, fieldName) => {
        if (condition && (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === ''))) {
            return `${fieldName} is required`
        }
        return null
    },

    atLeastOneLocation: (localLocations, overseasLocations) => {
        const hasLocal = localLocations && localLocations.some(l => l && l.trim() !== '')
        const hasOverseas = overseasLocations && overseasLocations.some(l => l && l.trim() !== '')
        if (!hasLocal && !hasOverseas) return 'At least one preferred work location is required'
        return null
    },

    atLeastOneSkill: (predefinedSkills, customSkills) => {
        const hasPredefined = predefinedSkills && predefinedSkills.length > 0
        const hasCustom = customSkills && customSkills.length > 0
        if (!hasPredefined && !hasCustom) return 'At least one skill is required'
        return null
    },

    atLeastOneOccupation: (occupations) => {
        const hasOne = occupations && occupations.some(o => o && o.trim() !== '')
        if (!hasOne) return 'At least one preferred occupation is required'
        return null
    },
}

/**
 * Validate multiple fields at once.
 * @param {Object} rules - { fieldName: [validator1Result, validator2Result, ...] }
 * @returns {Object} errors - { fieldName: 'first error message' } for fields with errors
 */
export const validateFields = (rules) => {
    const errors = {}
    for (const [field, validations] of Object.entries(rules)) {
        for (const result of validations) {
            if (result) {
                errors[field] = result
                break // Take the first error for each field
            }
        }
    }
    return Object.keys(errors).length > 0 ? errors : null
}

/**
 * Hook-like helper: run a single field's validation and return the error.
 */
export const getFieldError = (value, ...validatorResults) => {
    for (const result of validatorResults) {
        if (result) return result
    }
    return null
}
