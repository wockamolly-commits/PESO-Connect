import { callAI, parseAIJSON } from './geminiService'
import { supabase } from '../config/supabase'

// Trade keyword dictionary for AI text diagnostic
// Maps problem keywords to trade categories

export const tradeKeywords = {
    plumbing: {
        name: 'Plumbing',
        keywords: [
            'leak', 'leaking', 'leaky',
            'toilet', 'toilets',
            'pipe', 'pipes', 'piping',
            'faucet', 'faucets', 'tap', 'taps',
            'drain', 'drains', 'drainage', 'clogged drain',
            'water', 'water pressure',
            'sink', 'sinks',
            'shower', 'showers',
            'bathtub', 'tub',
            'septic', 'sewage', 'sewer',
            'plumber', 'plumbing',
            'valve', 'valves',
            'water heater', 'boiler',
            'flood', 'flooding', 'flooded',
            'clog', 'clogged', 'blockage', 'blocked'
        ],
        icon: '🔧',
        color: 'blue'
    },
    electrical: {
        name: 'Electrical',
        keywords: [
            'wire', 'wires', 'wiring',
            'socket', 'sockets', 'outlet', 'outlets',
            'power', 'power outage', 'no power',
            'light', 'lights', 'lighting', 'bulb', 'bulbs',
            'switch', 'switches', 'light switch',
            'circuit', 'circuits', 'circuit breaker', 'breaker',
            'voltage', 'volt', 'volts',
            'electric', 'electrical', 'electricity',
            'spark', 'sparks', 'sparking',
            'short circuit', 'short',
            'fan', 'ceiling fan',
            'plug', 'plugs',
            'fuse', 'fuses',
            'panel', 'electrical panel',
            'ground', 'grounding',
            'blackout', 'brownout'
        ],
        icon: '⚡',
        color: 'yellow'
    },
    masonry: {
        name: 'Masonry',
        keywords: [
            'brick', 'bricks',
            'cement', 'concrete',
            'wall', 'walls',
            'tile', 'tiles', 'tiling',
            'plaster', 'plastering',
            'foundation', 'foundations',
            'crack', 'cracks', 'cracked',
            'stone', 'stones',
            'mortar',
            'floor', 'flooring',
            'patio', 'driveway',
            'chimney',
            'retaining wall',
            'block', 'blocks', 'hollow block',
            'stairs', 'steps',
            'column', 'columns', 'pillar',
            'renovation', 'repair wall'
        ],
        icon: '🧱',
        color: 'orange'
    },
    welding: {
        name: 'Welding',
        keywords: [
            'metal', 'metals',
            'steel', 'stainless steel',
            'iron', 'wrought iron',
            'weld', 'welding', 'welder',
            'fabricate', 'fabrication',
            'frame', 'frames', 'framing',
            'gate', 'gates',
            'fence', 'fences', 'fencing',
            'grill', 'grills', 'grille',
            'railing', 'railings', 'handrail',
            'door', 'metal door',
            'window frame',
            'balcony',
            'rust', 'rusty', 'rusted',
            'broken gate', 'repair gate',
            'fabricator'
        ],
        icon: '🔩',
        color: 'gray'
    },
    carpentry: {
        name: 'Carpentry',
        keywords: [
            'wood', 'wooden',
            'cabinet', 'cabinets',
            'door', 'doors',
            'window', 'windows',
            'furniture',
            'carpenter', 'carpentry',
            'table', 'tables',
            'chair', 'chairs',
            'shelf', 'shelves', 'shelving',
            'roof', 'roofing',
            'ceiling',
            'deck',
            'frame', 'framing',
            'trim', 'molding',
            'plywood',
            'termite', 'termites'
        ],
        icon: '🪚',
        color: 'brown'
    }
}

/**
 * Perform deep AI analysis on a household problem
 */
export const analyzeWithAI = async (problemText) => {
    if (!problemText || problemText.trim().length === 0) {
        return { trades: [], confidence: 0, source: 'none', degraded: false }
    }

    const tradeContext = Object.entries(tradeKeywords).map(([id, data]) => ({
        id,
        name: data.name
    }))

    const validTradeIds = Object.keys(tradeKeywords)

    const prompt = `You are an AI diagnostic assistant for PESO-Connect, a job matching platform in San Carlos City, Philippines.
Analyse this household problem and determine the most appropriate trade service needed.

PROBLEM DESCRIPTION:
"${problemText.replace(/"/g, '\\"')}"

AVAILABLE SERVICES:
${JSON.stringify(tradeContext, null, 2)}

Identify the primary trade and any secondary trades. Also provide safety advice and a summary of the diagnostic.

Return valid JSON in this exact format:
{
    "primaryTradeId": "plumbing|electrical|masonry|welding|carpentry",
    "secondaryTradeIds": [],
    "confidence": 0, // 0-100
    "severity": "Low|Medium|High|Emergency",
    "diagnosticSummary": "One sentence summary of what the AI thinks is wrong",
    "safetyAdvice": ["Advice 1", "Advice 2"],
    "matchedKeywords": ["keyword1", "keyword2"],
    "requiresFollowUp": boolean,
    "followUpQuestion": "A question to clarify the problem if confidence is low"
}`

    try {
        const response = await callAI(prompt)
        const result = parseAIJSON(response)

        // Validate primaryTradeId is one we support
        if (result.primaryTradeId && !validTradeIds.includes(result.primaryTradeId)) {
            console.warn(`AI returned unknown trade "${result.primaryTradeId}", falling back to keywords`)
            const fallback = analyzeText(problemText)
            return { ...fallback, source: 'keyword_fallback', degraded: true }
        }

        // Enhance result with trade data (icons, colors, etc.)
        const trades = []

        if (result.primaryTradeId && tradeKeywords[result.primaryTradeId]) {
            const trade = tradeKeywords[result.primaryTradeId]
            trades.push({
                ...trade,
                id: result.primaryTradeId,
                confidence: Math.min(100, Math.max(0, parseInt(result.confidence) || 0)),
                matchedKeywords: result.matchedKeywords || [],
                isPrimary: true
            })
        }

        if (result.secondaryTradeIds && Array.isArray(result.secondaryTradeIds)) {
            result.secondaryTradeIds.forEach(id => {
                if (id !== result.primaryTradeId && validTradeIds.includes(id)) {
                    trades.push({
                        ...tradeKeywords[id],
                        id,
                        confidence: Math.max(0, (parseInt(result.confidence) || 0) - 20),
                        matchedKeywords: [],
                        isPrimary: false
                    })
                }
            })
        }

        return {
            trades,
            primaryTrade: trades[0] || null,
            severity: result.severity || 'Medium',
            diagnosticSummary: result.diagnosticSummary || '',
            safetyAdvice: Array.isArray(result.safetyAdvice) ? result.safetyAdvice : [],
            requiresFollowUp: result.requiresFollowUp || false,
            followUpQuestion: result.followUpQuestion || '',
            confidence: Math.min(100, Math.max(0, parseInt(result.confidence) || 0)),
            source: 'ai',
            degraded: false
        }
    } catch (error) {
        // Re-throw programming errors (not service/network failures)
        if (error instanceof TypeError && !error.message.includes('fetch')) throw error

        const status = error?.status
        console.error(
            `AI Analysis failed (${status ?? 'network/unknown'}), falling back to keyword matching:`,
            error.message
        )
        const fallback = analyzeText(problemText)
        return { ...fallback, source: 'keyword_fallback', degraded: true }
    }
}

// Analyze text and detect trades (Legacy keyword-based fallback)
export const analyzeText = (text) => {
    if (!text || text.trim().length === 0) {
        return { trades: [], confidence: 0 }
    }

    const normalizedText = text.toLowerCase()
    const results = {}

    // Check each trade category
    Object.entries(tradeKeywords).forEach(([tradeId, tradeData]) => {
        let matchCount = 0
        const matchedKeywords = []

        tradeData.keywords.forEach(keyword => {
            // Check for whole word matches
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
            const matches = normalizedText.match(regex)
            if (matches) {
                matchCount += matches.length
                if (!matchedKeywords.includes(keyword)) {
                    matchedKeywords.push(keyword)
                }
            }
        })

        if (matchCount > 0) {
            results[tradeId] = {
                id: tradeId,
                name: tradeData.name,
                icon: tradeData.icon,
                color: tradeData.color,
                matchCount,
                matchedKeywords,
                confidence: Math.min(matchCount * 20, 100) // 20% per keyword match, max 100%
            }
        }
    })

    // Sort by confidence
    const sortedTrades = Object.values(results)
        .sort((a, b) => b.confidence - a.confidence)

    return {
        trades: sortedTrades,
        primaryTrade: sortedTrades[0] || null,
        confidence: sortedTrades[0]?.confidence || 0,
        severity: 'Medium',
        diagnosticSummary: sortedTrades[0] ? `Issue identified as potentially ${sortedTrades[0].name} related.` : 'Could not identify issue.',
        safetyAdvice: [],
        requiresFollowUp: false,
        source: 'keyword',
        degraded: false
    }
}

// Get skill requirements for a trade
export const getTradeSkills = (tradeId) => {
    const skillMap = {
        plumbing: ['Plumbing', 'Pipe Fitting', 'Water Systems', 'Drainage'],
        electrical: ['Electrical Work', 'Electrician', 'Wiring', 'Circuit Installation', 'Electrical Repair'],
        masonry: ['Masonry', 'Tile Setting', 'Concrete Work', 'Plastering'],
        welding: ['Welding', 'Metal Fabrication', 'Steel Work', 'Gate Installation'],
        carpentry: ['Carpentry', 'Carpentry Work', 'Woodworking', 'Cabinet Making', 'Furniture Repair']
    }
    return skillMap[tradeId] || []
}

const normalizeSkill = (skill) => {
    if (typeof skill === 'string') return skill.trim()
    if (skill && typeof skill === 'object') return String(skill.name || skill.label || '').trim()
    return ''
}

const getProfileSkills = (profile) => {
    const combined = [
        ...(Array.isArray(profile?.predefined_skills) ? profile.predefined_skills : []),
        ...(Array.isArray(profile?.skills) ? profile.skills : []),
    ]
        .map(normalizeSkill)
        .filter(Boolean)

    return [...new Set(combined)]
}

const isVerifiedProfile = (profile) =>
    profile?.is_verified === true || profile?.jobseeker_status === 'verified'

const isJobseekerUser = (user) =>
    user?.role === 'jobseeker' || (user?.role === 'user' && user?.subtype === 'jobseeker')

const buildDisplayName = (user = {}, profile = {}) => {
    const splitName = [profile.first_name, profile.middle_name, profile.surname]
        .map(value => String(value || '').trim())
        .filter(Boolean)
        .join(' ')

    return splitName || profile.full_name || user.name || user.email || 'Verified Worker'
}

const fetchMatchingWorkersFromTables = async (tradeId, client) => {
    const requiredSkills = getTradeSkills(tradeId)
    if (requiredSkills.length === 0) return []

    const { data: profilesData, error: profilesError } = await client
        .from('jobseeker_profiles')
        .select('id, first_name, middle_name, surname, full_name, skills, predefined_skills, is_verified, jobseeker_status')
        .or('is_verified.eq.true,jobseeker_status.eq.verified')

    if (profilesError) throw profilesError

    const verifiedProfiles = (profilesData || [])
        .filter(isVerifiedProfile)
        .map(profile => ({
            ...profile,
            skills: getProfileSkills(profile),
        }))
        .filter(profile => profile.skills.length > 0)

    const userIds = verifiedProfiles.map(profile => profile.id).filter(Boolean)
    if (userIds.length === 0) return []

    const { data: usersData, error: usersError } = await client
        .from('users')
        .select('id, email, name, role, subtype, is_verified, registration_complete')
        .in('id', userIds)

    if (usersError) throw usersError

    const usersById = new Map((usersData || []).filter(isJobseekerUser).map(user => [user.id, user]))
    const requiredSkillsLower = requiredSkills.map(skill => skill.toLowerCase())

    return verifiedProfiles
        .filter(profile => usersById.has(profile.id))
        .map(profile => {
            const user = usersById.get(profile.id)
            return {
                ...user,
                ...profile,
                name: buildDisplayName(user, profile),
                role: user.role,
                subtype: user.subtype,
            }
        })
        .filter(worker => {
            const userSkillsLower = worker.skills.map(skill => skill.toLowerCase())
            return requiredSkillsLower.some(reqSkill =>
                userSkillsLower.some(userSkill =>
                    userSkill.includes(reqSkill) || reqSkill.includes(userSkill)
                )
            )
        })
}

export const fetchMatchingWorkers = async (tradeId, client = supabase) => {
    const { data, error } = await client.rpc('get_diagnostic_workers', { p_trade_id: tradeId })

    if (!error) {
        if ((data || []).length > 0) return data || []

        const { data: fallbackData, error: fallbackError } = await client.rpc('get_diagnostic_workers', { p_trade_id: 'all' })
        if (fallbackError) throw fallbackError

        return (fallbackData || []).map(worker => ({
            ...worker,
            diagnostic_fallback: true,
        }))
    }

    // Local/dev databases may not have the RPC migration yet. Keep the table
    // fallback for older setups, but production should use the RLS-safe RPC.
    if (error.code !== '42883' && error.code !== 'PGRST202') throw error

    return fetchMatchingWorkersFromTables(tradeId, client)
}

export const fetchDiagnosticWorkerCounts = async (client = supabase) => {
    const { data, error } = await client.rpc('get_diagnostic_worker_counts')

    if (!error) {
        return Object.fromEntries(
            (data || []).map(row => [row.trade_id, Number(row.worker_count) || 0])
        )
    }

    if (error.code !== '42883' && error.code !== 'PGRST202') throw error

    const counts = {}
    await Promise.all(Object.keys(tradeKeywords).map(async (tradeId) => {
        const workers = await fetchMatchingWorkersFromTables(tradeId, client)
        counts[tradeId] = workers.length
    }))
    return counts
}

export default { tradeKeywords, analyzeText, analyzeWithAI, getTradeSkills, fetchMatchingWorkers, fetchDiagnosticWorkerCounts }
