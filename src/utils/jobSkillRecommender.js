// Skill vocabulary mirroring SKILL_CATEGORIES in PostJob.jsx.
// Used by both the deterministic suggester and the edge function.
export const SKILL_VOCAB = {
    agriculture: [
        'Farming', 'Livestock Care', 'Crop Management', 'Irrigation', 'Harvesting',
        'Organic Farming', 'Pest Control', 'Farm Equipment Operation', 'Soil Testing',
        'Composting', 'Aquaculture', 'Poultry Management', 'Swine Production',
        'Cattle Raising', 'Crop Rotation', 'Greenhouse Management', 'Seed Selection',
        'Fertilizer Application', 'Herbicide Application', 'Veterinary Assistance',
        'Fishpond Management', 'Rice Farming', 'Corn Farming', 'Vegetable Growing',
        'Fruit Farming', 'Agri-Business Management', 'Farm Record Keeping',
        'Post-Harvest Handling', 'Irrigation System Maintenance', 'Tractor Operation',
        'Chainsaw Operation', 'Pruning', 'Grafting', 'Hydroponics', 'Vermicomposting',
        'Animal Husbandry', 'Dairy Farming', 'Beekeeping', 'Mushroom Cultivation',
        'Agricultural Extension', 'Farm Safety', 'Crop Disease Identification',
        'Weather Monitoring', 'Agri-Tourism', 'Agri Supply Management',
        'Cooperative Management', 'Irrigation Mapping', 'GPS Field Mapping',
        'Drone Spraying', 'Cold Storage Handling',
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
        'Net Metering', 'Electrical Permit Processing', 'Load Flow Analysis',
        'AutoCAD Electrical', 'Low Voltage Systems', 'Medium Voltage Systems',
        'Distribution Line Construction', 'Electric Vehicle Charging Installation',
        'Smart Grid Systems', 'LED Lighting Systems', 'Infrared Thermography',
        'Oil Analysis', 'Power Factor Correction', 'Capacitor Bank Installation',
        'Relay Protection', 'Metering Systems', 'DLPC/CENECO Compliance',
        'Electrical Inspection', 'Hazardous Area Wiring', 'Industrial Wiring',
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
        'End-of-Day Reporting', 'SAP Retail', 'Microsoft Dynamics Retail',
        'Shrinkage Control', 'Safety Compliance', 'Store Cleanliness Standards',
        'Queue Management', 'Consumer Behavior Analysis', 'Sales Targets Achievement',
        'Discount Management', 'Supplier Coordination', 'Floor Supervision',
        'Retail SOPs', 'Customer Feedback Collection', 'Product Returns Handling',
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
        'Concrete Block Laying', 'Stone Masonry', 'Auto Painting',
        'Auto Body Repair', 'Engine Overhaul', 'Transmission Repair',
        'AC Installation', 'Refrigeration', 'Boiler Operation', 'Pump Installation',
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
        'Ticketing', 'Food Photography', 'Social Media for F&B',
        'Customer Service Excellence', 'Complaint Resolution', 'Upselling (F&B)',
        'Inventory Management (F&B)', 'Beverage Management', 'Wine Service',
        'Sommelier', 'Table Setting', 'Buffet Setup', 'Banquet Coordination',
        'Safety & Sanitation', 'Waste Management', 'Food Cost Control',
        'Staff Scheduling', 'POS for Restaurants',
    ],
}

// Title keyword patterns per category that map to relevant skills
const TITLE_SKILL_MAP = {
    agriculture: [
        { pattern: /farm(?:er|ing|hand|worker)?/i, skills: ['Farming', 'Farm Equipment Operation', 'Crop Management'] },
        { pattern: /livestock|animal\s*hus/i, skills: ['Livestock Care', 'Animal Husbandry', 'Veterinary Assistance'] },
        { pattern: /crop|plant(?:ation)?/i, skills: ['Crop Management', 'Crop Rotation', 'Pest Control'] },
        { pattern: /irrigation/i, skills: ['Irrigation', 'Irrigation System Maintenance'] },
        { pattern: /harvest/i, skills: ['Harvesting', 'Post-Harvest Handling'] },
        { pattern: /poultry|chicken|layer/i, skills: ['Poultry Management', 'Animal Husbandry', 'Farm Record Keeping'] },
        { pattern: /swine|hog|pig/i, skills: ['Swine Production', 'Animal Husbandry', 'Livestock Care'] },
        { pattern: /dairy|cattle|cow/i, skills: ['Dairy Farming', 'Cattle Raising', 'Animal Husbandry'] },
        { pattern: /aqua|fish(?:ery|pond|man|ing)?/i, skills: ['Aquaculture', 'Fishpond Management'] },
        { pattern: /rice|palay/i, skills: ['Rice Farming', 'Harvesting', 'Irrigation'] },
        { pattern: /vegetable|veggie/i, skills: ['Vegetable Growing', 'Greenhouse Management'] },
        { pattern: /organic/i, skills: ['Organic Farming', 'Composting', 'Soil Testing'] },
        { pattern: /agri(?:cultural)?\s*(?:extension|tech|engineer)/i, skills: ['Agricultural Extension', 'Agri-Business Management', 'Farm Record Keeping'] },
        { pattern: /tractor|equipment\s*operator/i, skills: ['Tractor Operation', 'Farm Equipment Operation', 'Heavy Equipment Operation'] },
        { pattern: /bee\s*keep|apiar/i, skills: ['Beekeeping'] },
        { pattern: /mushroom/i, skills: ['Mushroom Cultivation'] },
        { pattern: /hydropon/i, skills: ['Hydroponics', 'Greenhouse Management'] },
    ],
    energy: [
        { pattern: /electrician|electrical\s*(?:tech|installer|worker)/i, skills: ['Electrical Installation', 'Electrical Wiring', 'Electrical Safety'] },
        { pattern: /solar/i, skills: ['Solar Panel Installation', 'Renewable Energy Systems', 'Battery Storage Systems'] },
        { pattern: /lineman|line(?:man|worker)/i, skills: ['Power Line Maintenance', 'Lineman Work', 'High Voltage Systems'] },
        { pattern: /generator|genset/i, skills: ['Generator Operation', 'Diesel Generator Maintenance'] },
        { pattern: /meter\s*reader/i, skills: ['Meter Reading', 'Metering Systems'] },
        { pattern: /energy\s*audit/i, skills: ['Energy Auditing', 'Energy Efficiency Assessment', 'Power Quality Analysis'] },
        { pattern: /substation|dispatcher|dispatch/i, skills: ['Substation Operation', 'Load Dispatch', 'SCADA Systems'] },
        { pattern: /wind\s*turbine/i, skills: ['Wind Turbine Maintenance', 'Renewable Energy Systems'] },
        { pattern: /battery|ups/i, skills: ['Battery Storage Systems', 'UPS Maintenance'] },
        { pattern: /plc|scada|automation/i, skills: ['PLC Programming', 'SCADA Systems', 'Control Panel Operation'] },
        { pattern: /cable\s*(?:splicer|tech)|splice/i, skills: ['Cable Splicing', 'Electrical Wiring'] },
        { pattern: /power\s*(?:plant|utility|engineer)/i, skills: ['Power Quality Analysis', 'SCADA Systems', 'Electrical Safety'] },
    ],
    retail: [
        { pattern: /cashier|teller/i, skills: ['Cashiering', 'Cash Handling', 'POS Operation'] },
        { pattern: /sales(?:person|man|woman|associate|rep)/i, skills: ['Sales', 'Customer Service', 'Product Knowledge', 'Upselling'] },
        { pattern: /store\s*(?:manager|supervisor|head)/i, skills: ['Store Opening/Closing', 'Team Supervision', 'Inventory Management', 'Retail SOPs'] },
        { pattern: /merchandis/i, skills: ['Visual Merchandising', 'Planogramming', 'Merchandising'] },
        { pattern: /inventory|stock(?:er|ing)?/i, skills: ['Inventory Management', 'Stock Management', 'Shelf Replenishment'] },
        { pattern: /customer\s*service|csr/i, skills: ['Customer Service', 'Customer Complaint Handling', 'Customer Loyalty Programs'] },
        { pattern: /loss\s*prev/i, skills: ['Loss Prevention', 'Shrinkage Control'] },
        { pattern: /e-?comm(?:erce)?/i, skills: ['E-commerce Management', 'Online Order Fulfillment'] },
        { pattern: /buyer|purchasing|procurement/i, skills: ['Purchase Ordering', 'Vendor Relations', 'Supplier Coordination'] },
        { pattern: /promotion|display/i, skills: ['Promotional Display Setup', 'Visual Merchandising'] },
        { pattern: /delivery|logistics/i, skills: ['Delivery Coordination', 'Logistics Coordination', 'Online Order Fulfillment'] },
    ],
    it: [
        { pattern: /web\s*dev|front.?end|back.?end|full.?stack/i, skills: ['Web Development', 'HTML/CSS', 'JavaScript', 'Git Version Control'] },
        { pattern: /react/i, skills: ['React', 'JavaScript', 'HTML/CSS'] },
        { pattern: /node(?:\.js)?/i, skills: ['Node.js', 'JavaScript', 'API Development'] },
        { pattern: /python|django|flask/i, skills: ['Python', 'SQL', 'API Development'] },
        { pattern: /java(?:script)?(?!\s*script)/i, skills: ['Java', 'SQL', 'API Development'] },
        { pattern: /php|laravel|wordpress/i, skills: ['PHP', 'SQL', 'HTML/CSS'] },
        { pattern: /mobile|android|ios/i, skills: ['Mobile App Development', 'Android Development', 'iOS Development'] },
        { pattern: /network|sysad|system\s*admin/i, skills: ['Network Setup', 'Server Administration', 'Active Directory', 'Networking (LAN/WAN)'] },
        { pattern: /helpdesk|it\s*support|tech(?:nical)?\s*support/i, skills: ['IT Helpdesk', 'Technical Support', 'Computer Repair', 'Hardware Troubleshooting'] },
        { pattern: /devops|cloud/i, skills: ['DevOps', 'Docker', 'AWS', 'Git Version Control'] },
        { pattern: /database|sql|dba/i, skills: ['Database Management', 'SQL', 'Backup and Recovery'] },
        { pattern: /data\s*(?:analyst|scientist|engineer)/i, skills: ['Data Analysis', 'SQL', 'Power BI'] },
        { pattern: /security|cyber/i, skills: ['Cybersecurity Basics', 'Firewall Management', 'Backup and Recovery'] },
        { pattern: /qa|quality\s*assur|tester/i, skills: ['QA Testing', 'Software Testing', 'Technical Documentation'] },
        { pattern: /erp|sap|dynamics/i, skills: ['ERP Systems', 'SAP Retail', 'Microsoft Dynamics Retail'] },
        { pattern: /cctv|structured\s*cabling/i, skills: ['CCTV Installation', 'Structured Cabling', 'Network Setup'] },
    ],
    trades: [
        { pattern: /plumb/i, skills: ['Plumbing', 'Pipe Fitting', 'Sanitary Installation'] },
        { pattern: /electri(?:cian|cal\s*worker)/i, skills: ['Electrical Work', 'Electrical Wiring'] },
        { pattern: /carpenter|carpentry|cabinet/i, skills: ['Carpentry', 'Blueprint Reading', 'Ceiling Installation'] },
        { pattern: /weld/i, skills: ['Welding', 'Arc Welding', 'Steel Fabrication'] },
        { pattern: /mason|masonry|concrete/i, skills: ['Masonry', 'Concrete Pouring', 'Rebar Installation'] },
        { pattern: /paint/i, skills: ['Painting', 'Auto Painting'] },
        { pattern: /hvac|aircon|refriger|ac\s*tech/i, skills: ['HVAC', 'AC Installation', 'Refrigeration'] },
        { pattern: /auto\s*(?:mech|repair|tech)|mechanic/i, skills: ['Auto Repair', 'Engine Overhaul', 'Transmission Repair'] },
        { pattern: /motorcycle|motorc/i, skills: ['Motorcycle Repair', 'Auto Repair'] },
        { pattern: /tile|floor(?:ing)?/i, skills: ['Tile Setting', 'Floor Installation'] },
        { pattern: /roof/i, skills: ['Roofing', 'Waterproofing'] },
        { pattern: /scaffold/i, skills: ['Scaffolding', 'Safety Officer'] },
        { pattern: /heavy\s*equip|crane|forklift/i, skills: ['Heavy Equipment Operation', 'Crane Operation', 'Forklift Operation'] },
        { pattern: /construc(?:tion)?\s*(?:worker|laborer|helper)/i, skills: ['Masonry', 'Rebar Installation', 'Concrete Pouring', 'Formwork'] },
        { pattern: /supervisor|foreman/i, skills: ['Site Supervision', 'Blueprint Reading', 'Construction Estimation'] },
        { pattern: /sheet\s*metal|fabricat/i, skills: ['Steel Fabrication', 'Sheet Metal Work', 'Arc Welding'] },
        { pattern: /pipe\s*fit|pipework/i, skills: ['Pipe Fitting', 'Plumbing', 'Welding'] },
        { pattern: /fire\s*supp(?:ression)?/i, skills: ['Fire Suppression Systems', 'Plumbing'] },
    ],
    hospitality: [
        { pattern: /cook|chef|kitchen/i, skills: ['Cooking', 'Food Preparation', 'Kitchen Management', 'Food Safety'] },
        { pattern: /baker|pastry/i, skills: ['Baking', 'Pastry Making', 'Cake Decorating'] },
        { pattern: /barista|coffee/i, skills: ['Barista', 'Coffee Brewing', 'Customer Service Excellence'] },
        { pattern: /bartend/i, skills: ['Bartending', 'Beverage Management', 'Upselling (F&B)'] },
        { pattern: /housekeeper|housekeeping/i, skills: ['Housekeeping', 'Laundry Operations', 'Safety & Sanitation'] },
        { pattern: /front\s*desk|receptionist|check.?in/i, skills: ['Front Desk', 'Guest Relations', 'Reservation Management', 'Check-in/Check-out Processing'] },
        { pattern: /event\s*(?:planner|coordinator|manager)/i, skills: ['Event Planning', 'Banquet Coordination', 'Catering'] },
        { pattern: /waiter|server|f&b|food\s*(?:server|attendant)/i, skills: ['Food & Beverage Service', 'Restaurant Service', 'Table Setting'] },
        { pattern: /hotel\s*(?:manager|supervisor|staff)/i, skills: ['Hotel Operations', 'Property Management System (PMS)', 'Guest Relations'] },
        { pattern: /catering/i, skills: ['Catering', 'Banquet Service', 'Food Safety'] },
        { pattern: /tour\s*(?:guide|operator)/i, skills: ['Tour Guiding', 'Travel Coordination', 'Guest Relations'] },
        { pattern: /spa|massage/i, skills: ['Spa Services', 'Massage Therapy'] },
        { pattern: /restaurant\s*(?:manager|supervisor)/i, skills: ['Restaurant Management', 'Food Cost Control', 'Staff Scheduling'] },
        { pattern: /room\s*service/i, skills: ['Room Service', 'Housekeeping', 'Guest Relations'] },
        { pattern: /sommelier|wine/i, skills: ['Wine Service', 'Sommelier', 'Beverage Management'] },
        { pattern: /buffet|banquet/i, skills: ['Buffet Setup', 'Banquet Service', 'Banquet Coordination'] },
    ],
}

// Skills that appear frequently in job descriptions across all categories
const DESCRIPTION_SKILL_PATTERNS = [
    { pattern: /\bms\s*office\b|\bmicrosoft\s*office\b|\bword[,\s]|\bexcel[,\s]|\bpowerpoint\b/i, skill: 'MS Office' },
    { pattern: /\bcustomer\s*service\b/i, skill: 'Customer Service' },
    { pattern: /\bteam(?:\s*work|\s*player|\s*work)\b/i, skill: 'Teamwork' },
    { pattern: /\bdata\s*entry\b/i, skill: 'Data Entry' },
    { pattern: /\bcomputer\s*(?:literate|skills|proficient)\b/i, skill: 'MS Office' },
    { pattern: /\bdriving\s*(?:license|licence)|driver'?s?\s*license\b/i, skill: 'Driving' },
    { pattern: /\bproficiency\s+in\s+english\b|\benglish\s+proficiency\b|\bfluent\s+in\s+english\b/i, skill: 'English Communication' },
    { pattern: /\breport(?:ing|s)\s*(?:skills?|writing)\b/i, skill: 'Report Writing' },
    { pattern: /\bproject\s*management\b/i, skill: 'Project Management' },
    { pattern: /\btime\s*management\b/i, skill: 'Time Management' },
    { pattern: /\bproblem.?solving\b/i, skill: 'Problem Solving' },
    { pattern: /\bsocial\s*media\b/i, skill: 'Social Media' },
    { pattern: /\bphotograph[y|ing]\b|\bphoto\s*edit/i, skill: 'Photography' },
    { pattern: /\bvideo\s*edit/i, skill: 'Video Editing' },
    { pattern: /\bquickbooks\b/i, skill: 'QuickBooks' },
    { pattern: /\baccounting\b|\bbookkeeping\b/i, skill: 'Accounting' },
    { pattern: /\bcash\s*handling\b/i, skill: 'Cash Handling' },
    { pattern: /\bpayroll\b/i, skill: 'Payroll Processing' },
    { pattern: /\bheavy\s*equip/i, skill: 'Heavy Equipment Operation' },
    { pattern: /\bforklift\b/i, skill: 'Forklift Operation' },
    { pattern: /\bcrane\b/i, skill: 'Crane Operation' },
    { pattern: /\bfood\s*(?:safety|handling|hygiene)\b/i, skill: 'Food Safety' },
    { pattern: /\bhaccp\b/i, skill: 'HACCP Compliance' },
    { pattern: /\btesda\s*nc\b/i, skill: 'TESDA NC II' },
    { pattern: /\bwelding\b/i, skill: 'Welding' },
    { pattern: /\bplumbing\b/i, skill: 'Plumbing' },
    { pattern: /\bcarpentry\b/i, skill: 'Carpentry' },
    { pattern: /\bmasonry\b/i, skill: 'Masonry' },
    { pattern: /\belectrical\s*(?:wiring|installation|work)\b/i, skill: 'Electrical Work' },
    { pattern: /\bsolar\s*panel\b/i, skill: 'Solar Panel Installation' },
    { pattern: /\bnetwork(?:ing)?\s*(?:setup|configuration|admin)\b/i, skill: 'Network Setup' },
    { pattern: /\bweb\s*dev\b|\bwebsite\s*dev\b/i, skill: 'Web Development' },
    { pattern: /\bpython\b/i, skill: 'Python' },
    { pattern: /\bsql\b|\bdatabase\b/i, skill: 'SQL' },
    { pattern: /\bjava(?:script)?\b/i, skill: 'JavaScript' },
    { pattern: /\bphp\b/i, skill: 'PHP' },
    { pattern: /\bgit\b/i, skill: 'Git Version Control' },
    { pattern: /\baws\b|\bamazon\s*web\s*services\b/i, skill: 'AWS' },
    { pattern: /\bazure\b/i, skill: 'Azure' },
    { pattern: /\bcooking\b|\bculinary\b/i, skill: 'Cooking' },
    { pattern: /\bbaking\b/i, skill: 'Baking' },
    { pattern: /\bbarista\b/i, skill: 'Barista' },
    { pattern: /\bhousekeeping\b/i, skill: 'Housekeeping' },
    { pattern: /\birrigation\b/i, skill: 'Irrigation' },
    { pattern: /\bcrop\s*management\b/i, skill: 'Crop Management' },
    { pattern: /\blivestock\b/i, skill: 'Livestock Care' },
    { pattern: /\benergy\s*audit\b/i, skill: 'Energy Auditing' },
]

/**
 * Suggests skills based on job title and category using regex keyword matching.
 * @param {string} title - The job title
 * @param {string} category - The job category key (e.g. 'it', 'trades')
 * @returns {string[]} Deduplicated array of suggested skill strings
 */
export function getSuggestedSkillsFromTitle(title = '', category = '') {
    if (!title.trim()) return []

    const suggested = new Set()
    const patterns = TITLE_SKILL_MAP[category] || []

    for (const { pattern, skills } of patterns) {
        if (pattern.test(title)) {
            skills.forEach(s => suggested.add(s))
        }
    }

    // Also run all-category patterns if no category match
    if (suggested.size === 0) {
        for (const categoryPatterns of Object.values(TITLE_SKILL_MAP)) {
            for (const { pattern, skills } of categoryPatterns) {
                if (pattern.test(title)) {
                    skills.forEach(s => suggested.add(s))
                }
            }
        }
    }

    return [...suggested]
}

/**
 * Extracts skills mentioned (explicitly or implicitly) in a job description.
 * @param {string} description - Combined job summary + key responsibilities text
 * @returns {string[]} Deduplicated array of matched skill strings
 */
export function getSuggestedSkillsFromDescription(description = '') {
    if (!description.trim()) return []

    const suggested = new Set()

    for (const { pattern, skill } of DESCRIPTION_SKILL_PATTERNS) {
        if (pattern.test(description)) {
            suggested.add(skill)
        }
    }

    return [...suggested]
}

/**
 * Scans text directly against the category skill vocabulary by name.
 * Catches freeform phrasing like "perform plumbing repairs" → "Plumbing".
 * @param {string} text - Key responsibilities or any free-form job text
 * @param {string} category - The job category key to prioritise
 * @returns {string[]} Deduplicated array of matched skill strings
 */
// Escapes special regex chars in a string so it can be used in a RegExp
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Returns true if every word in the skill name matches as a whole word in text
function skillMatchesText(skill, text) {
    const words = skill.toLowerCase().split(/[\s/()]+/).filter(w => w.length > 2)
    if (words.length === 0) return false
    return words.every(w => new RegExp(`\\b${escapeRegex(w)}\\b`, 'i').test(text))
}

export function getSuggestedSkillsFromVocab(text = '', category = '') {
    if (!text.trim()) return []

    const suggested = new Set()

    // Category vocab first (higher relevance)
    const categorySkills = SKILL_VOCAB[category] || []
    for (const skill of categorySkills) {
        if (skillMatchesText(skill, text)) suggested.add(skill)
    }

    // Cross-category: only add if the full skill name matches at word boundaries
    for (const skills of Object.values(SKILL_VOCAB)) {
        for (const skill of skills) {
            if (suggested.has(skill)) continue
            const fullPattern = new RegExp(`\\b${escapeRegex(skill)}\\b`, 'i')
            if (fullPattern.test(text)) suggested.add(skill)
        }
    }

    return [...suggested]
}
