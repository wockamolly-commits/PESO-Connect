# Task: Implement UI/UX Improvements for the Find Workers (Diagnostic) Page

## Overview
Improve the `src/pages/Diagnostic.jsx` page with better UX, richer UI, and modern interactions. This is the "AI Worker Finder" page at `/diagnostic`. The project uses React + Vite + Tailwind CSS with a blue/gold government color scheme (see `tailwind.config.js` for `primary` and `accent` color tokens). The existing component library includes utility classes in `src/index.css` (`.card`, `.btn-primary`, `.input-field`, etc.) and loading skeletons in `src/components/LoadingSkeletons.jsx`.

## IMPORTANT RULES
- Do NOT remove existing functionality — only enhance.
- Keep the same Tailwind class naming conventions already used in the project.
- Use Lucide React icons (already installed) — do not add new icon libraries.
- Do NOT add new npm dependencies. Only use what's already in package.json.
- Preserve all existing comments and JSX structure where possible.
- All new animations should use the existing keyframes in `src/index.css` or add new ones following the same pattern.

---

## Changes to Implement (in order)

### 1. Add "How It Works" 3-Step Flow Below Header
After the subtitle paragraph (`<p className="text-gray-600 max-w-lg mx-auto">`), add a horizontal 3-step visual:

```
Step 1: 📝 Describe — "Tell us about your problem"
Step 2: 🤖 AI Match — "Our AI identifies the right trade"  
Step 3: 💬 Connect — "Message verified workers directly"
```

Use a flex row with subtle connecting lines/arrows between steps. Each step should be a small card with an icon on top, step number, title, and subtitle. Use `animate-fade-in` with staggered delays. On mobile, stack vertically or make scrollable.

### 2. Make Available Services Grid Interactive
In the "Available Services" section (currently just displaying `tradeKeywords` entries), make each service card **clickable**:

- `onClick`: set `setProblemText` to a template like `"I have a ${trade.name.toLowerCase()} issue: "` and focus the textarea
- Add a **worker count badge** (hardcoded for now — use these values):
  - Plumbing: "8 workers"
  - Electrical: "12 workers"  
  - Masonry: "6 workers"
  - Welding: "5 workers"
  - Carpentry: "9 workers"
- Add a **hover tooltip/description** showing sample keywords: e.g., "Pipes, leaks, drains, toilets, water heaters"
- Apply the trade's color as a subtle background tint on hover using the `color` property from `tradeKeywords`
- Add `cursor-pointer` and a slight scale on hover (`hover:scale-105`)

### 3. Enhanced Input Area
Improve the textarea input section:

a) **Character counter**: Show character count below the textarea, right-aligned. Style: `text-xs text-gray-400`. Show a hint when under 20 chars: "Add more detail for better results"

b) **Animated cycling placeholder**: Instead of a static placeholder, cycle through these examples every 3 seconds using a `useEffect` + `useState`:
   - "My toilet is leaking and there is water everywhere..."
   - "The light switch in my kitchen sparks when I flip it..."
   - "I need to fix cracks in my concrete wall..."
   - "The metal gate is rusty and won't close properly..."
   - "My wooden cabinet door is broken and needs repair..."
   
   Only show the animated placeholder when the textarea is empty. Use a fade transition.

c) **Real-time keyword hint**: As the user types, check against `tradeKeywords` and show a small inline hint below the textarea: "Looks like you need: 🔧 Plumbing" (showing the first matching trade icon + name). Use a subtle slide-in animation.

### 4. Loading State — Multi-Step Progress
Replace the simple spinner during `status === 'analyzing'` with a **3-step progress indicator**:

```
Step 1: "Understanding your problem..." (0-2s)
Step 2: "Matching to the right trade..." (2-4s)  
Step 3: "Finding verified workers..." (4s+)
```

Show as a horizontal stepper with checkmarks for completed steps and a spinner on the current step. Use `setTimeout` to advance steps. Style the active step with `text-primary-600 font-semibold` and completed with `text-green-600`.

### 5. Worker Cards — Enriched with Trust Signals
Enhance each worker card in the results. The current card shows: avatar initial, name, verified badge, 2 skills, message button.

Add these enhancements:

a) **"View Profile" link**: Add a text button/link next to or below the message button that links to `/profile/${worker.id}`. Use subtle styling: `text-sm text-primary-600 hover:text-primary-700 font-medium`.

b) **Availability dot**: Add a small green dot (🟢) with "Available" text next to the name. Use: `<span className="inline-flex items-center gap-1 text-xs text-green-600"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>Available</span>`

c) **"New on PESO Connect" badge**: Since you don't have rating data yet, show a subtle badge: `<span className="px-2 py-0.5 bg-primary-50 text-primary-600 text-[10px] font-bold rounded-full">New on PESO Connect</span>`

d) **Show all skills**: Show up to 4 skills (not just 2), with a "+N more" for the rest.

e) **Skeleton loading**: When `status === 'loadingWorkers'`, show 4 worker card skeletons instead of just a spinner. Create a `WorkerCardSkeleton` component:
```jsx
const WorkerCardSkeleton = () => (
    <div className="flex flex-col p-4 bg-white border border-gray-100 rounded-2xl animate-pulse">
        <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-20 bg-gray-200 rounded" />
            </div>
        </div>
        <div className="flex gap-1 mb-3">
            <div className="h-5 w-16 bg-gray-200 rounded" />
            <div className="h-5 w-20 bg-gray-200 rounded" />
            <div className="h-5 w-14 bg-gray-200 rounded" />
        </div>
        <div className="h-10 w-full bg-gray-200 rounded-xl" />
    </div>
)
```

### 6. Better Empty State
When `workers.length === 0` after loading, improve the empty state:

- Add a subtle illustration (use a larger icon composition with `Users`, `Search` from Lucide)
- Add actionable buttons:
  - "Browse all job listings" → links to `/jobs`
  - "Try a different description" → clears results and focuses textarea
- Show secondary trades if available: "These related workers might help:" with links to re-run the diagnosis for each secondary trade

### 7. Results — Smooth Scroll + Staggered Animation
After analysis completes:

a) **Auto-scroll** to the results section using `useRef` + `scrollIntoView({ behavior: 'smooth', block: 'start' })`. Add a ref to the results container div.

b) **Stagger animations**: Each result section (diagnostic report, worker cards) should fade in with increasing delays. Use inline `style={{ animationDelay: '0.1s' }}`, `0.2s`, `0.3s` etc., combined with `animate-fade-in`.

### 8. Diagnostic Report Enhancements

a) **Confidence gauge**: Replace the plain `{trade.confidence}%` text with a small circular progress indicator. Build it with CSS:
```jsx
<div className="relative w-12 h-12">
    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="3" />
        <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" 
            strokeDasharray={`${trade.confidence * 0.88} 88`}
            className="text-primary-600 transition-all duration-1000" />
    </svg>
    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{trade.confidence}%</span>
</div>
```

b) **Estimated cost range** (per trade, hardcoded):
```js
const costEstimates = {
    plumbing: '₱500 – ₱3,000',
    electrical: '₱300 – ₱2,500',
    masonry: '₱1,000 – ₱5,000',
    welding: '₱500 – ₱4,000',
    carpentry: '₱800 – ₱3,500',
}
```
Show below the AI summary with a small 💰 icon: "Estimated cost: ₱500 – ₱3,000" in a subtle styled div.

c) **Urgency timeline** based on severity:
```js
const urgencyMap = {
    'Emergency': { text: 'Fix immediately — do not delay', icon: '🚨', color: 'red' },
    'High': { text: 'Should be addressed within 24 hours', icon: '⚠️', color: 'orange' },
    'Medium': { text: 'Can wait 2-3 days safely', icon: '📋', color: 'yellow' },
    'Low': { text: 'Non-urgent — schedule at your convenience', icon: '✅', color: 'green' },
}
```
Show as a small badge/info row below the severity badge.

### 9. Mobile Responsiveness Improvements
- Make the example prompt chips taller with `min-h-[44px]` for touch targets
- The "Diagnose & Find Workers" button should get `sticky bottom-4 z-10` styling on mobile (use a media query or `sm:static sm:bottom-auto`)  
- Add `scroll-mt-20` to the results section so smooth-scroll accounts for the navbar

### 10. CSS Animations (add to `src/index.css`)
Add these new keyframes and utility classes after the existing ones:

```css
@keyframes bounceIn {
    0% { opacity: 0; transform: scale(0.3); }
    50% { opacity: 0.9; transform: scale(1.05); }
    70% { transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
}

@keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

@keyframes typewriter {
    from { width: 0; }
    to { width: 100%; }
}

.animate-bounce-in {
    animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
}

.animate-shimmer {
    background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
}
```

---

## Files to Modify
1. `src/pages/Diagnostic.jsx` — Main changes (items 1-9)
2. `src/index.css` — New animations (item 10)

## Files to Reference (read-only)
- `src/services/diagnosticService.js` — Trade keywords, skills, AI analysis
- `src/components/LoadingSkeletons.jsx` — Existing skeleton patterns
- `tailwind.config.js` — Color tokens (primary, accent, danger, lgu)
- `src/index.css` — Existing utility classes and animations

## Testing
After implementing, verify:
1. Page loads correctly at `/diagnostic`
2. Example prompts populate the textarea when clicked
3. Service cards populate textarea and focus it when clicked
4. Character counter updates in real-time
5. Keyword hint shows correct trade match while typing
6. Analysis triggers the 3-step progress flow
7. Results scroll into view smoothly after analysis
8. Worker cards show all new trust signals
9. Empty state shows actionable alternatives
10. Mobile view has proper touch targets and layout
