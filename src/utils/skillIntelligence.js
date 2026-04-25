// Keep in sync with supabase/functions/suggest-job-skills/index.ts

export const SKILL_COMPANIONS = {
    // Agriculture
    'Crop Management': {
        required: ['Soil Testing', 'Irrigation'],
        preferred: ['Pest Control', 'Farm Record Keeping', 'Fertilizer Application'],
    },
    'Livestock Care': {
        required: ['Animal Husbandry', 'Veterinary Assistance'],
        preferred: ['Farm Record Keeping', 'Farm Safety', 'Poultry Management'],
    },
    'Irrigation': {
        required: ['Irrigation System Maintenance', 'Farm Equipment Operation'],
        preferred: ['Soil Testing', 'Crop Management', 'GPS Field Mapping'],
    },
    'Organic Farming': {
        required: ['Composting', 'Soil Testing'],
        preferred: ['Vermicomposting', 'Pest Control', 'Farm Record Keeping'],
    },
    'Rice Farming': {
        required: ['Irrigation', 'Harvesting'],
        preferred: ['Farm Equipment Operation', 'Post-Harvest Handling', 'Tractor Operation'],
    },
    'Aquaculture': {
        required: ['Fishpond Management', 'Post-Harvest Handling'],
        preferred: ['Farm Record Keeping', 'Cold Storage Handling', 'Agri Supply Management'],
    },
    'Tractor Operation': {
        required: ['Farm Equipment Operation', 'Farm Safety'],
        preferred: ['Crop Management', 'Harvesting', 'Irrigation'],
    },
    'Post-Harvest Handling': {
        required: ['Cold Storage Handling', 'Farm Record Keeping'],
        preferred: ['Crop Management', 'Agri Supply Management', 'Food Safety'],
    },
    // Energy
    'Electrical Installation': {
        required: ['Electrical Wiring', 'Electrical Safety'],
        preferred: ['Electrical Blueprint Reading', 'Grounding Systems', 'Low Voltage Systems'],
    },
    'PLC Programming': {
        required: ['SCADA Systems', 'Control Panel Operation'],
        preferred: ['Electrical Safety', 'Industrial Wiring', 'Load Dispatch'],
    },
    'Solar Panel Installation': {
        required: ['Electrical Wiring', 'Electrical Safety'],
        preferred: ['Inverter Installation', 'Battery Storage Systems', 'Net Metering'],
    },
    'SCADA Systems': {
        required: ['PLC Programming', 'Control Panel Operation'],
        preferred: ['Load Dispatch', 'Substation Operation', 'High Voltage Systems'],
    },
    'High Voltage Systems': {
        required: ['Electrical Safety', 'Arc Flash Safety'],
        preferred: ['Grounding Systems', 'Relay Protection', 'Medium Voltage Systems'],
    },
    'Transformer Maintenance': {
        required: ['Electrical Safety', 'High Voltage Systems'],
        preferred: ['Oil Analysis', 'Infrared Thermography', 'Relay Protection'],
    },
    'Energy Auditing': {
        required: ['Energy Efficiency Assessment', 'Power Quality Analysis'],
        preferred: ['Load Flow Analysis', 'Power Factor Correction', 'Electrical Inspection'],
    },
    'Lineman Work': {
        required: ['Power Line Maintenance', 'Electrical Safety'],
        preferred: ['High Voltage Systems', 'Arc Flash Safety', 'Distribution Line Construction'],
    },
    // Retail
    'Customer Service': {
        required: ['Customer Complaint Handling', 'POS Operation'],
        preferred: ['Customer Loyalty Programs', 'Customer Feedback Collection', 'Upselling'],
    },
    'Sales': {
        required: ['Customer Service', 'Product Knowledge'],
        preferred: ['Upselling', 'Cross-selling', 'Sales Reporting', 'KPI Tracking'],
    },
    'Inventory Management': {
        required: ['Stock Management', 'Shelf Replenishment'],
        preferred: ['Purchase Ordering', 'Barcode Scanning', 'Retail Analytics'],
    },
    'Team Supervision': {
        required: ['KPI Tracking', 'Retail SOPs'],
        preferred: ['Floor Supervision', 'End-of-Day Reporting', 'Store Opening/Closing'],
    },
    'Visual Merchandising': {
        required: ['Merchandising', 'Planogramming'],
        preferred: ['Store Layout Planning', 'Promotional Display Setup'],
    },
    'E-commerce Management': {
        required: ['Online Order Fulfillment', 'Inventory Management'],
        preferred: ['Retail Analytics', 'Delivery Coordination', 'Logistics Coordination'],
    },
    'Cashiering': {
        required: ['Cash Handling', 'POS Operation'],
        preferred: ['Cashier Balancing', 'Credit Card Processing', 'Returns Processing'],
    },
    'Loss Prevention': {
        required: ['Shrinkage Control', 'Safety Compliance'],
        preferred: ['Inventory Management', 'Store Opening/Closing', 'Floor Supervision'],
    },
    // IT
    'Web Development': {
        required: ['HTML/CSS', 'JavaScript'],
        preferred: ['Git Version Control', 'API Development', 'React'],
    },
    'React': {
        required: ['JavaScript', 'HTML/CSS'],
        preferred: ['TypeScript', 'Git Version Control', 'Node.js'],
    },
    'Node.js': {
        required: ['JavaScript', 'API Development'],
        preferred: ['Database Management', 'Git Version Control', 'Docker'],
    },
    'DevOps': {
        required: ['Docker', 'Git Version Control'],
        preferred: ['Kubernetes', 'AWS', 'Agile/Scrum'],
    },
    'Network Setup': {
        required: ['Networking (LAN/WAN)', 'Technical Support'],
        preferred: ['Server Administration', 'Active Directory', 'VPN Configuration'],
    },
    'Server Administration': {
        required: ['System Administration', 'Backup and Recovery'],
        preferred: ['Active Directory', 'Cloud Computing', 'Firewall Management'],
    },
    'Data Analysis': {
        required: ['SQL', 'MS Office'],
        preferred: ['Power BI', 'Python', 'Data Entry'],
    },
    'IT Project Management': {
        required: ['Agile/Scrum', 'Technical Documentation'],
        preferred: ['ERP Systems', 'IT Asset Management', 'CRM Software'],
    },
    'Cybersecurity Basics': {
        required: ['Firewall Management', 'Backup and Recovery'],
        preferred: ['VPN Configuration', 'Server Administration', 'System Administration'],
    },
    'Mobile App Development': {
        required: ['Android Development', 'JavaScript'],
        preferred: ['iOS Development', 'API Development', 'Git Version Control'],
    },
    // Trades
    'Welding': {
        required: ['Blueprint Reading', 'Steel Fabrication'],
        preferred: ['Safety Officer', 'TESDA NC II', 'Pipe Fitting'],
    },
    'Plumbing': {
        required: ['Pipe Fitting', 'Sanitary Installation'],
        preferred: ['Blueprint Reading', 'TESDA NC II', 'Safety Officer'],
    },
    'Carpentry': {
        required: ['Blueprint Reading', 'Ceiling Installation'],
        preferred: ['Safety Officer', 'TESDA NC II', 'Formwork'],
    },
    'Masonry': {
        required: ['Concrete Pouring', 'Rebar Installation'],
        preferred: ['Blueprint Reading', 'Site Supervision', 'Safety Officer'],
    },
    'HVAC': {
        required: ['AC Installation', 'Refrigeration'],
        preferred: ['Electrical Work', 'Safety Officer', 'TESDA NC II'],
    },
    'Auto Repair': {
        required: ['Engine Overhaul', 'Electrical Work'],
        preferred: ['Auto Body Repair', 'Transmission Repair', 'Auto Painting'],
    },
    'Site Supervision': {
        required: ['Blueprint Reading', 'Construction Estimation'],
        preferred: ['Safety Officer', 'Heavy Equipment Operation'],
    },
    'Electrical Work': {
        required: ['Electrical Wiring', 'Blueprint Reading'],
        preferred: ['Safety Officer', 'TESDA NC II'],
    },
    'Heavy Equipment Operation': {
        required: ['Safety Officer', 'Forklift Operation'],
        preferred: ['Crane Operation', 'Scaffolding', 'TESDA NC II'],
    },
    // Hospitality
    'Cooking': {
        required: ['Food Preparation', 'Food Safety'],
        preferred: ['Kitchen Management', 'HACCP Compliance', 'Menu Planning'],
    },
    'Food Safety': {
        required: ['HACCP Compliance', 'Safety & Sanitation'],
        preferred: ['Kitchen Management', 'Waste Management', 'Food Cost Control'],
    },
    'Restaurant Management': {
        required: ['Food Cost Control', 'Staff Scheduling'],
        preferred: ['Kitchen Management', 'Inventory Management (F&B)', 'POS for Restaurants'],
    },
    'Front Desk': {
        required: ['Guest Relations', 'Reservation Management'],
        preferred: ['Check-in/Check-out Processing', 'Property Management System (PMS)', 'Customer Service Excellence'],
    },
    'Bartending': {
        required: ['Beverage Management', 'Customer Service Excellence'],
        preferred: ['Upselling (F&B)', 'Wine Service', 'Sommelier'],
    },
    'Event Planning': {
        required: ['Banquet Coordination', 'Catering'],
        preferred: ['Banquet Service', 'Guest Relations', 'Staff Scheduling'],
    },
    'Kitchen Management': {
        required: ['Food Safety', 'HACCP Compliance'],
        preferred: ['Food Cost Control', 'Staff Scheduling', 'Menu Planning'],
    },
    'Housekeeping': {
        required: ['Laundry Operations', 'Safety & Sanitation'],
        preferred: ['Housekeeping Supervision', 'Waste Management', 'Room Service'],
    },
    'Baking': {
        required: ['Food Safety', 'Pastry Making'],
        preferred: ['Cake Decorating', 'Food Cost Control', 'HACCP Compliance'],
    },
}

// Skills tagged mid or senior — untagged defaults to entry behavior
export const SKILL_TIERS = {
    // Senior — supervisory, complex engineering, strategic
    'Site Supervision': 'senior',
    'Construction Estimation': 'senior',
    'Agri-Business Management': 'senior',
    'Cooperative Management': 'senior',
    'Agricultural Extension': 'senior',
    'Energy Auditing': 'senior',
    'Load Flow Analysis': 'senior',
    'Load Dispatch': 'senior',
    'Substation Operation': 'senior',
    'High Voltage Systems': 'senior',
    'Restaurant Management': 'senior',
    'Kitchen Management': 'senior',
    'Hotel Operations': 'senior',
    'Team Supervision': 'senior',
    'IT Project Management': 'senior',
    'Floor Supervision': 'senior',
    'Retail Analytics': 'mid',
    // Mid — technical, intermediate
    'PLC Programming': 'mid',
    'SCADA Systems': 'mid',
    'Energy Efficiency Assessment': 'mid',
    'Power Quality Analysis': 'mid',
    'Transformer Maintenance': 'mid',
    'HACCP Compliance': 'mid',
    'Food Cost Control': 'mid',
    'Property Management System (PMS)': 'mid',
    'Housekeeping Supervision': 'mid',
    'KPI Tracking': 'mid',
    'Server Administration': 'mid',
    'System Administration': 'mid',
    'Cloud Computing': 'mid',
    'DevOps': 'mid',
    'Agile/Scrum': 'mid',
    'Cybersecurity Basics': 'mid',
    'Relay Protection': 'senior',
    'Power Factor Correction': 'mid',
    'Arc Flash Safety': 'mid',
    'High Voltage Systems': 'senior',
    'Sales Reporting': 'mid',
    'Staff Scheduling': 'mid',
    'Inventory Management (F&B)': 'mid',
    'Beverage Management': 'mid',
}

export const CROSS_CATEGORY_TRIGGERS = [
    {
        match: /\b(manager|supervisor|head|lead)\b/i,
        pullFrom: ['retail'],
        skills: ['Team Supervision', 'KPI Tracking', 'Floor Supervision', 'End-of-Day Reporting'],
    },
    {
        match: /\btechnician\b/i,
        whenPrimary: ['agriculture', 'energy'],
        pullFrom: ['trades'],
        skills: ['Blueprint Reading', 'Safety Officer'],
    },
    {
        match: /\b(it|software|systems)\b.*\b(manager|lead)\b/i,
        pullFrom: ['it'],
        skills: ['IT Project Management', 'Agile/Scrum', 'Technical Documentation'],
    },
    {
        match: /\brestaurant\b/i,
        whenPrimary: ['hospitality'],
        pullFrom: ['retail'],
        skills: ['Team Supervision', 'KPI Tracking', 'Staff Scheduling'],
    },
    {
        match: /\b(farm|agri)\b.*\b(manager|supervisor|head)\b/i,
        whenPrimary: ['agriculture'],
        pullFrom: ['agriculture'],
        skills: ['Agri-Business Management', 'Farm Record Keeping', 'Agri Supply Management'],
    },
    {
        match: /\b(solar|renewable|energy)\b.*\b(engineer|specialist)\b/i,
        whenPrimary: ['energy'],
        pullFrom: ['trades'],
        skills: ['Electrical Blueprint Reading', 'Grounding Systems'],
    },
]

export const SKILL_FAMILIES = {
    'Welding': ['Welding', 'Arc Welding', 'MIG Welding', 'TIG Welding', 'Gas Welding'],
    'Farming': ['Farming', 'Rice Farming', 'Corn Farming', 'Vegetable Growing', 'Fruit Farming', 'Organic Farming'],
    'Electrical Work': ['Electrical Work', 'Electrical Installation', 'Electrical Wiring', 'Industrial Wiring'],
    'Web Development': ['Web Development', 'React', 'Vue.js', 'Node.js'],
    'Masonry': ['Masonry', 'Concrete Pouring', 'Concrete Block Laying', 'Stone Masonry'],
    'Livestock Care': ['Livestock Care', 'Poultry Management', 'Swine Production', 'Cattle Raising', 'Animal Husbandry', 'Dairy Farming'],
    'TESDA NC': ['TESDA NC I', 'TESDA NC II', 'TESDA NC III'],
    'Mobile App Development': ['Mobile App Development', 'Android Development', 'iOS Development'],
    'Plumbing': ['Plumbing', 'Pipe Fitting', 'Sanitary Installation'],
    'Auto Repair': ['Auto Repair', 'Auto Body Repair', 'Engine Overhaul', 'Transmission Repair', 'Motorcycle Repair'],
}

// Maps EXPERIENCE_LEVELS values from PostJob to tier order
const LEVEL_ORDER = { entry: 0, mid: 1, senior: 2 }

function jobLevelToTier(experienceLevel) {
    if (!experienceLevel) return 'senior' // unknown → show everything
    if (experienceLevel === 'entry') return 'entry'
    if (experienceLevel === '5+') return 'senior'
    return 'mid' // '1-3' and '3-5'
}

export function filterByExperienceLevel(skills, level) {
    if (!level) return skills
    const maxTier = LEVEL_ORDER[jobLevelToTier(level)] ?? 2

    const filtered = skills.filter(skill => {
        const tier = SKILL_TIERS[skill]
        if (!tier) return true // untagged = entry, always allowed
        return LEVEL_ORDER[tier] <= maxTier
    })

    // Fallback: avoid empty panel due to aggressive filtering
    return filtered.length >= 3 ? filtered : skills
}

export function getCompanionSuggestions(requiredSkills, _category) {
    if (!requiredSkills || requiredSkills.length === 0) return []
    const seen = new Set()
    const result = []
    for (const skill of requiredSkills) {
        const companions = SKILL_COMPANIONS[skill]?.required || []
        for (const c of companions) {
            if (!seen.has(c)) {
                seen.add(c)
                result.push(c)
            }
        }
    }
    return result
}

export function deduplicateSkillFamilies(candidates, existingSkills) {
    const existing = new Set(existingSkills || [])
    const suppressedFamilyMembers = new Set()

    // For each canonical family, if any member is in existingSkills, suppress all other members
    for (const [, members] of Object.entries(SKILL_FAMILIES)) {
        if (members.some(m => existing.has(m))) {
            members.forEach(m => suppressedFamilyMembers.add(m))
        }
    }

    return candidates.filter(s => !suppressedFamilyMembers.has(s))
}

export function getCrossCategorySkills(title, primaryCategory) {
    if (!title) return []
    const result = new Set()
    for (const trigger of CROSS_CATEGORY_TRIGGERS) {
        if (!trigger.match.test(title)) continue
        if (trigger.whenPrimary && !trigger.whenPrimary.includes(primaryCategory)) continue
        trigger.skills.forEach(s => result.add(s))
    }
    return [...result]
}

export function getSmartPreferredSuggestions(requiredSkills, { category, experienceLevel, existingPreferred } = {}) {
    if (!requiredSkills || requiredSkills.length === 0) return []

    const requiredSet = new Set(requiredSkills)
    const preferredSet = new Set(existingPreferred || [])
    const complementCounts = new Map() // skill → count of required skills it complements
    const skillSources = new Map() // skill → [required skills that suggest it]

    for (const req of requiredSkills) {
        const companions = SKILL_COMPANIONS[req]?.preferred || []
        for (const comp of companions) {
            if (requiredSet.has(comp) || preferredSet.has(comp)) continue
            complementCounts.set(comp, (complementCounts.get(comp) || 0) + 1)
            if (!skillSources.has(comp)) skillSources.set(comp, [])
            skillSources.get(comp).push(req)
        }
    }

    if (complementCounts.size === 0) return []

    let candidates = [...complementCounts.keys()]
    candidates = deduplicateSkillFamilies(candidates, requiredSkills)
    candidates = filterByExperienceLevel(candidates, experienceLevel)

    return candidates
        .sort((a, b) => (complementCounts.get(b) || 0) - (complementCounts.get(a) || 0))
        .map(skill => ({
            skill,
            reason: 'Pairs with ' + (skillSources.get(skill) || []).join(', '),
            complementCount: complementCounts.get(skill) || 1,
        }))
}
