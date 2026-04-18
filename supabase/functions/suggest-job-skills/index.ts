import { handleCorsPreflightRequest, jsonResponse } from '../_shared/cors.ts'

interface SuggestJobSkillsRequest {
    title?: string
    category?: string
    jobSummary?: string
    keyResponsibilities?: string
    existingSkills?: string[]
}

// Skill vocabulary mirrored from jobSkillRecommender.js
const SKILL_VOCAB: Record<string, string[]> = {
    agriculture: [
        'Farming', 'Livestock Care', 'Crop Management', 'Irrigation', 'Harvesting',
        'Organic Farming', 'Pest Control', 'Farm Equipment Operation', 'Soil Testing',
        'Composting', 'Aquaculture', 'Poultry Management', 'Swine Production',
        'Cattle Raising', 'Crop Rotation', 'Greenhouse Management', 'Seed Selection',
        'Fertilizer Application', 'Herbicide Application', 'Veterinary Assistance',
        'Fishpond Management', 'Rice Farming', 'Corn Farming', 'Vegetable Growing',
        'Fruit Farming', 'Agri-Business Management', 'Farm Record Keeping',
        'Post-Harvest Handling', 'Irrigation System Maintenance', 'Tractor Operation',
        'Pruning', 'Grafting', 'Hydroponics', 'Vermicomposting',
        'Animal Husbandry', 'Dairy Farming', 'Beekeeping', 'Mushroom Cultivation',
        'Agricultural Extension', 'Farm Safety', 'Crop Disease Identification',
        'Weather Monitoring', 'Agri Supply Management', 'Cooperative Management',
        'Cold Storage Handling',
    ],
    energy: [
        'Electrical Installation', 'Solar Panel Installation', 'Power Line Maintenance',
        'Generator Operation', 'Meter Reading', 'Energy Auditing', 'Transformer Maintenance',
        'Substation Operation', 'Load Dispatch', 'Cable Splicing', 'Lineman Work',
        'Battery Storage Systems', 'Wind Turbine Maintenance', 'Electrical Wiring',
        'Control Panel Operation', 'PLC Programming', 'SCADA Systems',
        'Electrical Safety', 'Arc Flash Safety', 'High Voltage Systems',
        'Grounding Systems', 'Electrical Blueprint Reading', 'Energy Efficiency Assessment',
        'Power Quality Analysis', 'Renewable Energy Systems', 'Biogas Systems',
        'Diesel Generator Maintenance', 'UPS Maintenance', 'Inverter Installation',
        'Net Metering', 'Low Voltage Systems', 'Medium Voltage Systems',
        'Distribution Line Construction', 'Smart Grid Systems', 'LED Lighting Systems',
        'Power Factor Correction', 'Relay Protection', 'Metering Systems',
        'Electrical Inspection', 'Industrial Wiring',
    ],
    retail: [
        'Customer Service', 'Sales', 'Inventory Management', 'Cashiering',
        'Visual Merchandising', 'Stock Management', 'POS Operation', 'Upselling',
        'Cross-selling', 'Product Knowledge', 'Store Opening/Closing', 'Cash Handling',
        'Credit Card Processing', 'Loss Prevention', 'Merchandising', 'Planogramming',
        'Customer Complaint Handling', 'Returns Processing', 'Shelf Replenishment',
        'Price Tagging', 'Barcode Scanning', 'Sales Reporting', 'KPI Tracking',
        'Store Layout Planning', 'Retail Analytics', 'E-commerce Management',
        'Online Order Fulfillment', 'Vendor Relations', 'Purchase Ordering',
        'Logistics Coordination', 'Delivery Coordination', 'Customer Loyalty Programs',
        'Promotional Display Setup', 'Team Supervision', 'Cashier Balancing',
        'End-of-Day Reporting', 'Shrinkage Control', 'Queue Management',
        'Discount Management', 'Supplier Coordination', 'Floor Supervision',
        'Retail SOPs', 'Customer Feedback Collection',
    ],
    it: [
        'Computer Repair', 'Network Setup', 'Web Development', 'Data Entry',
        'MS Office', 'Technical Support', 'Database Management', 'IT Helpdesk',
        'Software Installation', 'Hardware Troubleshooting', 'Networking (LAN/WAN)',
        'Cybersecurity Basics', 'Server Administration', 'Cloud Computing',
        'System Administration', 'Active Directory', 'VPN Configuration',
        'Firewall Management', 'Backup and Recovery', 'IT Asset Management',
        'Mobile App Development', 'iOS Development', 'Android Development',
        'React', 'Vue.js', 'Node.js', 'Python', 'Java', 'PHP', 'SQL',
        'HTML/CSS', 'JavaScript', 'TypeScript', 'API Development',
        'DevOps', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud',
        'Git Version Control', 'Agile/Scrum', 'IT Project Management',
        'CCTV Installation', 'Structured Cabling', 'Wi-Fi Setup',
        'ERP Systems', 'CRM Software', 'Data Analysis', 'Power BI',
        'Technical Documentation', 'QA Testing', 'Software Testing',
    ],
    trades: [
        'Plumbing', 'Electrical Work', 'Carpentry', 'Welding', 'Masonry',
        'Painting', 'HVAC', 'Auto Repair', 'Motorcycle Repair', 'Tile Setting',
        'Steel Fabrication', 'Roofing', 'Waterproofing', 'Scaffolding',
        'Concrete Pouring', 'Rebar Installation', 'Formwork', 'Excavation',
        'Heavy Equipment Operation', 'Forklift Operation', 'Crane Operation',
        'Blueprint Reading', 'Construction Estimation', 'Site Supervision',
        'Safety Officer', 'TESDA NC I', 'TESDA NC II', 'TESDA NC III',
        'Arc Welding', 'MIG Welding', 'TIG Welding', 'Gas Welding',
        'Pipe Fitting', 'Sheet Metal Work', 'Upholstery', 'Glazing',
        'Floor Installation', 'Ceiling Installation', 'Drywall Installation',
        'Concrete Block Laying', 'Auto Painting', 'Auto Body Repair',
        'Engine Overhaul', 'Transmission Repair', 'AC Installation',
        'Refrigeration', 'Boiler Operation', 'Pump Installation',
        'Fire Suppression Systems', 'Sanitary Installation',
    ],
    hospitality: [
        'Cooking', 'Baking', 'Food Preparation', 'Bartending', 'Housekeeping',
        'Front Desk', 'Event Planning', 'Guest Relations', 'Concierge Services',
        'Room Service', 'Restaurant Service', 'Food & Beverage Service',
        'Menu Planning', 'Catering', 'Banquet Service', 'Barista',
        'Coffee Brewing', 'Pastry Making', 'Cake Decorating', 'Food Safety',
        'HACCP Compliance', 'Kitchen Management', 'Restaurant Management',
        'Hotel Operations', 'Property Management System (PMS)', 'Reservation Management',
        'Check-in/Check-out Processing', 'Housekeeping Supervision', 'Laundry Operations',
        'Spa Services', 'Massage Therapy', 'Tour Guiding', 'Travel Coordination',
        'Ticketing', 'Customer Service Excellence', 'Complaint Resolution',
        'Inventory Management (F&B)', 'Beverage Management', 'Wine Service',
        'Sommelier', 'Table Setting', 'Buffet Setup', 'Banquet Coordination',
        'Safety & Sanitation', 'Waste Management', 'Food Cost Control',
        'Staff Scheduling', 'POS for Restaurants',
    ],
}

interface ScoredSkill {
    skill: string
    score: number
}

function scoreSkill(skill: string, fullText: string): number {
    const skillLower = skill.toLowerCase()
    const textLower = fullText.toLowerCase()
    let score = 0

    // Exact match in text
    if (textLower.includes(skillLower)) {
        score += 3
    }

    // Partial word match (handles compound skills)
    const words = skillLower.split(/[\s/()]+/).filter(w => w.length > 2)
    for (const word of words) {
        if (textLower.includes(word)) score += 1
    }

    return score
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return handleCorsPreflightRequest()

    try {
        const body: SuggestJobSkillsRequest = await req.json()
        const {
            title = '',
            category = '',
            jobSummary = '',
            keyResponsibilities = '',
            existingSkills = [],
        } = body

        const fullText = [title, jobSummary, keyResponsibilities].join(' ')
        const categorySkills: string[] = SKILL_VOCAB[category] || Object.values(SKILL_VOCAB).flat()
        const existingSet = new Set(existingSkills.map((s: string) => s.toLowerCase()))

        const scored: ScoredSkill[] = categorySkills
            .filter(skill => !existingSet.has(skill.toLowerCase()))
            .map(skill => ({ skill, score: scoreSkill(skill, fullText) }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)

        const suggestions = scored.slice(0, 12).map(({ skill, score }) => ({
            skill,
            confidence: Math.min(1, score / 5),
        }))

        return jsonResponse({ suggestions })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return jsonResponse({ error: message }, { status: 400 })
    }
})
