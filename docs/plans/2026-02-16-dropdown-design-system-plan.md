# Dropdown Design System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all 13 native `<select>` elements with a unified glassmorphic dropdown system using a CSS utility class and a reusable React component.

**Architecture:** Two layers — (1) `.input-select` CSS utility for simple native `<select>` elements (swap class, done), (2) `<Select>` React component with custom dropdown panel, keyboard navigation, and full a11y for rich use cases. Pure CSS animations, zero new dependencies.

**Tech Stack:** React 18, Tailwind CSS 3.4, Lucide React (already installed)

---

### Task 1: Add `.input-select` and `.input-select-dark` CSS utilities

**Files:**
- Modify: `src/index.css` (add after `.input-field` on line 39)

**Step 1: Add the CSS classes**

Inside the `@layer components` block, after the `.input-field` rule, add:

```css
  .input-select {
    @apply w-full px-4 py-3 pr-10 rounded-xl border-2 border-gray-200 bg-white/50
      focus:border-primary-400 focus:ring-4 focus:ring-primary-100
      outline-none transition-all duration-300 placeholder-gray-400
      appearance-none cursor-pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 16px;
  }

  .input-select-dark {
    @apply w-full px-3 py-2 pr-10 bg-slate-800 border border-slate-700 rounded-lg
      text-slate-200 text-sm
      focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20
      outline-none transition-all duration-300
      appearance-none cursor-pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    background-size: 16px;
  }
```

Also add the scale-in keyframe animation (used by the Select component in Task 2). Inside `@layer utilities`, after the existing animation classes:

```css
  .animate-scale-in {
    animation: scaleIn 150ms ease-out forwards;
  }
```

And add the keyframe after the existing `@keyframes slideUp`:

```css
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

**Step 2: Verify dev server compiles**

Run: `npm run dev` (check terminal for Tailwind/PostCSS errors, then kill)

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add .input-select and .input-select-dark CSS utilities"
```

---

### Task 2: Create `<Select>` component

**Files:**
- Create: `src/components/common/Select.jsx`

**Step 1: Create the component**

```jsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Check } from 'lucide-react'

const Select = ({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  icon: Icon = null,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef(null)
  const listRef = useRef(null)
  const triggerRef = useRef(null)
  const typeAheadRef = useRef('')
  const typeAheadTimerRef = useRef(null)

  const selectedOption = options.find(opt => opt.value === value)
  const selectedIndex = options.findIndex(opt => opt.value === value)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex]
      if (item) item.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightedIndex, isOpen])

  const open = useCallback(() => {
    if (disabled) return
    setIsOpen(true)
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }, [disabled, selectedIndex])

  const close = useCallback(() => {
    setIsOpen(false)
    setHighlightedIndex(-1)
    triggerRef.current?.focus()
  }, [])

  const selectOption = useCallback((val) => {
    onChange(val)
    close()
  }, [onChange, close])

  const handleKeyDown = useCallback((e) => {
    if (disabled) return

    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        open()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(i => (i + 1) % options.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(i => (i - 1 + options.length) % options.length)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (highlightedIndex >= 0) selectOption(options[highlightedIndex].value)
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
      default:
        // Type-ahead
        if (e.key.length === 1) {
          clearTimeout(typeAheadTimerRef.current)
          typeAheadRef.current += e.key.toLowerCase()
          const match = options.findIndex(opt =>
            opt.label.toLowerCase().startsWith(typeAheadRef.current)
          )
          if (match >= 0) setHighlightedIndex(match)
          typeAheadTimerRef.current = setTimeout(() => {
            typeAheadRef.current = ''
          }, 500)
        }
    }
  }, [isOpen, disabled, highlightedIndex, options, open, close, selectOption])

  const listboxId = useRef(`select-listbox-${Math.random().toString(36).slice(2, 8)}`).current

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => isOpen ? close() : open()}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-activedescendant={isOpen && highlightedIndex >= 0 ? `${listboxId}-opt-${highlightedIndex}` : undefined}
        className={`
          w-full flex items-center justify-between gap-3 px-4 py-3
          bg-white/50 backdrop-blur-sm border-2 rounded-xl font-medium cursor-pointer
          transition-all duration-300 text-left
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isOpen
            ? 'border-primary-400 ring-4 ring-primary-100 shadow-lg'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
          }
        `}
      >
        <div className="flex items-center gap-3 min-w-0">
          {Icon && <Icon className="w-5 h-5 text-gray-400 shrink-0" />}
          {selectedOption?.icon && !Icon && (
            <selectedOption.icon className="w-5 h-5 text-primary-500 shrink-0" />
          )}
          <span className={`truncate ${selectedOption ? 'text-gray-700' : 'text-gray-400'}`}>
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={placeholder}
          className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-md border border-white/50 rounded-xl shadow-xl overflow-auto max-h-60 animate-scale-in"
        >
          {options.map((option, index) => {
            const isSelected = value === option.value
            const isHighlighted = index === highlightedIndex
            return (
              <li
                key={option.value}
                id={`${listboxId}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => selectOption(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`
                  flex items-center justify-between gap-3 px-4 py-3
                  cursor-pointer transition-colors duration-150 text-left
                  ${isSelected ? 'bg-primary-50 text-primary-700' : ''}
                  ${isHighlighted && !isSelected ? 'bg-gray-50' : ''}
                  ${index !== options.length - 1 ? 'border-b border-gray-100' : ''}
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {option.icon && (
                    <option.icon className={`w-5 h-5 shrink-0 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`} />
                  )}
                  <div className="min-w-0">
                    <span className="font-medium">{option.label}</span>
                    {option.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                    )}
                  </div>
                </div>
                {isSelected && <Check className="w-5 h-5 text-primary-600 shrink-0" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Select
```

**Step 2: Verify it renders**

Temporarily import `Select` in any page to confirm it renders without errors. Remove after verifying.

**Step 3: Commit**

```bash
git add src/components/common/Select.jsx
git commit -m "feat: add reusable Select component with keyboard nav and a11y"
```

---

### Task 3: Migrate `JobseekerProfileEdit.jsx` (5 selects)

**Files:**
- Modify: `src/pages/JobseekerProfileEdit.jsx`

**Step 1: Replace class on all 5 selects**

Change `className="input-field"` to `className="input-select"` on these selects:
- Line ~502: Gender select
- Line ~516: Civil Status select
- Line ~569: Language Proficiency select — change `className="input-field w-40"` to `className="input-select w-40"`
- Line ~668: Willing to Relocate select
- Line ~690: Highest Education select

**Step 2: Verify in browser**

Open the jobseeker profile edit page. Check each select has:
- Custom chevron (no native browser arrow)
- Semi-transparent background
- Blue focus ring on focus
- Clean padding, no visual jumps

**Step 3: Commit**

```bash
git add src/pages/JobseekerProfileEdit.jsx
git commit -m "feat: migrate JobseekerProfileEdit selects to input-select"
```

---

### Task 4: Migrate `EmployerProfileEdit.jsx` (2 selects)

**Files:**
- Modify: `src/pages/EmployerProfileEdit.jsx`

**Step 1: Replace class on both selects**

- Line ~147: Employer Type — change `className="input-field"` to `className="input-select"`
- Line ~178: Company Size — change `className="input-field"` to `className="input-select"`

**Step 2: Commit**

```bash
git add src/pages/EmployerProfileEdit.jsx
git commit -m "feat: migrate EmployerProfileEdit selects to input-select"
```

---

### Task 5: Migrate `Step4Education.jsx` (1 select)

**Files:**
- Modify: `src/components/registration/Step4Education.jsx`

**Step 1: Replace class**

- Line ~27: change `className="input-field pl-12"` to `className="input-select pl-12"`

Note: Keep `pl-12` — it compensates for the absolutely-positioned GraduationCap icon. The custom chevron from `.input-select` will appear at the right side, which is fine.

**Step 2: Commit**

```bash
git add src/components/registration/Step4Education.jsx
git commit -m "feat: migrate Step4Education select to input-select"
```

---

### Task 6: Migrate `PostJob.jsx` (1 select)

**Files:**
- Modify: `src/pages/employer/PostJob.jsx`

**Step 1: Replace class**

- Line ~640: change `className="input-field pl-12 appearance-none cursor-pointer"` to `className="input-select pl-12"`

The `appearance-none` and `cursor-pointer` are already in `.input-select`, so remove the redundant classes.

**Step 2: Commit**

```bash
git add src/pages/employer/PostJob.jsx
git commit -m "feat: migrate PostJob select to input-select"
```

---

### Task 7: Migrate `JobListings.jsx` (2 selects)

**Files:**
- Modify: `src/pages/JobListings.jsx`

**Step 1: Replace classes and remove manual chevron overlays**

- Line ~134: Category filter — change `className="input appearance-none cursor-pointer w-full"` to `className="input-select"`
- Line ~149: Type filter — change `className="input appearance-none cursor-pointer w-full"` to `className="input-select"`

For both selects: if there is a `ChevronDown` icon element rendered as a sibling overlay (absolutely positioned with `pointer-events-none`), **remove it** — the CSS utility provides its own chevron via `background-image`.

**Step 2: Verify filters still work**

Open the job listings page, change both filter dropdowns, verify the list re-filters correctly.

**Step 3: Commit**

```bash
git add src/pages/JobListings.jsx
git commit -m "feat: migrate JobListings filter selects to input-select"
```

---

### Task 8: Migrate `MyListings.jsx` status pill (1 select)

**Files:**
- Modify: `src/pages/employer/MyListings.jsx`

**Step 1: Adapt the pill-shaped status select**

This select has custom pill styling (`rounded-full`, dynamic color classes). Do NOT replace it with `.input-select` — it would look wrong as a full-width form input.

Instead, keep the existing custom styling but ensure it has `appearance-none` and the inline SVG chevron. The current code already has `appearance-none` and a manual SVG overlay. **No changes needed** if it already looks consistent — verify visually and skip if it does.

If the manual SVG chevron overlay exists as a separate element, consider consolidating to the CSS `background-image` approach to reduce DOM nodes, but keep the pill shape and dynamic colors.

**Step 2: Commit (if changes were made)**

```bash
git add src/pages/employer/MyListings.jsx
git commit -m "feat: clean up MyListings status select styling"
```

---

### Task 9: Migrate `admin/SearchAndFilters.jsx` (1 select)

**Files:**
- Modify: `src/components/admin/SearchAndFilters.jsx`

**Step 1: Replace inline dark classes with `.input-select-dark`**

- Line ~56: change `className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none"` to `className="input-select-dark"`

**Step 2: Commit**

```bash
git add src/components/admin/SearchAndFilters.jsx
git commit -m "feat: migrate admin SearchAndFilters select to input-select-dark"
```

---

### Task 10: Delete `CustomDropdown.jsx`

**Files:**
- Delete: `src/components/CustomDropdown.jsx`

**Step 1: Verify no imports exist**

Search for any import of `CustomDropdown` across the codebase. The audit found zero usages — confirm before deleting.

**Step 2: Delete the file**

```bash
rm src/components/CustomDropdown.jsx
```

**Step 3: Commit**

```bash
git add -u src/components/CustomDropdown.jsx
git commit -m "chore: delete unused CustomDropdown component (replaced by Select)"
```

---

### Task 11: Final verification

**Step 1: Run the dev server**

```bash
npm run dev
```

**Step 2: Visual audit checklist**

Visit each page and verify dropdowns:
- [ ] JobseekerProfileEdit — 5 selects styled, focus rings work
- [ ] EmployerProfileEdit — 2 selects styled
- [ ] Step4Education (registration flow) — 1 select styled, icon spacing correct
- [ ] PostJob — 1 select styled, icon spacing correct
- [ ] JobListings — 2 filter selects styled, no duplicate chevrons
- [ ] MyListings — status pill looks correct
- [ ] Admin SearchAndFilters — dark variant renders correctly
- [ ] Mobile: tap targets are at least 44px tall (py-3 = 48px, py-2 = 40px for admin)

**Step 3: Run existing tests**

```bash
npm test
```

Ensure no regressions.

**Step 4: Final commit (if any cleanup needed)**

```bash
git commit -m "fix: dropdown design system final polish"
```
